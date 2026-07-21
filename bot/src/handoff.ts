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

// ── HIGH-VALUE LEAD ANALYSIS ─────────────────────────────────────────────────
interface HVAnalysis {
  highlights: string[];
  priority: "VIP" | "HIGH" | "NORMAL" | "LOW";
  recommendation: string;
}

function analyzeHighValue(lead: Lead): HVAnalysis {
  const highlights: string[] = [];
  const eng = (lead.english_level ?? "").toLowerCase();
  const budget = (lead.budget ?? "").toLowerCase();
  const semester = (lead.semester ?? "").toLowerCase();
  const scholarship = (lead.scholarship ?? "").toLowerCase();

  // English / certificates
  if (/ielts\s*[7-9]/.test(eng)) highlights.push("🎓 IELTS 7.0+");
  else if (/ielts\s*6/.test(eng)) highlights.push("🎓 IELTS 6.0+");
  else if (/ielts/.test(eng)) highlights.push("🎓 IELTS");
  if (/toefl/i.test(eng)) highlights.push("📚 TOEFL");
  if (/sat/i.test(eng + (lead.program ?? ""))) highlights.push("🎯 SAT");
  if (/duolingo/i.test(eng)) highlights.push("🎓 Duolingo");
  if (/c1|c2/.test(eng)) highlights.push("🌍 C1/C2 English");
  else if (/b2/.test(eng)) highlights.push("🌍 B2 English");

  // Budget
  const budgetNum = parseInt(budget.replace(/[^0-9]/g, ""), 10);
  if (!isNaN(budgetNum) && budgetNum >= 5000) highlights.push("💰 High Budget ($5k+)");
  else if (!isNaN(budgetNum) && budgetNum >= 2000) highlights.push("💰 Good Budget ($2k+)");

  // Semester readiness
  if (/spring 2027|fall 2027/i.test(semester)) highlights.push("🚀 Ready — Spring/Fall 2027");

  // Scholarship interest
  if (/ha|yes|100%|grant/i.test(scholarship)) highlights.push("⭐ Grant/Scholarship interested");

  // Passport
  if (/ha|yes|bor/i.test(lead.passport ?? "")) highlights.push("📄 Passport Ready");

  // Priority
  let priority: HVAnalysis["priority"] = "LOW";
  if (highlights.length >= 4) priority = "VIP";
  else if (highlights.length >= 2) priority = "HIGH";
  else if (highlights.length >= 1) priority = "NORMAL";

  // Recommendation
  let recommendation = "💡 Needs more qualification.";
  if (priority === "VIP") recommendation = "💡 Excellent scholarship candidate. Immediate follow-up!";
  else if (highlights.some(h => /IELTS 7|C1|C2/.test(h))) recommendation = "💡 Strong admission profile. High conversion potential.";
  else if (highlights.some(h => /Budget/.test(h))) recommendation = "💡 Likely Premium client. Recommend immediate follow-up.";
  else if (priority === "HIGH") recommendation = "💡 Good academic profile. High conversion potential.";
  else if (priority === "NORMAL") recommendation = "💡 Average profile. Continue qualifying.";

  return { highlights, priority, recommendation };
}

function hvBlock(lead: Lead): string {
  const { highlights, priority, recommendation } = analyzeHighValue(lead);
  if (!highlights.length) return "";

  const priorityLine: Record<string, string> = {
    VIP:    "🔴 VIP PRIORITY — Exceptional profile",
    HIGH:   "🟠 HIGH PRIORITY — Strong candidate",
    NORMAL: "🟡 NORMAL PRIORITY — Average profile",
    LOW:    "⚪ LOW PRIORITY — Needs more qualification",
  };

  return [
    "",
    "─────────────────────",
    "⭐ <b>HIGH-VALUE LEAD</b>",
    `Reason:`,
    ...highlights.map(h => `✅ ${h}`),
    "",
    priorityLine[priority],
    "",
    `AI Recommendation:`,
    recommendation,
  ].join("\n");
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
  await send(bot, text + hvBlock(lead), lead);
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

  await send(bot, text + hvBlock(lead), lead);
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

  await send(bot, text + hvBlock(lead), lead);
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

  await send(bot, text + hvBlock(lead), lead);
}
