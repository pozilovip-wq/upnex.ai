import { Telegraf } from "telegraf";
import { parseTransaction, saveTransaction, getStats, getServiceBreakdown, formatStats } from "../accounting.js";
import { ownerName } from "../owners.js";
import { buildDailyReport, buildWeeklyReport, buildHotLeadsList, buildUnansweredList } from "../dashboard.js";

const SERVICE_LABELS: Record<string, string> = {
  admission: "🎓 Qabul",
  visa: "🛂 Viza",
  sop_essay: "📝 SOP/Essay",
  translation: "📄 Tarjima",
  accommodation: "🏠 Turar joy",
  consultation: "💬 Konsultatsiya",
  other: "📦 Boshqa",
};

export function registerOwnerHandlers(bot: Telegraf) {
  // /stats - full report
  bot.command("stats", async (ctx) => {
    const rows = await getStats("month");
    await ctx.reply(formatStats(rows, "Bu oy"));
  });

  // /week - weekly report
  bot.command("week", async (ctx) => {
    const rows = await getStats("week");
    await ctx.reply(formatStats(rows, "Bu hafta"));
  });

  // /today - today report
  bot.command("today", async (ctx) => {
    const rows = await getStats("today");
    await ctx.reply(formatStats(rows, "Bugun"));
  });

  // /all - all time report
  bot.command("all", async (ctx) => {
    const rows = await getStats("all");
    await ctx.reply(formatStats(rows, "Barcha vaqt"));
  });

  // /mystats - personal breakdown by service
  bot.command("mystats", async (ctx) => {
    const chatId = String(ctx.chat.id);
    const breakdown = await getServiceBreakdown(chatId, "month");
    if (!Object.keys(breakdown).length) {
      await ctx.reply("📊 Bu oy hech qanday daromad kiritilmagan.");
      return;
    }
    const lines = [`📊 @${ownerName(chatId)} — bu oylik xizmat bo'yicha:`, ""];
    for (const [service, total] of Object.entries(breakdown)) {
      const label = SERVICE_LABELS[service.split(" ")[0]] ?? service;
      lines.push(`${label}: ${total.toLocaleString()}`);
    }
    await ctx.reply(lines.join("\n"));
  });

  // /help - owner commands list
  bot.command("ownerhelp", async (ctx) => {
    await ctx.reply(
      "👑 UPNEX CEO DASHBOARD\n\n" +
      "📊 LEAD HISOBOTLARI:\n" +
      "\"Kunlik hisobot\" — bugungi lead statistikasi\n" +
      "\"Haftalik hisobot\" — 7 kunlik umumiy hisobot\n" +
      "\"Hot leadlar\" — barcha hot leadlar ro'yxati\n" +
      "\"Javob berilmagan\" — 3+ soat kutayotgan leadlar\n\n" +
      "💰 MOLIYAVIY HISOBOT:\n" +
      "/today — bugungi daromad\n" +
      "/week — haftalik daromad\n" +
      "/stats — oylik daromad\n" +
      "/all — barcha vaqt\n" +
      "/mystats — shaxsiy hisobot\n\n" +
      "💰 DAROMAD QO'SHISH:\n" +
      "\"Jasur dan $500 oldim, visa\"\n" +
      "\"$300 SOP yozish Malika\"\n\n" +
      "📅 AVTOMATIK HISOBOTLAR:\n" +
      "• Har kuni 09:00 — kunlik hisobot\n" +
      "• Har dushanba 09:00 — haftalik hisobot\n" +
      "• HOT lead kelganda — darhol xabar\n"
    );
  });
}

function isCeoCommand(text: string): boolean {
  const t = text.toLowerCase();
  return /hot lead|kunlik|haftalik|bugungi statistika|javob berilmagan|follow.up|muammo|warm lead|cold lead|lead ko.rsat|leads|dashboard|hisobot/.test(t);
}

async function handleCeoCommand(bot: Telegraf, chatId: string, text: string) {
  const t = text.toLowerCase();

  if (/hot lead/i.test(t)) {
    await bot.telegram.sendMessage(chatId, await buildHotLeadsList());
  } else if (/javob berilmagan|kutmoqda|unanswered/i.test(t)) {
    await bot.telegram.sendMessage(chatId, await buildUnansweredList());
  } else if (/haftalik|weekly|7 kun/i.test(t)) {
    await bot.telegram.sendMessage(chatId, await buildWeeklyReport());
  } else if (/kunlik|bugungi statistika|daily/i.test(t)) {
    await bot.telegram.sendMessage(chatId, await buildDailyReport());
  } else if (/hisobot|dashboard/i.test(t)) {
    await bot.telegram.sendMessage(chatId, await buildDailyReport());
  } else {
    // fallback: send daily report
    await bot.telegram.sendMessage(chatId, await buildDailyReport());
  }
}

function isStatsQuestion(text: string): boolean {
  const t = text.toLowerCase();
  return /stats|daromad|income|earn|topd|today|week|month|oy|barcha|all|how much|qancha|summary|split|kim ko|ko.proq/.test(t);
}

async function handleStatsQuestion(bot: Telegraf, chatId: string, text: string) {
  const t = text.toLowerCase();
  let rows;
  let label;

  if (/today|bugun/.test(t)) { rows = await getStats("today"); label = "Bugun"; }
  else if (/week|hafta/.test(t)) { rows = await getStats("week"); label = "Bu hafta"; }
  else if (/all|barcha|ever/.test(t)) { rows = await getStats("all"); label = "Barcha vaqt"; }
  else { rows = await getStats("month"); label = "Bu oy"; }

  await bot.telegram.sendMessage(chatId, formatStats(rows, label));
}

export async function handleOwnerMessage(bot: Telegraf, chatId: string, text: string): Promise<boolean> {
  // CEO dashboard commands
  if (isCeoCommand(text)) {
    await handleCeoCommand(bot, chatId, text);
    return true;
  }

  // Accounting stats
  if (isStatsQuestion(text)) {
    await handleStatsQuestion(bot, chatId, text);
    return true;
  }

  // Try to parse as a transaction
  const parsed = await parseTransaction(text);
  if (!parsed || !parsed.amount) {
    await bot.telegram.sendMessage(chatId,
      "❓ Tushunmadim. Daromad kiritish uchun:\n\"Jasur dan $500 oldim, visa\"\n\nHisobot uchun: /stats"
    );
    return true;
  }

  await saveTransaction(chatId, parsed, text);

  const serviceLabel = SERVICE_LABELS[parsed.service] ?? parsed.service;
  const reply = [
    "✅ Daromad kiritildi!",
    "",
    `💰 Summa: ${parsed.amount.toLocaleString()} ${parsed.currency}`,
    `${serviceLabel}`,
    parsed.student_name ? `👤 Talaba: ${parsed.student_name}` : "",
    parsed.note ? `📝 Izoh: ${parsed.note}` : "",
    "",
    "Umumiy hisobot uchun /stats yozing 📊",
  ].filter(Boolean).join("\n");

  await bot.telegram.sendMessage(chatId, reply);
  return true;
}
