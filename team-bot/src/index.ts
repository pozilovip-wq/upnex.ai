import "dotenv/config";
import { Telegraf, type Context } from "telegraf";

for (const key of ["BOT_TOKEN", "SUPABASE_URL", "SUPABASE_KEY"]) {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
}

const { config } = await import("./config.js");
const db = await import("./db.js");
const flows = await import("./flows.js");
const { registerAdmin, showAdminPanel, notifyAccessRequest } = await import("./admin.js");
const { startScheduler } = await import("./scheduler.js");
const { BTN, mainMenu } = await import("./ui.js");
const { esc } = await import("./text.js");

const bot = new Telegraf(process.env.BOT_TOKEN!);

const HELP = [
  "<b>📘 Qanday ishlatiladi</b>",
  "",
  `${BTN.log} — qo'ng'iroq natijasini yozish (rejadagi yoki yangi)`,
  `${BTN.schedule} — mijoz bilan qo'ng'iroqni belgilash`,
  `${BTN.today} — bugungi qo'ng'iroqlar, muddati o'tganlar, uchrashuvlar`,
  `${BTN.meetings} — bugungi/ertangi uchrashuvlar`,
  `${BTN.newMeeting} — ichki yoki mijoz bilan uchrashuv`,
  `${BTN.stats} — kunlik, haftalik, oylik natijalaringiz`,
  "",
  "🔔 Eslatmalar: har bir qo'ng'iroq va uchrashuvdan 1 kun va 30 daqiqa oldin, muddati o'tsa — darhol.",
  `☀️ Har kuni ${config.morningHour}:00 da kunlik reja, 🌙 ${config.eveningHour}:00 da kun yakuni.`,
  "",
  "Buyruqlar: /today /log /schedule /meeting /stats /cancel",
].join("\n");

// ─── Access control: only private chats, only approved members ──────────────
bot.use(async (ctx, next) => {
  const from = ctx.from;
  if (!from || ctx.chat?.type !== "private") return;

  let member = await db.getMember(from.id);
  const name = [from.first_name, from.last_name].filter(Boolean).join(" ") || from.username || String(from.id);
  if (config.adminIds.includes(from.id) && (member?.status !== "active" || member.role !== "admin")) {
    member = await db.upsertMember({ telegram_id: from.id, name: member?.name ?? name, username: from.username ?? null, role: "admin", status: "active" });
  }
  ctx.state.member = member;

  const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
  if (member?.status === "active" || text.startsWith("/start")) return next();

  if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
  await ctx.reply(
    !member ? "Botdan foydalanish uchun /start bosing."
    : member.status === "pending" ? "⏳ So'rovingiz admin tasdiqlashini kutmoqda."
    : "🚫 Hisobingiz faol emas. Admin bilan bog'laning.",
  );
});

bot.start(async ctx => {
  const from = ctx.from;
  let member = ctx.state.member as import("./db.js").Member | null;
  const name = [from.first_name, from.last_name].filter(Boolean).join(" ") || from.username || String(from.id);

  if (!member) {
    member = await db.upsertMember({
      telegram_id: from.id, name, username: from.username ?? null,
      status: "pending", role: "member", daily_target: config.defaultDailyTarget,
    });
    await notifyAccessRequest(bot, member);
    await ctx.reply("👋 Salom! Bu UPNEX jamoasining qo'ng'iroq va uchrashuvlar boshqaruv boti.\n\n⏳ So'rovingiz adminga yuborildi. Tasdiqlangach xabar beraman.");
    return;
  }
  if (member.status !== "active") {
    await ctx.reply(member.status === "pending" ? "⏳ So'rovingiz admin tasdiqlashini kutmoqda." : "🚫 Hisobingiz faol emas. Admin bilan bog'laning.");
    return;
  }
  if (member.username !== (from.username ?? null)) await db.updateMember(from.id, { username: from.username ?? null });
  await ctx.reply(`👋 Salom, <b>${esc(member.name)}</b>!\n\n${HELP}`, { parse_mode: "HTML", ...mainMenu(member.role === "admin") });
});

const isAdmin = (ctx: Context) => (ctx.state.member as { role?: string })?.role === "admin";

bot.help(ctx => ctx.reply(HELP, { parse_mode: "HTML", ...mainMenu(isAdmin(ctx)) }));
bot.command("cancel", async ctx => {
  flows.sessions.delete(ctx.from.id);
  await ctx.reply("❌ Bekor qilindi.", mainMenu(isAdmin(ctx)));
});

const routes: Record<string, (ctx: Context) => Promise<unknown>> = {
  [BTN.log]: flows.startLog,
  [BTN.schedule]: flows.startSchedule,
  [BTN.today]: ctx => flows.showPlan(ctx, 0),
  [BTN.meetings]: ctx => flows.showMeetings(ctx, "0"),
  [BTN.newMeeting]: flows.startMeeting,
  [BTN.stats]: flows.showMyStats,
  [BTN.admin]: ctx => (isAdmin(ctx) ? showAdminPanel(ctx) : ctx.reply("Faqat admin uchun.")),
  "/log": flows.startLog,
  "/schedule": flows.startSchedule,
  "/today": ctx => flows.showPlan(ctx, 0),
  "/tomorrow": ctx => flows.showPlan(ctx, 1),
  "/meetings": ctx => flows.showMeetings(ctx, "0"),
  "/meeting": flows.startMeeting,
  "/stats": flows.showMyStats,
  "/admin": ctx => (isAdmin(ctx) ? showAdminPanel(ctx) : ctx.reply("Faqat admin uchun.")),
};

flows.registerFlows(bot);
registerAdmin(bot);

bot.on("text", async ctx => {
  const text = ctx.message.text.trim();
  const route = routes[text.split(/[\s@]/)[0]] ?? routes[text];
  if (route) {
    flows.sessions.delete(ctx.from.id); // a menu tap always starts fresh
    await route(ctx);
    return;
  }
  if (await flows.handleSessionText(ctx, bot, text)) return;
  await ctx.reply("Menyudan tanlang 👇", mainMenu(isAdmin(ctx)));
});

bot.catch(async (err, ctx) => {
  console.error("Bot error:", err);
  if (String(err).includes("409")) process.exit(1); // another instance is polling
  try { await ctx.reply("⚠️ Xatolik yuz berdi. Qayta urinib ko'ring yoki /cancel"); } catch {}
});

await bot.telegram.setMyCommands([
  { command: "today", description: "Bugungi reja" },
  { command: "log", description: "Qo'ng'iroq natijasini yozish" },
  { command: "schedule", description: "Qo'ng'iroq rejalash" },
  { command: "meeting", description: "Uchrashuv belgilash" },
  { command: "meetings", description: "Uchrashuvlar" },
  { command: "tomorrow", description: "Ertangi reja" },
  { command: "stats", description: "Mening statistikam" },
  { command: "admin", description: "Admin panel" },
  { command: "cancel", description: "Bekor qilish" },
  { command: "help", description: "Yordam" },
]).catch(err => console.error("setMyCommands failed:", err));

startScheduler(bot);
bot.launch().catch(err => { console.error("[fatal] bot.launch() failed:", err); process.exit(1); });
console.log("UPNEX team bot is running…");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
