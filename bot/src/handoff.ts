import { Telegraf } from "telegraf";
import { Lead } from "./db.js";
import { STEPS } from "./steps.js";

// Primary admin for all notifications
const ADMIN = "7241691817";

const FIELD_EMOJI: Record<string, string> = {
  full_name: "👤", age: "🎂", country: "🌍",
  program: "🎓", semester: "📅", current_education: "🏫",
  english_level: "🗣", budget: "💰", scholarship: "🏆",
  passport: "🛂", previously_applied: "📋",
};

const FIELD_LABEL: Record<string, string> = {
  full_name: "Ism", age: "Yosh", country: "Davlat",
  program: "Daraja", semester: "Semester", current_education: "Ta'lim",
  english_level: "Ingliz tili", budget: "Byudjet", scholarship: "Grant",
  passport: "Pasport", previously_applied: "Avval ariza",
};

const COLLECTIBLE_FIELDS = STEPS.filter((s) => s.field).map((s) => s.field!);

function openChatBtn(lead: Lead) {
  return {
    inline_keyboard: [[{
      text: "💬 Open Chat",
      url: `tg://user?id=${lead.telegram_chat_id}`,
    }]],
  };
}

function timestamp(): string {
  return new Date().toLocaleString("uz-UZ", {
    timeZone: "Asia/Tashkent",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function collectedCount(lead: Lead): number {
  return COLLECTIBLE_FIELDS.filter((f) => (lead as any)[f]).length;
}

function leadScore(lead: Lead): number {
  const filled = collectedCount(lead);
  const total = COLLECTIBLE_FIELDS.length;
  let score = Math.round((filled / total) * 60);
  if (lead.country) score += 10;
  if (lead.program) score += 10;
  if (lead.english_level) score += 10;
  if (lead.budget) score += 5;
  if (lead.scholarship) score += 5;
  return Math.min(score, 100);
}

function statusLine(status: string): string {
  const map: Record<string, string> = {
    new: "🟢 New Lead",
    in_progress: "🟡 Collecting Information",
    handoff: "🔥 Hot Lead",
    qualified: "📄 Documents Received",
  };
  return map[status] ?? "🟡 In Progress";
}

function usernameStr(lead: Lead): string {
  return lead.telegram_username ? `@${lead.telegram_username}` : "—";
}

async function send(bot: Telegraf, text: string, lead: Lead) {
  await bot.telegram.sendMessage(ADMIN, text, {
    parse_mode: "HTML",
    reply_markup: openChatBtn(lead),
  });
}

// ── NEW LEAD ────────────────────────────────────────────────────────────────
export async function notifyNewLead(bot: Telegraf, lead: Lead): Promise<void> {
  const text = [
    "🆕 <b>NEW LEAD</b>",
    "",
    `👤 Name: ${lead.full_name ?? "—"}`,
    `📱 Username: ${usernameStr(lead)}`,
    `🆔 Telegram ID: <code>${lead.telegram_chat_id}</code>`,
    `🕒 Time: ${timestamp()}`,
    `🌍 Source: Telegram Bot`,
    "",
    `Status: ${statusLine(lead.status ?? "new")}`,
  ].join("\n");
  await send(bot, text, lead);
}

// ── LIVE UPDATE ─────────────────────────────────────────────────────────────
export async function notifyLeadUpdate(bot: Telegraf, lead: Lead, newFields: string[]): Promise<void> {
  if (!newFields.length) return;

  const filled = collectedCount(lead);
  const total = COLLECTIBLE_FIELDS.length;
  const score = leadScore(lead);

  const fieldLines = newFields
    .filter((f) => (lead as any)[f])
    .map((f) => `${FIELD_EMOJI[f] ?? "•"} ${FIELD_LABEL[f] ?? f}: ${(lead as any)[f]}`);

  const text = [
    "✅ <b>Lead Updated</b>",
    "",
    `👤 Name: ${lead.full_name ?? "—"}`,
    `📱 Username: ${usernameStr(lead)}`,
    `🆔 ID: <code>${lead.telegram_chat_id}</code>`,
    `🕒 Time: ${timestamp()}`,
    "",
    ...fieldLines,
    "",
    `Progress: ${filled} / ${total} fields collected`,
    `📊 Lead Score: ${score}/100`,
    `Status: ${statusLine(lead.status ?? "in_progress")}`,
  ].join("\n");

  await send(bot, text, lead);
}

// ── HOT LEAD ────────────────────────────────────────────────────────────────
export async function notifyHandoff(bot: Telegraf, lead: Lead): Promise<void> {
  const score = leadScore(lead);
  const filled = COLLECTIBLE_FIELDS
    .filter((f) => (lead as any)[f])
    .map((f) => `${FIELD_EMOJI[f] ?? "•"} ${FIELD_LABEL[f] ?? f}: ${(lead as any)[f]}`)
    .join("\n");

  const text = [
    "🔥 <b>HOT LEAD</b>",
    "",
    `👤 Name: ${lead.full_name ?? "—"}`,
    `📱 Username: ${usernameStr(lead)}`,
    `🆔 ID: <code>${lead.telegram_chat_id}</code>`,
    `🕒 Time: ${timestamp()}`,
    "",
    filled || "ℹ️ Ma'lumotlar to'planmoqda",
    "",
    `📊 Lead Score: ${score}/100`,
    "",
    "🧠 AI Summary:",
    "Talaba ariza topshirishga tayyor. Tezkor muloqot tavsiya etiladi.",
    "",
    "⚡ Recommended Action:",
    "Contact within 15 minutes.",
    "",
    `Status: 🔥 Hot Lead`,
  ].join("\n");

  await send(bot, text, lead);
}

// ── QUALIFIED ───────────────────────────────────────────────────────────────
export async function notifyQualified(bot: Telegraf, lead: Lead): Promise<void> {
  const score = leadScore(lead);
  const filled = COLLECTIBLE_FIELDS
    .filter((f) => (lead as any)[f])
    .map((f) => `${FIELD_EMOJI[f] ?? "•"} ${FIELD_LABEL[f] ?? f}: ${(lead as any)[f]}`)
    .join("\n");

  const text = [
    "📄 <b>Lead Qualified — All Info Collected</b>",
    "",
    `👤 Name: ${lead.full_name ?? "—"}`,
    `📱 Username: ${usernameStr(lead)}`,
    `🕒 Time: ${timestamp()}`,
    "",
    filled,
    "",
    `📊 Lead Score: ${score}/100`,
    `Status: 📄 Documents Received`,
  ].join("\n");

  await send(bot, text, lead);
}
