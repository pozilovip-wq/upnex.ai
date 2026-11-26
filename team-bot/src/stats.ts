import type { Call } from "./db.js";

export interface Stats {
  made: number;          // calls completed with a result
  connected: number;     // reached the client (everything except no_answer)
  noAnswer: number;
  interested: number;
  notInterested: number;
  followUp: number;
  converted: number;
  overdue: number;       // scheduled in range, time passed, still pending
  pending: number;       // scheduled in range, still upcoming
}

/** Pure aggregation so it can be unit-tested without a database. */
export function computeStats(calls: Pick<Call, "status" | "result" | "scheduled_at" | "completed_at">[], from: Date, to: Date, now = new Date()): Stats {
  const s: Stats = { made: 0, connected: 0, noAnswer: 0, interested: 0, notInterested: 0, followUp: 0, converted: 0, overdue: 0, pending: 0 };
  const f = from.getTime();
  const t = to.getTime();
  const n = now.getTime();
  for (const c of calls) {
    if (c.status === "done" && c.completed_at) {
      const at = new Date(c.completed_at).getTime();
      if (at >= f && at < t) {
        s.made++;
        switch (c.result) {
          case "no_answer": s.noAnswer++; break;
          case "interested": s.interested++; break;
          case "not_interested": s.notInterested++; break;
          case "follow_up": s.followUp++; break;
          case "converted": s.converted++; break;
        }
      }
    } else if (c.status === "pending" && c.scheduled_at) {
      const at = new Date(c.scheduled_at).getTime();
      if (at >= f && at < t) {
        if (at < n) s.overdue++;
        else s.pending++;
      }
    }
  }
  s.connected = s.made - s.noAnswer;
  return s;
}

export function pct(part: number, whole: number): string {
  return whole ? `${Math.round((part / whole) * 100)}%` : "0%";
}

export function statsBlock(s: Stats, meetings: number): string {
  return [
    `📞 Jami qo'ng'iroqlar: <b>${s.made}</b>`,
    `✅ Muvaffaqiyatli bog'lanish: <b>${s.connected}</b> (${pct(s.connected, s.made)})`,
    `📵 O'tkazib yuborilgan: <b>${s.noAnswer + s.overdue}</b> (javobsiz ${s.noAnswer} · muddati o'tgan ${s.overdue})`,
    `👍 Qiziqdi: <b>${s.interested}</b> · 👎 Qiziqmadi: <b>${s.notInterested}</b>`,
    `🔁 Qayta qo'ng'iroq: <b>${s.followUp}</b>`,
    `📅 Uchrashuvlar belgilandi: <b>${meetings}</b>`,
    `💰 Mijozga aylandi: <b>${s.converted}</b> (konversiya ${pct(s.converted, s.made)})`,
  ].join("\n");
}
