/**
 * Time helpers. The whole team works in Asia/Tashkent (UTC+5, no DST),
 * so we use a fixed offset instead of pulling in a timezone library.
 */
const OFFSET_MS = 5 * 60 * 60 * 1000;
const WEEKDAYS = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"];

const p = (n: number) => String(n).padStart(2, "0");

export interface LocalParts { y: number; m: number; d: number; hh: number; mm: number; dow: number }

export function local(date: Date): LocalParts {
  const l = new Date(date.getTime() + OFFSET_MS);
  return {
    y: l.getUTCFullYear(), m: l.getUTCMonth() + 1, d: l.getUTCDate(),
    hh: l.getUTCHours(), mm: l.getUTCMinutes(), dow: l.getUTCDay(),
  };
}

/** Builds a real Date from Tashkent wall-clock parts (overflowing days/months roll over). */
export function makeDate(y: number, m: number, d: number, hh = 0, mm = 0): Date {
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - OFFSET_MS);
}

export function dayStart(now = new Date(), addDays = 0): Date {
  const l = local(now);
  return makeDate(l.y, l.m, l.d + addDays);
}

/** Monday 00:00 of the current week, optionally shifted by whole weeks. */
export function weekStart(now = new Date(), addWeeks = 0): Date {
  const l = local(now);
  return makeDate(l.y, l.m, l.d - ((l.dow + 6) % 7) + addWeeks * 7);
}

export function monthStart(now = new Date(), addMonths = 0): Date {
  const l = local(now);
  return makeDate(l.y, l.m + addMonths, 1);
}

/** 'YYYY-MM-DD' in Tashkent time. */
export function dateKey(date: Date): string {
  const l = local(date);
  return `${l.y}-${p(l.m)}-${p(l.d)}`;
}

export function keyToDate(key: string, hh = 0, mm = 0): Date {
  const [y, m, d] = key.split("-").map(Number);
  return makeDate(y, m, d, hh, mm);
}

export function fmtTime(date: Date): string {
  const l = local(date);
  return `${p(l.hh)}:${p(l.mm)}`;
}

export function fmtShortDate(date: Date): string {
  const l = local(date);
  return `${p(l.d)}.${p(l.m)} (${WEEKDAYS[l.dow]})`;
}

/** 'bugun' / 'ertaga' / '28.11 (Pay)'. */
export function fmtDay(date: Date, now = new Date()): string {
  const key = dateKey(date);
  if (key === dateKey(now)) return "bugun";
  if (key === dateKey(dayStart(now, 1))) return "ertaga";
  if (key === dateKey(dayStart(now, -1))) return "kecha";
  return fmtShortDate(date);
}

export function fmtWhen(date: Date, now = new Date()): string {
  return `${fmtDay(date, now)} ${fmtTime(date)}`;
}

// ─── Parsing user input ──────────────────────────────────────────────────────

export function parseTime(input: string): { hh: number; mm: number } | null {
  const m = input.trim().match(/^(\d{1,2})(?:[:.\s](\d{2}))?$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = m[2] ? Number(m[2]) : 0;
  if (hh > 23 || mm > 59) return null;
  return { hh, mm };
}

/** Accepts bugun/ertaga/indinga, '25.12', '25.12.2026', '25/12'. Returns a date key. */
export function parseDate(input: string, now = new Date()): string | null {
  const s = input.trim().toLowerCase();
  const words: Record<string, number> = { bugun: 0, today: 0, ertaga: 1, tomorrow: 1, indinga: 2 };
  if (s in words) return dateKey(dayStart(now, words[s]));

  const m = s.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  let y = m[3] ? Number(m[3]) : local(now).y;
  if (y < 100) y += 2000;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;

  let date = makeDate(y, mo, d);
  if (local(date).d !== d) return null; // e.g. 31.02
  // No year given and the date already passed → they mean next year.
  if (!m[3] && date < dayStart(now)) date = makeDate(y + 1, mo, d);
  return dateKey(date);
}

/** 'ertaga 15:00', '25.12 14:30', '14:30' (today). Time must use ':' here. */
export function parseDateTime(input: string, now = new Date()): Date | null {
  const m = input.trim().match(/^(.*?)\s*(\d{1,2}:\d{2})$/);
  if (!m) return null;
  const time = parseTime(m[2]);
  if (!time) return null;
  const key = m[1] ? parseDate(m[1], now) : dateKey(now);
  if (!key) return null;
  return keyToDate(key, time.hh, time.mm);
}
