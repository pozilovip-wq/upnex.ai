import { Telegraf } from "telegraf";
import { parseTransaction, saveTransaction, getStats, getServiceBreakdown, formatStats } from "../accounting.js";
import { ownerName } from "../owners.js";

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
      "💼 Upnex Hisobot Bot — Buyruqlar:\n\n" +
      "💰 Daromad qo'shish uchun shunchaki yozing:\n" +
      "   \"Jasur dan $500 oldim, visa\"\n" +
      "   \"$300 SOP yozish uchun Malika\"\n" +
      "   \"2 mln so'm qabul xizmati\"\n\n" +
      "/stats — bu oylik umumiy hisobot\n" +
      "/week — bu haftalik hisobot\n" +
      "/today — bugungi hisobot\n" +
      "/all — barcha vaqt hisoboti\n" +
      "/mystats — mening xizmatlar bo'yicha hisobotim\n"
    );
  });
}

function isStatsQuestion(text: string): boolean {
  const t = text.toLowerCase();
  return /stats|hisobot|daromad|income|earn|topd|hafta|bugun|today|week|month|oy|barcha|all|how much|qancha|summary|split|kim ko|ko.proq/.test(t);
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
  // Check if it's a stats/income question first
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
