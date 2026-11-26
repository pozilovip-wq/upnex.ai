/** Text builders for plans, statistics and scheduled reports. */
import * as db from "./db.js";
import type { Call, Meeting, Member } from "./db.js";
import { computeStats, statsBlock, type Stats } from "./stats.js";
import { dayStart, fmtShortDate, fmtTime, fmtWhen, monthStart, weekStart } from "./time.js";
import { esc } from "./text.js";
import { RESULT_LABEL } from "./ui.js";

export function callLine(c: Call, now = new Date(), withDay = false): string {
  const at = c.scheduled_at ? new Date(c.scheduled_at) : null;
  const when = at ? (withDay ? fmtWhen(at, now) : fmtTime(at)) : "";
  const phone = c.phone ? ` · ${esc(c.phone)}` : "";
  return ` • ${when} — <b>${esc(c.client_name)}</b>${phone}`;
}

export function meetingLine(m: Meeting, now = new Date(), withDay = false): string {
  const at = new Date(m.scheduled_at);
  const when = withDay ? fmtWhen(at, now) : fmtTime(at);
  const kind = m.kind === "client" ? `mijoz${m.client_name ? `: ${esc(m.client_name)}` : ""}` : "ichki";
  const where = m.location ? ` · 📍 ${esc(m.location)}` : "";
  return ` • ${when} — <b>${esc(m.title)}</b> (${kind})${where}`;
}

export function meetingDetails(m: Meeting, attendees: Member[], now = new Date()): string {
  const lines = [
    `📌 <b>${esc(m.title)}</b>`,
    `🕐 ${fmtWhen(new Date(m.scheduled_at), now)}`,
    `🏷 ${m.kind === "client" ? "Mijoz bilan uchrashuv" : "Ichki yig'ilish"}`,
  ];
  if (m.client_name) lines.push(`👤 Mijoz: ${esc(m.client_name)}`);
  if (m.location) lines.push(`📍 ${esc(m.location)}`);
  lines.push(`👥 Ishtirokchilar: ${attendees.map(a => esc(a.name)).join(", ") || "—"}`);
  return lines.join("\n");
}

async function memberMeetings(memberId: number, from: Date, to: Date): Promise<Meeting[]> {
  return (await db.meetingsBetween(from, to)).filter(m => db.isInMeeting(m, memberId));
}

export async function memberStats(memberId: number | undefined, from: Date, to: Date, now = new Date()): Promise<{ stats: Stats; meetings: number; calls: Call[] }> {
  const [calls, meetings] = await Promise.all([
    db.callsInRange(from, to, memberId),
    db.meetingsCreatedBetween(from, to),
  ]);
  const own = memberId ? meetings.filter(m => m.created_by === memberId) : meetings;
  return { stats: computeStats(calls, from, to, now), meetings: own.length, calls };
}

/** "Bugun: 12/20 qo'ng'iroq · 8 ta qoldi · rejada 3 ta" */
export async function progressLine(me: Member, now = new Date()): Promise<string> {
  const { stats } = await memberStats(me.telegram_id, dayStart(now), dayStart(now, 1), now);
  const left = Math.max(0, me.daily_target - stats.made);
  const goal = left ? `${left} ta qoldi` : "🎯 maqsad bajarildi!";
  return `📈 Bugun: <b>${stats.made}/${me.daily_target}</b> qo'ng'iroq · ${goal} · rejada ${stats.pending} ta`;
}

// ─── Member views ────────────────────────────────────────────────────────────

/** Today's (offset 0) or tomorrow's (offset 1) plan. Returns text + calls that need a result. */
export async function buildPlan(me: Member, offset: 0 | 1, now = new Date()): Promise<{ text: string; actionable: Call[] }> {
  const from = dayStart(now, offset);
  const to = dayStart(now, offset + 1);
  const [pending, meetings] = await Promise.all([
    db.pendingCalls({ memberId: me.telegram_id, until: to }),
    memberMeetings(me.telegram_id, from, to),
  ]);
  const overdue = pending.filter(c => new Date(c.scheduled_at!) < now);
  const upcoming = pending.filter(c => new Date(c.scheduled_at!) >= now && new Date(c.scheduled_at!) >= from);

  const lines = [`📋 <b>${offset ? "Ertangi" : "Bugungi"} reja — ${fmtShortDate(from)}</b>`, ""];
  if (!offset) lines.push(await progressLine(me, now), "");

  if (!offset && overdue.length) {
    lines.push(`⚠️ <b>Muddati o'tgan (${overdue.length}):</b>`);
    lines.push(...overdue.slice(0, 15).map(c => callLine(c, now, true)), "");
  }
  lines.push(`🕐 <b>Rejadagi qo'ng'iroqlar (${upcoming.length}):</b>`);
  lines.push(...(upcoming.length ? upcoming.slice(0, 25).map(c => callLine(c, now)) : [" Yo'q"]), "");
  lines.push(`📅 <b>Uchrashuvlar (${meetings.length}):</b>`);
  lines.push(...(meetings.length ? meetings.map(m => meetingLine(m, now)) : [" Yo'q"]));

  return { text: lines.join("\n"), actionable: offset ? [] : [...overdue, ...upcoming] };
}

export async function buildMeetingsView(me: Member, range: "0" | "1" | "7", now = new Date()): Promise<{ text: string; meetings: Meeting[] }> {
  const from = dayStart(now, range === "1" ? 1 : 0);
  const to = range === "7" ? dayStart(now, 7) : dayStart(now, Number(range) + 1);
  const title = range === "0" ? "Bugungi" : range === "1" ? "Ertangi" : "7 kunlik";
  const meetings = await memberMeetings(me.telegram_id, from, to);
  const lines = [`📅 <b>${title} uchrashuvlar</b>`, ""];
  lines.push(...(meetings.length ? meetings.map(m => meetingLine(m, now, range === "7")) : ["Uchrashuvlar yo'q."]));
  return { text: lines.join("\n"), meetings };
}

export async function buildMyStats(me: Member, now = new Date()): Promise<string> {
  const periods: [string, Date][] = [
    ["Bugun", dayStart(now)],
    ["Shu hafta", weekStart(now)],
    ["Shu oy", monthStart(now)],
  ];
  const parts = [`📊 <b>${esc(me.name)} — statistika</b>`, "", await progressLine(me, now)];
  for (const [label, from] of periods) {
    const { stats, meetings } = await memberStats(me.telegram_id, from, now, now);
    parts.push("", `<b>— ${label} —</b>`, statsBlock(stats, meetings));
  }
  return parts.join("\n");
}

// ─── Team / admin reports ────────────────────────────────────────────────────

export async function buildTeamReport(title: string, from: Date, to: Date, now = new Date(), withTargets = false): Promise<string> {
  const [members, calls, meetings] = await Promise.all([
    db.listMembers("active"),
    db.callsInRange(from, to),
    db.meetingsCreatedBetween(from, to),
  ]);
  const total = computeStats(calls, from, to, now);
  const lines = [`📊 <b>${title}</b>`, "", statsBlock(total, meetings.length), "", "👥 <b>Xodimlar reytingi:</b>"];

  const rows = members.map(m => ({
    m,
    s: computeStats(calls.filter(c => c.member_id === m.telegram_id), from, to, now),
    meet: meetings.filter(x => x.created_by === m.telegram_id).length,
  })).sort((a, b) => b.s.converted - a.s.converted || b.s.made - a.s.made);

  rows.forEach(({ m, s, meet }, i) => {
    const made = withTargets ? `${s.made}/${m.daily_target}` : String(s.made);
    const warn = s.overdue ? ` · ⚠️ ${s.overdue}` : "";
    lines.push(`${i + 1}. ${esc(m.name)} — 📞 ${made} · ✅ ${s.connected} · 🔁 ${s.followUp} · 📅 ${meet} · 💰 ${s.converted}${warn}`);
  });
  if (!rows.length) lines.push(" Faol xodimlar yo'q.");

  const idle = rows.filter(r => r.s.made === 0).map(r => esc(r.m.name));
  if (idle.length) lines.push("", `😴 Qo'ng'iroq qilmagan: ${idle.join(", ")}`);
  if (withTargets) {
    const hit = rows.filter(r => r.s.made >= r.m.daily_target).map(r => esc(r.m.name));
    if (hit.length) lines.push(`🎯 Maqsadni bajardi: ${hit.join(", ")}`);
  }
  return lines.join("\n");
}

export async function buildTeamPlan(now = new Date()): Promise<string> {
  const to = dayStart(now, 1);
  const [members, pending, meetings] = await Promise.all([
    db.listMembers("active"),
    db.pendingCalls({ until: to }),
    db.meetingsBetween(dayStart(now), to),
  ]);
  const lines = [`📋 <b>Jamoa rejasi — ${fmtShortDate(now)}</b>`, ""];
  for (const m of members) {
    const mine = pending.filter(c => c.member_id === m.telegram_id);
    const overdue = mine.filter(c => new Date(c.scheduled_at!) < now).length;
    lines.push(`• ${esc(m.name)} — rejada ${mine.length - overdue} · ⚠️ muddati o'tgan ${overdue}`);
  }
  const allOverdue = pending.filter(c => new Date(c.scheduled_at!) < now);
  if (allOverdue.length) {
    const names = new Map(members.map(m => [m.telegram_id, m.name]));
    lines.push("", `⚠️ <b>Muddati o'tgan qo'ng'iroqlar (${allOverdue.length}):</b>`);
    for (const c of allOverdue.slice(0, 20)) lines.push(`${callLine(c, now, true)} — ${esc(names.get(c.member_id) ?? "?")}`);
  }
  lines.push("", `📅 <b>Bugungi uchrashuvlar (${meetings.length}):</b>`);
  lines.push(...(meetings.length ? meetings.map(m => meetingLine(m, now)) : [" Yo'q"]));
  return lines.join("\n");
}

export async function buildMemberDetail(m: Member, now = new Date()): Promise<string> {
  const today = await memberStats(m.telegram_id, dayStart(now), dayStart(now, 1), now);
  const week = await memberStats(m.telegram_id, weekStart(now), now, now);
  const month = await memberStats(m.telegram_id, monthStart(now), now, now);
  return [
    `👤 <b>${esc(m.name)}</b>${m.username ? ` (@${esc(m.username)})` : ""}`,
    `Rol: ${m.role === "admin" ? "👑 admin" : "xodim"} · Holat: ${m.status} · Kunlik maqsad: ${m.daily_target}`,
    "", "<b>— Bugun —</b>", statsBlock(today.stats, today.meetings),
    "", "<b>— Shu hafta —</b>", statsBlock(week.stats, week.meetings),
    "", "<b>— Shu oy —</b>", statsBlock(month.stats, month.meetings),
  ].join("\n");
}

// ─── Scheduled digests ───────────────────────────────────────────────────────

export async function buildMorningDigest(me: Member, now = new Date()): Promise<string> {
  const { text } = await buildPlan(me, 0, now);
  return `☀️ Xayrli tong, <b>${esc(me.name)}</b>! Bugungi maqsad: <b>${me.daily_target}</b> ta qo'ng'iroq.\n\n${text}`;
}

export async function buildEveningSummary(me: Member, now = new Date()): Promise<string> {
  const { stats, meetings } = await memberStats(me.telegram_id, dayStart(now), dayStart(now, 1), now);
  const tomorrow = await db.pendingCalls({ memberId: me.telegram_id, from: dayStart(now, 1), until: dayStart(now, 2) });
  const tMeet = await memberMeetings(me.telegram_id, dayStart(now, 1), dayStart(now, 2));
  const lines = [
    `🌙 <b>Kun yakuni — ${esc(me.name)}</b>`, "",
    statsBlock(stats, meetings), "",
    `🎯 Maqsad: ${stats.made}/${me.daily_target}${stats.made >= me.daily_target ? " ✅" : ""}`,
  ];
  if (stats.overdue) lines.push(`⚠️ Bugun ${stats.overdue} ta rejalashtirilgan qo'ng'iroq bajarilmadi — /today orqali natija kiriting yoki ko'chiring.`);
  lines.push("", `📆 Ertaga: ${tomorrow.length} ta qo'ng'iroq, ${tMeet.length} ta uchrashuv.`);
  return lines.join("\n");
}

export function resultSummary(c: Call): string {
  return `<b>${esc(c.client_name)}</b> — ${c.result ? RESULT_LABEL[c.result] : ""}`;
}
