/**
 * Runs every minute: call & meeting reminders, overdue alerts and the
 * daily / weekly / monthly reports. Every send is "claimed" in the database
 * first, so restarts or a second instance never send duplicates.
 */
import type { Telegraf } from "telegraf";
import * as db from "./db.js";
import type { Call, Meeting, Member } from "./db.js";
import { config } from "./config.js";
import { buildEveningSummary, buildMorningDigest, buildTeamReport, meetingDetails } from "./reports.js";
import { esc } from "./text.js";
import { dateKey, dayStart, fmtShortDate, fmtWhen, local, monthStart, weekStart } from "./time.js";
import { callActionsRow, inline, resultRows } from "./ui.js";

const MIN = 60_000;
const HTML = { parse_mode: "HTML" as const };

async function send(bot: Telegraf, chatId: number, text: string, extra: object = {}) {
  try {
    await bot.telegram.sendMessage(chatId, text, { ...HTML, ...extra });
  } catch (err) {
    console.error(`[scheduler] send to ${chatId} failed:`, String(err).slice(0, 200));
  }
}

function callCard(c: Call, now: Date): string {
  return `👤 <b>${esc(c.client_name)}</b>${c.phone ? `\n📱 ${esc(c.phone)}` : ""}\n🕐 ${fmtWhen(new Date(c.scheduled_at!), now)}`;
}

/** Booked less than 24h before it happens — a "day before" reminder would just repeat the booking. */
function bookedLate(x: { scheduled_at: string | null; created_at: string }): boolean {
  return new Date(x.scheduled_at!).getTime() - new Date(x.created_at).getTime() < 24 * 60 * MIN;
}

async function dueCalls(flag: "reminded_30" | "reminded_day" | "overdue_notified", from: Date | null, to: Date): Promise<Call[]> {
  let q = db.supabase.from("calls").select("*").eq("status", "pending").eq(flag, false).lte("scheduled_at", to.toISOString());
  if (from) q = q.gt("scheduled_at", from.toISOString());
  const { data, error } = await q.limit(200);
  if (error) { console.error(`[scheduler] dueCalls ${flag}:`, error.message); return []; }
  return (data ?? []) as Call[];
}

async function dueMeetings(flag: "reminded_30" | "reminded_day", from: Date, to: Date): Promise<Meeting[]> {
  const { data, error } = await db.supabase.from("meetings").select("*").eq("status", "scheduled").eq(flag, false)
    .gt("scheduled_at", from.toISOString()).lte("scheduled_at", to.toISOString()).limit(100);
  if (error) { console.error(`[scheduler] dueMeetings ${flag}:`, error.message); return []; }
  return (data ?? []) as Meeting[];
}

async function callReminders(bot: Telegraf, now: Date) {
  const t = now.getTime();

  // 30 minutes before — with result buttons so the member can close it right after the call.
  for (const c of await dueCalls("reminded_30", new Date(t - 5 * MIN), new Date(t + 30 * MIN))) {
    if (!(await db.claimFlag("calls", c.id, "reminded_30"))) continue;
    await send(bot, c.member_id, `⏰ <b>Tez orada qo'ng'iroq!</b>\n\n${callCard(c, now)}\n\nQo'ng'iroqdan keyin natijani belgilang 👇`,
      inline([...resultRows(`r:${c.id}`), callActionsRow(c.id)]));
  }

  // One day before (skipped for calls booked less than 2 hours ahead).
  for (const c of await dueCalls("reminded_day", new Date(t + 2 * 60 * MIN), new Date(t + 24 * 60 * MIN))) {
    if (!(await db.claimFlag("calls", c.id, "reminded_day"))) continue;
    if (bookedLate(c)) continue; // booked <24h ahead: the 30-min reminder is enough
    await send(bot, c.member_id, `📅 <b>Eslatma: ertangi qo'ng'iroq</b>\n\n${callCard(c, now)}`, inline([callActionsRow(c.id)]));
  }

  // Overdue: 15 minutes past the scheduled time and still no result.
  for (const c of await dueCalls("overdue_notified", null, new Date(t - 15 * MIN))) {
    if (!(await db.claimFlag("calls", c.id, "overdue_notified"))) continue;
    await send(bot, c.member_id, `⚠️ <b>Qo'ng'iroq muddati o'tdi!</b>\n\n${callCard(c, now)}\n\nNatijani kiriting yoki boshqa vaqtga ko'chiring:`,
      inline([...resultRows(`r:${c.id}`), callActionsRow(c.id)]));
  }
}

async function meetingReminders(bot: Telegraf, now: Date) {
  const t = now.getTime();
  const jobs: [flag: "reminded_30" | "reminded_day", from: number, to: number, head: string][] = [
    ["reminded_30", t - 5 * MIN, t + 30 * MIN, "⏰ <b>Uchrashuv 30 daqiqadan so'ng!</b>"],
    ["reminded_day", t + 2 * 60 * MIN, t + 24 * 60 * MIN, "📅 <b>Eslatma: ertangi uchrashuv</b>"],
  ];
  let active: Member[] | null = null;
  for (const [flag, from, to, head] of jobs) {
    for (const m of await dueMeetings(flag, new Date(from), new Date(to))) {
      if (!(await db.claimFlag("meetings", m.id, flag))) continue;
      if (flag === "reminded_day" && bookedLate(m)) continue;
      active ??= await db.listMembers("active");
      const attendees = db.meetingAttendees(m, active);
      const text = `${head}\n\n${meetingDetails(m, attendees, now)}`;
      for (const a of attendees) await send(bot, a.telegram_id, text);
    }
  }
}

/** True when local time is inside [hour, hour+3h) and this job hasn't run for `key` yet. */
async function due(now: Date, hour: number, key: string): Promise<boolean> {
  const { hh } = local(now);
  if (hh < hour || hh >= hour + 3) return false;
  return db.claimEvent(key);
}

async function dailyJobs(bot: Telegraf, now: Date) {
  const today = dateKey(now);
  const { dow, d } = local(now);

  if (await due(now, config.morningHour, `morning:${today}`)) {
    for (const m of await db.listMembers("active")) {
      await send(bot, m.telegram_id, await buildMorningDigest(m, now));
    }
  }

  if (await due(now, config.eveningHour, `evening:${today}`)) {
    const members = await db.listMembers("active");
    for (const m of members) await send(bot, m.telegram_id, await buildEveningSummary(m, now));
    const report = await buildTeamReport(`Kunlik jamoa hisoboti — ${fmtShortDate(now)}`, dayStart(now), dayStart(now, 1), now, true);
    for (const a of members.filter(x => x.role === "admin")) await send(bot, a.telegram_id, report);
  }

  // Weekly report on Monday morning (previous Mon–Sun), monthly on the 1st (previous month).
  if (dow === 1 && (await due(now, config.morningHour, `weekly:${today}`))) {
    const from = weekStart(now, -1);
    const report = await buildTeamReport(`Haftalik hisobot — ${fmtShortDate(from)} – ${fmtShortDate(dayStart(now, -1))}`, from, weekStart(now), now);
    for (const a of await db.listAdmins()) await send(bot, a.telegram_id, report);
  }
  if (d === 1 && (await due(now, config.morningHour, `monthly:${today}`))) {
    const from = monthStart(now, -1);
    const report = await buildTeamReport(`Oylik hisobot — ${fmtShortDate(from)} – ${fmtShortDate(dayStart(now, -1))}`, from, monthStart(now), now);
    for (const a of await db.listAdmins()) await send(bot, a.telegram_id, report);
  }
}

export function startScheduler(bot: Telegraf) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    const now = new Date();
    try {
      await callReminders(bot, now);
      await meetingReminders(bot, now);
      await dailyJobs(bot, now);
    } catch (err) {
      console.error("[scheduler] tick failed:", err);
    } finally {
      running = false;
    }
  };
  void tick();
  return setInterval(tick, MIN);
}
