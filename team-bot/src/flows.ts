/**
 * Member-facing conversations: logging call results, scheduling calls,
 * follow-ups, rescheduling and meetings. Multi-step state lives in memory;
 * losing it on restart only interrupts a half-filled form.
 */
import type { Context, Telegraf } from "telegraf";
import * as db from "./db.js";
import type { Call, CallResult, Member } from "./db.js";
import { buildMeetingsView, buildMyStats, buildPlan, callLine, meetingDetails, progressLine, resultSummary } from "./reports.js";
import { esc, parseClient } from "./text.js";
import { dateKey, fmtShortDate, fmtTime, fmtWhen, keyToDate, parseDate, parseDateTime, parseTime } from "./time.js";
import { RESULT_CODE, RESULT_LABEL, callActionsRow, cancelBtn, cb, datePicker, inline, mainMenu, resultRows, timePicker } from "./ui.js";

type Flow = "log" | "schedule" | "followup" | "reschedule" | "meeting" | "target";
export interface Session { flow: Flow; step: string; data: Record<string, any> }
export const sessions = new Map<number, Session>();

const HTML = { parse_mode: "HTML" as const };

export function me(ctx: Context): Member {
  return ctx.state.member as Member;
}

async function safeEdit(ctx: Context, text: string, extra: object = {}) {
  try {
    await ctx.editMessageText(text, { ...HTML, ...extra });
  } catch (err) {
    if (!String(err).includes("message is not modified")) await ctx.reply(text, { ...HTML, ...extra });
  }
}

async function notifyAdmins(bot: Telegraf, text: string, exceptId?: number) {
  for (const a of await db.listAdmins()) {
    if (a.telegram_id === exceptId) continue;
    await bot.telegram.sendMessage(a.telegram_id, text, HTML).catch(() => {});
  }
}

/** Loads a call and checks the current user may act on it. */
async function ownedCall(ctx: Context, id: string): Promise<Call | null> {
  const call = await db.getCall(id);
  const user = me(ctx);
  if (!call || (call.member_id !== user.telegram_id && user.role !== "admin")) {
    await ctx.answerCbQuery("Qo'ng'iroq topilmadi");
    return null;
  }
  return call;
}

// ─── Entry points (menu buttons / commands) ──────────────────────────────────

export async function startLog(ctx: Context) {
  const user = me(ctx);
  sessions.set(user.telegram_id, { flow: "log", step: "client", data: {} });
  const now = new Date();
  const pending = await db.pendingCalls({ memberId: user.telegram_id, until: keyToDate(dateKey(now), 23, 59) });
  const rows = pending.slice(0, 8).map(c => [cb(`📌 ${fmtWhen(new Date(c.scheduled_at!), now)} · ${c.client_name}`.slice(0, 60), `res:${c.id}`)]);
  rows.push([cancelBtn]);
  const pick = pending.length ? "\n\nYoki rejadagi qo'ng'iroqni tanlang 👇" : "";
  await ctx.reply(
    `📞 <b>Qo'ng'iroq natijasini qayd etish</b>\n\nMijoz ismi va telefon raqamini yozing:\n<i>Aziz Karimov +998901234567</i>${pick}`,
    { ...HTML, ...inline(rows) },
  );
}

export async function startSchedule(ctx: Context) {
  sessions.set(me(ctx).telegram_id, { flow: "schedule", step: "client", data: {} });
  await ctx.reply(
    "🗓 <b>Qo'ng'iroq rejalash</b>\n\nMijoz ismi va telefon raqamini yozing:\n<i>Aziz Karimov +998901234567</i>",
    { ...HTML, ...inline([[cancelBtn]]) },
  );
}

export async function startMeeting(ctx: Context) {
  sessions.set(me(ctx).telegram_id, { flow: "meeting", step: "title", data: {} });
  await ctx.reply(
    "➕ <b>Yangi uchrashuv</b>\n\nUchrashuv mavzusini yozing:\n<i>Haftalik savdo yig'ilishi</i>",
    { ...HTML, ...inline([[cancelBtn]]) },
  );
}

export async function showPlan(ctx: Context, offset: 0 | 1, edit = false) {
  const { text, actionable } = await buildPlan(me(ctx), offset);
  const rows = actionable.slice(0, 10).map(c => [
    cb(`✅ ${fmtTime(new Date(c.scheduled_at!))} ${c.client_name}`.slice(0, 60), `res:${c.id}`),
  ]);
  rows.push([offset ? cb("⬅️ Bugungi reja", "plan:0") : cb("➡️ Ertangi reja", "plan:1")]);
  if (edit) await safeEdit(ctx, text, inline(rows));
  else await ctx.reply(text, { ...HTML, ...inline(rows) });
}

export async function showMeetings(ctx: Context, range: "0" | "1" | "7", edit = false) {
  const user = me(ctx);
  const { text, meetings } = await buildMeetingsView(user, range);
  const rows = meetings
    .filter(m => m.created_by === user.telegram_id || user.role === "admin")
    .slice(0, 5)
    .map(m => [cb(`🗑 Bekor: ${fmtTime(new Date(m.scheduled_at))} ${m.title}`.slice(0, 60), `mc:${m.id}`)]);
  rows.push([cb("Bugun", "mv:0"), cb("Ertaga", "mv:1"), cb("7 kun", "mv:7")]);
  rows.push([cb("➕ Yangi uchrashuv", "mnew")]);
  if (edit) await safeEdit(ctx, text, inline(rows));
  else await ctx.reply(text, { ...HTML, ...inline(rows) });
}

export async function showMyStats(ctx: Context) {
  await ctx.reply(await buildMyStats(me(ctx)), HTML);
}

// ─── Date/time steps shared by several flows ─────────────────────────────────

async function askDate(ctx: Context, s: Session, prompt: string, skip = false) {
  s.step = "date";
  await ctx.reply(`${prompt}\n\nKunni tanlang yoki yozing (<i>ertaga 15:00</i>, <i>28.11 14:30</i>):`, { ...HTML, ...datePicker(new Date(), { skip }) });
}

async function askTime(ctx: Context, s: Session, key: string, edit: boolean) {
  s.step = "time";
  s.data.date = key;
  const text = `🕐 <b>${fmtShortDate(keyToDate(key))}</b> — soatni tanlang yoki yozing (<i>14:30</i>):`;
  if (edit) await safeEdit(ctx, text, timePicker());
  else await ctx.reply(text, { ...HTML, ...timePicker() });
}

async function onDateTime(ctx: Context, s: Session, when: Date) {
  const user = me(ctx);
  if (when.getTime() < Date.now() - 60_000) {
    await ctx.reply("⛔️ Bu vaqt allaqachon o'tib ketgan. Boshqa vaqtni tanlang:", { ...HTML, ...datePicker() });
    s.step = "date";
    return;
  }
  const whenText = fmtWhen(when);

  switch (s.flow) {
    case "schedule":
    case "followup": {
      const call = await db.insertCall({
        member_id: user.telegram_id,
        client_name: s.data.name,
        phone: s.data.phone,
        scheduled_at: when.toISOString(),
        follow_up_of: s.data.fromCall ?? null,
      });
      sessions.delete(user.telegram_id);
      const head = s.flow === "followup" ? "🔁 Qayta qo'ng'iroq rejalashtirildi" : "✅ Qo'ng'iroq rejalashtirildi";
      await ctx.reply(
        `${head}\n\n👤 <b>${esc(call.client_name)}</b>${call.phone ? `\n📱 ${esc(call.phone)}` : ""}\n🕐 ${whenText}\n\n🔔 1 kun va 30 daqiqa oldin eslatma yuboraman.`,
        HTML,
      );
      return;
    }
    case "reschedule": {
      const call = await db.updateCall(s.data.callId, {
        scheduled_at: when.toISOString(), reminded_day: false, reminded_30: false, overdue_notified: false,
      });
      sessions.delete(user.telegram_id);
      await ctx.reply(`⏰ Ko'chirildi: <b>${esc(call.client_name)}</b> — ${whenText}`, HTML);
      return;
    }
    case "meeting": {
      s.data.when = when.toISOString();
      s.step = "location";
      await ctx.reply(
        `🕐 ${whenText}\n\n📍 Joy yoki havolani yozing (ofis, Zoom/Meet link) — yoki o'tkazib yuboring:`,
        { ...HTML, ...inline([[cb("⏭ O'tkazib yuborish", "skip")], [cancelBtn]]) },
      );
      return;
    }
  }
}

// ─── After a result is recorded ──────────────────────────────────────────────

async function afterResult(ctx: Context, bot: Telegraf, call: Call) {
  const user = me(ctx);
  const progress = await progressLine(user);
  if (call.result === "converted") {
    await notifyAdmins(bot, `🎉 <b>${esc(user.name)}</b> yangi mijoz qo'shdi: <b>${esc(call.client_name)}</b>${call.phone ? ` (${esc(call.phone)})` : ""}`, user.telegram_id);
  }
  if (call.result === "follow_up" || call.result === "interested") {
    const s: Session = { flow: "followup", step: "date", data: { fromCall: call.id, name: call.client_name, phone: call.phone } };
    sessions.set(user.telegram_id, s);
    await ctx.reply(`✅ Saqlandi: ${resultSummary(call)}\n${progress}`, HTML);
    await askDate(ctx, s, "🔁 <b>Keyingi qo'ng'iroq qachon?</b>", call.result === "interested");
    return;
  }
  sessions.delete(user.telegram_id);
  await ctx.reply(`✅ Saqlandi: ${resultSummary(call)}\n${progress}`, HTML);
}

// ─── Meeting attendee picker ─────────────────────────────────────────────────

async function attendeeKeyboard(selected: number[]) {
  const members = await db.listMembers("active");
  const rows = [];
  for (let i = 0; i < members.length; i += 2) {
    rows.push(members.slice(i, i + 2).map(m =>
      cb(`${selected.includes(m.telegram_id) ? "✅" : "▫️"} ${m.name}`.slice(0, 40), `ma:${m.telegram_id}`)));
  }
  rows.push([cb("👥 Hammasi", "ma:all"), cb("💾 Saqlash", "ma:done")]);
  rows.push([cancelBtn]);
  return inline(rows);
}

async function askAttendees(ctx: Context, s: Session) {
  s.step = "attendees";
  s.data.attendees ??= [me(ctx).telegram_id];
  await ctx.reply("👥 Kimlar qatnashadi? Belgilang va <b>Saqlash</b>ni bosing:", { ...HTML, ...(await attendeeKeyboard(s.data.attendees)) });
}

async function saveMeeting(ctx: Context, bot: Telegraf, s: Session) {
  const user = me(ctx);
  const meeting = await db.insertMeeting({
    title: s.data.title,
    kind: s.data.kind,
    client_name: s.data.client ?? null,
    location: s.data.location ?? null,
    scheduled_at: s.data.when,
    created_by: user.telegram_id,
    attendee_ids: s.data.attendees,
  });
  sessions.delete(user.telegram_id);
  const attendees = db.meetingAttendees(meeting, await db.listMembers("active"));
  const details = meetingDetails(meeting, attendees);
  await safeEdit(ctx, `✅ <b>Uchrashuv belgilandi</b>\n\n${details}\n\n🔔 Ishtirokchilarga 1 kun va 30 daqiqa oldin eslatma boradi.`);
  for (const a of attendees) {
    if (a.telegram_id === user.telegram_id) continue;
    await bot.telegram.sendMessage(a.telegram_id, `📅 <b>Yangi uchrashuv</b> (${esc(user.name)} belgiladi)\n\n${details}`, HTML).catch(() => {});
  }
}

// ─── Free-text input while a flow is open ────────────────────────────────────

export async function handleSessionText(ctx: Context, bot: Telegraf, text: string): Promise<boolean> {
  const user = me(ctx);
  const s = sessions.get(user.telegram_id);
  if (!s) return false;

  if (s.step === "date") {
    const full = parseDateTime(text);
    if (full) { await onDateTime(ctx, s, full); return true; }
    const key = parseDate(text);
    if (key) { await askTime(ctx, s, key, false); return true; }
    await ctx.reply("🤔 Sanani tushunmadim. Masalan: <i>ertaga 15:00</i>, <i>28.11 14:30</i> yoki <i>28.11</i>", HTML);
    return true;
  }
  if (s.step === "time") {
    const t = parseTime(text);
    if (!t) { await ctx.reply("🤔 Vaqtni tushunmadim. Masalan: <i>14:30</i>", HTML); return true; }
    await onDateTime(ctx, s, keyToDate(s.data.date, t.hh, t.mm));
    return true;
  }

  switch (`${s.flow}:${s.step}`) {
    case "log:client":
    case "schedule:client": {
      const client = parseClient(text);
      if (!client) { await ctx.reply("Mijoz ismini yozing 🙏"); return true; }
      Object.assign(s.data, client);
      if (s.flow === "log") {
        s.step = "result";
        await ctx.reply(`👤 <b>${esc(client.name)}</b>${client.phone ? ` · ${esc(client.phone)}` : ""}\n\nQo'ng'iroq natijasi qanday?`, { ...HTML, ...inline([...resultRows("lr"), [cancelBtn]]) });
      } else {
        await askDate(ctx, s, `👤 <b>${esc(client.name)}</b>${client.phone ? ` · ${esc(client.phone)}` : ""}\n\n🗓 <b>Qachon qo'ng'iroq qilasiz?</b>`);
      }
      return true;
    }
    case "meeting:title": {
      s.data.title = text.trim().slice(0, 200);
      s.step = "kind";
      await ctx.reply("Uchrashuv turi:", inline([[cb("🏢 Ichki yig'ilish", "mk:internal"), cb("🤝 Mijoz bilan", "mk:client")], [cancelBtn]]));
      return true;
    }
    case "meeting:client": {
      s.data.client = text.trim().slice(0, 200);
      await askDate(ctx, s, `🤝 Mijoz: <b>${esc(s.data.client)}</b>\n\n📅 <b>Uchrashuv qachon?</b>`);
      return true;
    }
    case "meeting:location": {
      s.data.location = text.trim().slice(0, 300);
      await askAttendees(ctx, s);
      return true;
    }
    case "target:value": {
      const n = Number(text.trim());
      if (!Number.isInteger(n) || n < 0 || n > 500) { await ctx.reply("0 dan 500 gacha butun son yozing."); return true; }
      const m = await db.updateMember(s.data.memberId, { daily_target: n });
      sessions.delete(user.telegram_id);
      await ctx.reply(`🎯 ${esc(m.name)} uchun kunlik maqsad: <b>${n}</b> ta qo'ng'iroq`, HTML);
      return true;
    }
  }
  await ctx.reply("Tugmalardan birini tanlang 👆 yoki /cancel");
  return true;
}

// ─── Callback buttons ────────────────────────────────────────────────────────

export function registerFlows(bot: Telegraf) {
  const data = (ctx: Context) => (ctx.callbackQuery && "data" in ctx.callbackQuery ? ctx.callbackQuery.data : "");
  const session = (ctx: Context) => sessions.get(me(ctx).telegram_id);
  const stale = (ctx: Context) => ctx.answerCbQuery("Bu forma eskirgan. Menyudan qayta boshlang.");

  bot.action("cancel", async ctx => {
    sessions.delete(me(ctx).telegram_id);
    await ctx.answerCbQuery("Bekor qilindi");
    await safeEdit(ctx, "❌ Bekor qilindi.");
  });

  // Open the result picker for an existing (scheduled) call.
  bot.action(/^res:(.+)$/, async ctx => {
    const call = await ownedCall(ctx, ctx.match[1]);
    if (!call) return;
    if (call.status !== "pending") { await ctx.answerCbQuery("Bu qo'ng'iroq allaqachon yopilgan"); return; }
    sessions.delete(me(ctx).telegram_id);
    await ctx.answerCbQuery();
    await ctx.reply(
      `📞 ${callLine(call, new Date(), true).trim()}\n\nQo'ng'iroq natijasi qanday?`,
      { ...HTML, ...inline([...resultRows(`r:${call.id}`), callActionsRow(call.id)]) },
    );
  });

  // Result for an existing call (from reminders, plan or log picker).
  bot.action(/^r:(.+):([a-z])$/, async ctx => {
    const result = RESULT_CODE[ctx.match[2]];
    const call = await ownedCall(ctx, ctx.match[1]);
    if (!call || !result) return;
    const done = await db.completeCall(call.id, result);
    if (!done) { await ctx.answerCbQuery("Bu qo'ng'iroq allaqachon yopilgan"); return; }
    await ctx.answerCbQuery(RESULT_LABEL[result]);
    await safeEdit(ctx, `📞 ${callLine(done, new Date(), true).trim()}\n➡️ ${RESULT_LABEL[result]}`);
    await afterResult(ctx, bot, done);
  });

  // Result for an ad-hoc call typed into the log flow.
  bot.action(/^lr:([a-z])$/, async ctx => {
    const s = session(ctx);
    const result = RESULT_CODE[ctx.match[1]];
    if (!s || s.flow !== "log" || s.step !== "result" || !result) return stale(ctx);
    const call = await db.insertCall({
      member_id: me(ctx).telegram_id, client_name: s.data.name, phone: s.data.phone,
      status: "done", result, completed_at: new Date().toISOString(),
    });
    await ctx.answerCbQuery(RESULT_LABEL[result as CallResult]);
    await safeEdit(ctx, `📞 <b>${esc(call.client_name)}</b>${call.phone ? ` · ${esc(call.phone)}` : ""}\n➡️ ${RESULT_LABEL[result]}`);
    await afterResult(ctx, bot, call);
  });

  bot.action(/^rs:(.+)$/, async ctx => {
    const call = await ownedCall(ctx, ctx.match[1]);
    if (!call) return;
    if (call.status !== "pending") { await ctx.answerCbQuery("Bu qo'ng'iroq allaqachon yopilgan"); return; }
    const s: Session = { flow: "reschedule", step: "date", data: { callId: call.id } };
    sessions.set(me(ctx).telegram_id, s);
    await ctx.answerCbQuery();
    await askDate(ctx, s, `⏰ <b>${esc(call.client_name)}</b> — yangi vaqt?`);
  });

  bot.action(/^cx:(.+)$/, async ctx => {
    const call = await ownedCall(ctx, ctx.match[1]);
    if (!call) return;
    if (call.status !== "pending") { await ctx.answerCbQuery("Bu qo'ng'iroq allaqachon yopilgan"); return; }
    await db.updateCall(call.id, { status: "cancelled" });
    await ctx.answerCbQuery("Bekor qilindi");
    await safeEdit(ctx, `🗑 Bekor qilindi: <b>${esc(call.client_name)}</b>`);
  });

  bot.action(/^d:(\d{4}-\d{2}-\d{2})$/, async ctx => {
    const s = session(ctx);
    if (!s || s.step !== "date") return stale(ctx);
    await ctx.answerCbQuery();
    await askTime(ctx, s, ctx.match[1], true);
  });

  bot.action(/^t:(\d{2}):(\d{2})$/, async ctx => {
    const s = session(ctx);
    if (!s || s.step !== "time") return stale(ctx);
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined).catch(() => {});
    await onDateTime(ctx, s, keyToDate(s.data.date, Number(ctx.match[1]), Number(ctx.match[2])));
  });

  bot.action("skip", async ctx => {
    const s = session(ctx);
    if (!s) return stale(ctx);
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined).catch(() => {});
    if (s.flow === "followup") {
      sessions.delete(me(ctx).telegram_id);
      await ctx.reply("👌 Keyingi qo'ng'iroq rejalashtirilmadi.");
    } else if (s.flow === "meeting" && s.step === "location") {
      await askAttendees(ctx, s);
    }
  });

  bot.action(/^plan:([01])$/, async ctx => {
    await ctx.answerCbQuery();
    await showPlan(ctx, Number(ctx.match[1]) as 0 | 1, true);
  });

  // ── Meetings ──
  bot.action("mnew", async ctx => { await ctx.answerCbQuery(); await startMeeting(ctx); });

  bot.action(/^mv:([017])$/, async ctx => {
    await ctx.answerCbQuery();
    await showMeetings(ctx, ctx.match[1] as "0" | "1" | "7", true);
  });

  bot.action(/^mk:(internal|client)$/, async ctx => {
    const s = session(ctx);
    if (!s || s.flow !== "meeting" || s.step !== "kind") return stale(ctx);
    s.data.kind = ctx.match[1];
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined).catch(() => {});
    if (s.data.kind === "client") {
      s.step = "client";
      await ctx.reply("🤝 Mijoz ismini yozing:");
    } else {
      await askDate(ctx, s, `🏢 <b>${esc(s.data.title)}</b>\n\n📅 <b>Yig'ilish qachon?</b>`);
    }
  });

  bot.action(/^ma:(.+)$/, async ctx => {
    const s = session(ctx);
    if (!s || s.flow !== "meeting" || s.step !== "attendees") return stale(ctx);
    const arg = ctx.match[1];
    if (arg === "done") { await ctx.answerCbQuery("Saqlanmoqda…"); await saveMeeting(ctx, bot, s); return; }
    if (arg === "all") {
      s.data.attendees = (await db.listMembers("active")).map(m => m.telegram_id);
    } else {
      const id = Number(arg);
      const list: number[] = s.data.attendees;
      s.data.attendees = list.includes(id) ? list.filter(x => x !== id) : [...list, id];
    }
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup((await attendeeKeyboard(s.data.attendees)).reply_markup).catch(() => {});
  });

  bot.action(/^mc:(.+)$/, async ctx => {
    const user = me(ctx);
    const m = await db.getMeeting(ctx.match[1]);
    if (!m || m.status !== "scheduled" || (m.created_by !== user.telegram_id && user.role !== "admin")) {
      await ctx.answerCbQuery("Uchrashuv topilmadi"); return;
    }
    await db.updateMeeting(m.id, { status: "cancelled" });
    await ctx.answerCbQuery("Bekor qilindi");
    const attendees = db.meetingAttendees(m, await db.listMembers("active"));
    for (const a of attendees) {
      if (a.telegram_id === user.telegram_id) continue;
      await bot.telegram.sendMessage(a.telegram_id, `🚫 <b>Uchrashuv bekor qilindi</b> (${esc(user.name)})\n\n📌 ${esc(m.title)}\n🕐 ${fmtWhen(new Date(m.scheduled_at))}`, HTML).catch(() => {});
    }
    await showMeetings(ctx, "7", true);
  });
}

export { mainMenu };
