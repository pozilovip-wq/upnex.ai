import { createClient } from "@supabase/supabase-js";
import { Telegraf } from "telegraf";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
const OWNERS = (process.env.ADMIN_CHAT_ID ?? "7456490129").split(",");

function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function weekAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function monthAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString();
}

// ─── Lead stats from Supabase ───────────────────────────────────────────────

async function getLeadStats(since: string) {
  const { data } = await supabase
    .from("leads")
    .select("status, country, program, created_at")
    .gte("created_at", since);

  const leads = data ?? [];
  const hot = leads.filter((l) => l.status === "handoff").length;
  const warm = leads.filter((l) => l.status === "in_progress").length;
  const cold = leads.filter((l) => l.status === "new").length;
  const qualified = leads.filter((l) => l.status === "qualified").length;

  const countries: Record<string, number> = {};
  for (const l of leads) {
    if (l.country) countries[l.country] = (countries[l.country] ?? 0) + 1;
  }
  const topCountries = Object.entries(countries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return { total: leads.length, hot, warm, cold, qualified, topCountries };
}

async function getHotLeads() {
  const { data } = await supabase
    .from("leads")
    .select("full_name, telegram_username, telegram_chat_id, country, program, english_level, created_at")
    .eq("status", "handoff")
    .order("created_at", { ascending: false })
    .limit(10);
  return data ?? [];
}

async function getUnansweredHot() {
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("leads")
    .select("full_name, telegram_username, telegram_chat_id, created_at")
    .eq("status", "handoff")
    .lte("created_at", threeHoursAgo);
  return data ?? [];
}

// ─── Report formatters ───────────────────────────────────────────────────────

export async function buildDailyReport(): Promise<string> {
  const stats = await getLeadStats(today());
  const unanswered = await getUnansweredHot();

  const flag = (c: string) => {
    if (/usa|aqsh|ameri/i.test(c)) return "🇺🇸";
    if (/uk|britan/i.test(c)) return "🇬🇧";
    if (/german/i.test(c)) return "🇩🇪";
    if (/korea/i.test(c)) return "🇰🇷";
    if (/chin/i.test(c)) return "🇨🇳";
    if (/europ|yevropa/i.test(c)) return "🇪🇺";
    return "🌍";
  };

  const d = new Date();
  const dateStr = `${d.getDate()}-${d.toLocaleString("uz", { month: "long" })}, ${d.getFullYear()}`;

  const lines = [
    `📊 UPNEX — KUNLIK HISOBOT`,
    `📅 ${dateStr}`,
    ``,
    `👥 Jami yangi murojaatlar: ${stats.total}`,
    `🔥 Hot leadlar: ${stats.hot}`,
    `🟡 Warm leadlar: ${stats.warm}`,
    `❄️ Cold leadlar: ${stats.cold}`,
    `✅ Qualified: ${stats.qualified}`,
    ``,
  ];

  if (stats.topCountries.length) {
    lines.push(`🌍 Eng ko'p qiziqish:`);
    for (const [country, count] of stats.topCountries) {
      lines.push(`${flag(country)} ${country} — ${count} ta`);
    }
    lines.push(``);
  }

  lines.push(`🧠 AI XULOSASI:`);
  lines.push(`Bugun ${stats.total} ta murojaat keldi. ${stats.hot} ta HOT lead aniqlandi.`);
  if (stats.hot > 0) lines.push(`HOT leadlar bilan imkon boricha tezroq bog'laning.`);

  if (unanswered.length) {
    lines.push(``);
    lines.push(`⚠️ E'TIBOR TALAB QILADI:`);
    for (const u of unanswered) {
      const name = u.full_name ?? u.telegram_username ?? "Noma'lum";
      lines.push(`🔥 ${name} — 3+ soatdan beri javob kutmoqda`);
    }
  }

  return lines.join("\n");
}

export async function buildWeeklyReport(): Promise<string> {
  const stats = await getLeadStats(weekAgo());
  const prevStats = await getLeadStats(monthAgo());

  const d = new Date();
  const lines = [
    `📈 UPNEX — HAFTALIK HISOBOT`,
    `📅 Oxirgi 7 kun`,
    ``,
    `👥 Jami murojaatlar: ${stats.total}`,
    `🔥 Hot: ${stats.hot} | 🟡 Warm: ${stats.warm} | ❄️ Cold: ${stats.cold}`,
    ``,
    `🌍 Eng mashhur yo'nalishlar:`,
  ];

  for (const [country, count] of stats.topCountries) {
    lines.push(`  ${country} — ${count} ta`);
  }

  lines.push(``);
  lines.push(`🧠 AI TAVSIYA:`);
  lines.push(`Hafta davomida ${stats.hot} ta HOT lead aniqlandi. Konversiya oshirish uchun HOT leadlarga 30 daqiqa ichida javob bering.`);

  return lines.join("\n");
}

export async function buildHotLeadsList(): Promise<string> {
  const leads = await getHotLeads();
  if (!leads.length) return "🔥 Hozircha HOT lead yo'q.";

  const lines = [`🔥 AKTIV HOT LEADLAR (${leads.length} ta)`, ``];
  for (const l of leads) {
    const name = l.full_name ?? l.telegram_username ?? "Noma'lum";
    const link = l.telegram_chat_id ? `tg://user?id=${l.telegram_chat_id}` : "";
    lines.push(`👤 ${name} — ${l.country ?? "?"} | ${l.program ?? "?"} | ${l.english_level ?? "?"}`);
    if (link) lines.push(`💬 ${link}`);
    lines.push(``);
  }
  return lines.join("\n");
}

export async function buildUnansweredList(): Promise<string> {
  const leads = await getUnansweredHot();
  if (!leads.length) return "✅ Barcha HOT leadlarga javob berilgan.";

  const lines = [`⚠️ JAVOB KUTAYOTGAN HOT LEADLAR`, ``];
  for (const l of leads) {
    const name = l.full_name ?? l.telegram_username ?? "Noma'lum";
    const hours = Math.floor((Date.now() - new Date(l.created_at).getTime()) / 3600000);
    lines.push(`🔥 ${name} — ${hours} soatdan beri kutmoqda`);
    if (l.telegram_chat_id) lines.push(`💬 tg://user?id=${l.telegram_chat_id}`);
    lines.push(``);
  }
  return lines.join("\n");
}

// ─── Send to all owners ──────────────────────────────────────────────────────

export async function notifyOwners(bot: Telegraf, message: string) {
  for (const id of OWNERS) {
    try {
      await bot.telegram.sendMessage(id.trim(), message);
    } catch (e) {
      console.error(`Failed to notify owner ${id}:`, e);
    }
  }
}

// ─── Daily auto-report (call this on schedule) ───────────────────────────────

export async function sendDailyReport(bot: Telegraf) {
  const report = await buildDailyReport();
  await notifyOwners(bot, report);
}

export async function sendWeeklyReport(bot: Telegraf) {
  const report = await buildWeeklyReport();
  await notifyOwners(bot, report);
}
