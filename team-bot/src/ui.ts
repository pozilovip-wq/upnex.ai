import { Markup } from "telegraf";
import type { InlineKeyboardButton } from "telegraf/types";
import type { CallResult } from "./db.js";
import { dateKey, dayStart, fmtShortDate } from "./time.js";

export const BTN = {
  log: "📞 Qo'ng'iroq qayd etish",
  schedule: "🗓 Qo'ng'iroq rejalash",
  today: "📋 Bugungi reja",
  meetings: "📅 Uchrashuvlar",
  newMeeting: "➕ Uchrashuv belgilash",
  stats: "📊 Statistikam",
  admin: "👑 Admin panel",
} as const;

export function mainMenu(isAdmin: boolean) {
  const rows: string[][] = [
    [BTN.log, BTN.schedule],
    [BTN.today, BTN.meetings],
    [BTN.newMeeting, BTN.stats],
  ];
  if (isAdmin) rows.push([BTN.admin]);
  return Markup.keyboard(rows).resize();
}

export const RESULT_LABEL: Record<CallResult, string> = {
  interested: "👍 Qiziqdi",
  not_interested: "👎 Qiziqmadi",
  no_answer: "📵 Javob bermadi",
  follow_up: "🔁 Qayta qo'ng'iroq",
  converted: "💰 Mijozga aylandi",
};

// One-letter codes keep callback_data under Telegram's 64-byte limit.
export const RESULT_CODE: Record<string, CallResult> = {
  i: "interested", n: "not_interested", a: "no_answer", f: "follow_up", c: "converted",
};
const CODE_OF = Object.fromEntries(Object.entries(RESULT_CODE).map(([k, v]) => [v, k])) as Record<CallResult, string>;

type Btn = InlineKeyboardButton;
const cb = (text: string, data: string): Btn => Markup.button.callback(text, data);

export const cancelBtn = cb("❌ Bekor qilish", "cancel");

/** Result buttons. `prefix` is "r:<callId>" for existing calls or "lr" for the ad-hoc log flow. */
export function resultRows(prefix: string): Btn[][] {
  const b = (r: CallResult) => cb(RESULT_LABEL[r], `${prefix}:${CODE_OF[r]}`);
  return [
    [b("interested"), b("not_interested")],
    [b("no_answer"), b("follow_up")],
    [b("converted")],
  ];
}

export function callActionsRow(callId: string): Btn[] {
  return [cb("⏰ Ko'chirish", `rs:${callId}`), cb("🗑 Bekor qilish", `cx:${callId}`)];
}

export function datePicker(now = new Date(), opts: { skip?: boolean } = {}) {
  const day = (offset: number, label?: string) => {
    const d = dayStart(now, offset);
    return cb(label ?? fmtShortDate(d), `d:${dateKey(d)}`);
  };
  const rows: Btn[][] = [
    [day(0, "Bugun"), day(1, "Ertaga"), day(2, "Indinga")],
    [day(3), day(4), day(5)],
    [day(6), day(7), day(14, "+2 hafta")],
  ];
  const last: Btn[] = [];
  if (opts.skip) last.push(cb("⏭ O'tkazib yuborish", "skip"));
  last.push(cancelBtn);
  rows.push(last);
  return Markup.inlineKeyboard(rows);
}

export function timePicker() {
  const t = (s: string) => cb(s, `t:${s}`);
  return Markup.inlineKeyboard([
    [t("09:00"), t("10:00"), t("11:00"), t("12:00")],
    [t("14:00"), t("15:00"), t("16:00"), t("17:00")],
    [t("18:00"), t("19:00"), t("20:00"), t("21:00")],
    [cancelBtn],
  ]);
}

export function inline(rows: Btn[][]) {
  return Markup.inlineKeyboard(rows);
}

export { cb };
