import { Telegraf } from "telegraf";
import { Lead } from "./db.js";
import { STEPS } from "./steps.js";

const ADMIN = process.env.ADMIN_CHAT_ID!;

function leadSummary(lead: Lead): string {
  return STEPS
    .filter((s) => s.field && (lead as any)[s.field!])
    .map((s) => `${fieldEmoji(s.field!)} ${fieldLabel(s.field!)}: ${(lead as any)[s.field!]}`)
    .join("\n");
}

function fieldEmoji(field: string): string {
  const map: Record<string, string> = {
    full_name: "👤", age: "🎂", phone: "📞", country: "🌍",
    program: "🎓", semester: "📅", current_education: "🏫",
    english_level: "🗣", budget: "💰", scholarship: "🏆",
    passport: "🛂", previously_applied: "📋",
  };
  return map[field] ?? "•";
}

function fieldLabel(field: string): string {
  const map: Record<string, string> = {
    full_name: "Ism", age: "Yosh", phone: "Telefon", country: "Davlat",
    program: "Daraja", semester: "Semester", current_education: "Ta'lim",
    english_level: "Ingliz tili", budget: "Byudjet", scholarship: "Grant",
    passport: "Pasport", previously_applied: "Avval ariza",
  };
  return map[field] ?? field;
}

function userLink(lead: Lead): string {
  if (lead.telegram_username) return `@${lead.telegram_username}`;
  return `<a href="tg://user?id=${lead.telegram_chat_id}">${lead.full_name ?? "Talaba"}</a>`;
}

function contactLine(lead: Lead): string {
  const parts = [];
  if (lead.full_name) parts.push(`👤 ${lead.full_name}`);
  if (lead.telegram_username) parts.push(`📱 @${lead.telegram_username}`);
  if (lead.phone) parts.push(`📞 ${lead.phone}`);
  parts.push(`💬 <a href="tg://user?id=${lead.telegram_chat_id}">Telegram chatni ochish</a>`);
  return parts.join("\n");
}

// Called when student is ready to apply
export async function notifyHandoff(bot: Telegraf, lead: Lead): Promise<void> {
  if (!ADMIN) return;
  const text = [
    "🔥 HOT LEAD — Ariza topshirishga tayyor!",
    "",
    contactLine(lead),
    "",
    leadSummary(lead),
  ].join("\n");
  await bot.telegram.sendMessage(ADMIN, text, { parse_mode: "HTML" });
}

// Called when a new student starts chatting for the first time
export async function notifyNewLead(bot: Telegraf, lead: Lead): Promise<void> {
  if (!ADMIN) return;
  const text = `🆕 Yangi talaba botga yozdi!\n\n${contactLine(lead)}\n\nBot suhbatni boshlamoqda...`;
  await bot.telegram.sendMessage(ADMIN, text, { parse_mode: "HTML" });
}

// Called when lead becomes qualified (all info collected)
export async function notifyQualified(bot: Telegraf, lead: Lead): Promise<void> {
  if (!ADMIN) return;
  const text = [
    "✅ Lead to'liq ma'lumot berdi!",
    "",
    contactLine(lead),
    "",
    leadSummary(lead),
  ].join("\n");
  await bot.telegram.sendMessage(ADMIN, text, { parse_mode: "HTML" });
}
