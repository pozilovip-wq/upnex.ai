/** Admin dashboard: team stats, per-member performance, access requests. */
import type { Context, Telegraf } from "telegraf";
import * as db from "./db.js";
import { me, sessions } from "./flows.js";
import { buildMemberDetail, buildTeamPlan, buildTeamReport } from "./reports.js";
import { esc } from "./text.js";
import { dayStart, fmtShortDate, monthStart, weekStart } from "./time.js";
import { cb, inline, mainMenu } from "./ui.js";

const HTML = { parse_mode: "HTML" as const };

const panelRows = () => [
  [cb("📊 Bugun", "a:today"), cb("📈 Hafta", "a:week"), cb("🗓 Oy", "a:month")],
  [cb("👥 Xodimlar", "a:members"), cb("⏳ So'rovlar", "a:req")],
  [cb("📋 Jamoa rejasi", "a:plan")],
];
const backRow = () => [cb("⬅️ Admin panel", "a:panel")];

async function edit(ctx: Context, text: string, rows: ReturnType<typeof panelRows>) {
  try {
    await ctx.editMessageText(text, { ...HTML, ...inline(rows) });
  } catch (err) {
    if (!String(err).includes("message is not modified")) await ctx.reply(text, { ...HTML, ...inline(rows) });
  }
}

export async function showAdminPanel(ctx: Context) {
  const [active, pending] = await Promise.all([db.listMembers("active"), db.listMembers("pending")]);
  const text = `👑 <b>Admin panel</b>\n\nFaol xodimlar: ${active.length}${pending.length ? `\n⏳ Kutilayotgan so'rovlar: ${pending.length}` : ""}`;
  await ctx.reply(text, { ...HTML, ...inline(panelRows()) });
}

export async function notifyAccessRequest(bot: Telegraf, m: db.Member) {
  const text = `🙋 <b>Yangi xodim so'rovi</b>\n\n${esc(m.name)}${m.username ? ` (@${esc(m.username)})` : ""}\nID: <code>${m.telegram_id}</code>`;
  const kb = inline([[cb("✅ Qabul qilish", `ap:${m.telegram_id}`), cb("❌ Rad etish", `aj:${m.telegram_id}`)]]);
  for (const a of await db.listAdmins()) {
    await bot.telegram.sendMessage(a.telegram_id, text, { ...HTML, ...kb }).catch(() => {});
  }
}

export function registerAdmin(bot: Telegraf) {
  const isAdmin = (ctx: Context) => me(ctx)?.role === "admin";

  bot.action(/^(a|am|at|ar|aa|ap|aj):/, async (ctx, next) => {
    if (!isAdmin(ctx)) { await ctx.answerCbQuery("Faqat admin uchun"); return; }
    return next();
  });

  bot.action("a:panel", async ctx => {
    await ctx.answerCbQuery();
    await edit(ctx, "👑 <b>Admin panel</b>", panelRows());
  });

  bot.action(/^a:(today|week|month)$/, async ctx => {
    await ctx.answerCbQuery("Hisoblanmoqda…");
    const now = new Date();
    const period = ctx.match[1];
    const text =
      period === "today" ? await buildTeamReport(`Bugun — ${fmtShortDate(now)}`, dayStart(now), dayStart(now, 1), now, true)
      : period === "week" ? await buildTeamReport(`Shu hafta (${fmtShortDate(weekStart(now))} dan)`, weekStart(now), now, now)
      : await buildTeamReport(`Shu oy (${fmtShortDate(monthStart(now))} dan)`, monthStart(now), now, now);
    await edit(ctx, text, [backRow()]);
  });

  bot.action("a:plan", async ctx => {
    await ctx.answerCbQuery();
    await edit(ctx, await buildTeamPlan(), [backRow()]);
  });

  bot.action("a:members", async ctx => {
    await ctx.answerCbQuery();
    const members = (await db.listMembers()).filter(m => m.status !== "pending");
    const rows = members.map(m => [cb(
      `${m.status === "active" ? "" : "🚫 "}${m.role === "admin" ? "👑 " : ""}${m.name} · 🎯${m.daily_target}`.slice(0, 60),
      `am:${m.telegram_id}`,
    )]);
    rows.push(backRow());
    await edit(ctx, `👥 <b>Xodimlar (${members.length})</b>\n\nBatafsil ko'rish uchun tanlang:`, rows);
  });

  const showMember = async (ctx: Context, id: number) => {
    const m = await db.getMember(id);
    if (!m) { await ctx.answerCbQuery("Topilmadi"); return; }
    await edit(ctx, await buildMemberDetail(m), [
      [cb("🎯 Kunlik maqsad", `at:${id}`), cb(m.role === "admin" ? "👤 Xodim qilish" : "👑 Admin qilish", `ar:${id}`)],
      [cb(m.status === "active" ? "🚫 Faolsizlantirish" : "✅ Faollashtirish", `aa:${id}`)],
      [cb("⬅️ Xodimlar", "a:members")],
    ]);
  };

  bot.action(/^am:(\d+)$/, async ctx => {
    await ctx.answerCbQuery();
    await showMember(ctx, Number(ctx.match[1]));
  });

  bot.action(/^at:(\d+)$/, async ctx => {
    const m = await db.getMember(Number(ctx.match[1]));
    if (!m) { await ctx.answerCbQuery("Topilmadi"); return; }
    sessions.set(me(ctx).telegram_id, { flow: "target", step: "value", data: { memberId: m.telegram_id } });
    await ctx.answerCbQuery();
    await ctx.reply(`🎯 ${esc(m.name)} uchun kunlik qo'ng'iroq maqsadini yozing (hozir: ${m.daily_target}):`, HTML);
  });

  bot.action(/^ar:(\d+)$/, async ctx => {
    const id = Number(ctx.match[1]);
    if (id === me(ctx).telegram_id) { await ctx.answerCbQuery("O'zingizning rolingizni o'zgartira olmaysiz"); return; }
    const m = await db.getMember(id);
    if (!m) { await ctx.answerCbQuery("Topilmadi"); return; }
    const updated = await db.updateMember(id, { role: m.role === "admin" ? "member" : "admin" });
    await ctx.answerCbQuery("Saqlandi");
    await bot.telegram.sendMessage(id, updated.role === "admin" ? "👑 Sizga admin huquqi berildi." : "Admin huquqingiz olib tashlandi.",
      mainMenu(updated.role === "admin")).catch(() => {});
    await showMember(ctx, id);
  });

  bot.action(/^aa:(\d+)$/, async ctx => {
    const id = Number(ctx.match[1]);
    if (id === me(ctx).telegram_id) { await ctx.answerCbQuery("O'zingizni faolsizlantira olmaysiz"); return; }
    const m = await db.getMember(id);
    if (!m) { await ctx.answerCbQuery("Topilmadi"); return; }
    await db.updateMember(id, { status: m.status === "active" ? "inactive" : "active" });
    await ctx.answerCbQuery("Saqlandi");
    await showMember(ctx, id);
  });

  bot.action("a:req", async ctx => {
    await ctx.answerCbQuery();
    const pending = await db.listMembers("pending");
    const rows = pending.map(m => [
      cb(`✅ ${m.name}`.slice(0, 40), `ap:${m.telegram_id}`),
      cb("❌", `aj:${m.telegram_id}`),
    ]);
    rows.push(backRow());
    await edit(ctx, pending.length ? `⏳ <b>Kutilayotgan so'rovlar (${pending.length})</b>` : "So'rovlar yo'q.", rows);
  });

  bot.action(/^(ap|aj):(\d+)$/, async ctx => {
    const approve = ctx.match[1] === "ap";
    const id = Number(ctx.match[2]);
    const m = await db.getMember(id);
    if (!m) { await ctx.answerCbQuery("Topilmadi"); return; }
    if (m.status !== "pending") { await ctx.answerCbQuery("Allaqachon ko'rib chiqilgan"); return; }
    await db.updateMember(id, { status: approve ? "active" : "inactive" });
    await ctx.answerCbQuery(approve ? "Qabul qilindi" : "Rad etildi");
    await ctx.editMessageText(`${approve ? "✅ Qabul qilindi" : "❌ Rad etildi"}: ${esc(m.name)} (${esc(me(ctx).name)})`, HTML).catch(() => {});
    if (approve) {
      await bot.telegram.sendMessage(id,
        "🎉 So'rovingiz tasdiqlandi! Jamoaga xush kelibsiz.\n\nPastdagi menyudan foydalaning. Yordam: /help",
        mainMenu(false)).catch(() => {});
    } else {
      await bot.telegram.sendMessage(id, "Afsuski, so'rovingiz rad etildi.").catch(() => {});
    }
  });
}
