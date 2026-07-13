import "dotenv/config";
import { Telegraf } from "telegraf";
import { handleMessage } from "./handlers/message.js";
import { handleOwnerMessage, registerOwnerHandlers } from "./handlers/owner.js";
import { isOwner } from "./owners.js";
import { STEPS } from "./steps.js";
import { notifyNewLead } from "./handoff.js";
import { sendDailyReport, sendWeeklyReport } from "./dashboard.js";

const requiredEnv = ["TELEGRAM_BOT_TOKEN", "OPENAI_API_KEY", "SUPABASE_URL", "SUPABASE_KEY"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

// Register owner-only commands (/stats, /week, /today, /all, /mystats)
registerOwnerHandlers(bot);

bot.start(async (ctx) => {
  const chatId = String(ctx.chat.id);
  try {
    if (isOwner(chatId)) {
      await ctx.reply(
        "👋 Salom! Bu Upnex hisobot panelidir.\n\n" +
        "Daromad qo'shish uchun shunchaki yozing:\n" +
        "\"Jasur dan $500 oldim, visa\"\n\n" +
        "Barcha buyruqlar: /ownerhelp"
      );
      return;
    }
    await ctx.reply(STEPS[0].prompt);
    // notify admin about this user (fire and forget)
    handleMessage(bot, chatId, ctx.from?.username ?? null, "/start").catch(() => {});
  } catch (err) {
    console.error("Start error:", err);
    try { await ctx.reply("Kechirasiz, biroz muammo bo'ldi. Birozdan keyin qayta yozing 🙏"); } catch {}
  }
});

bot.on("text", async (ctx) => {
  const chatId = String(ctx.chat.id);
  try {
    if (isOwner(chatId)) {
      await handleOwnerMessage(bot, chatId, ctx.message.text);
      return;
    }
    await handleMessage(bot, chatId, ctx.from?.username ?? null, ctx.message.text);
  } catch (err) {
    console.error("Message error:", err);
    try {
      if (isOwner(chatId)) {
        await ctx.reply("⚠️ Xatolik yuz berdi. Qayta urinib ko'ring.");
      } else {
        await ctx.reply("Kechirasiz, biroz muammo bo'ldi. Birozdan keyin qayta yozing 🙏");
      }
    } catch {}
  }
});

// Prevent unhandled rejections from crashing the process
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

bot.launch();
console.log("Upnex bot is running...");

// ─── Scheduled reports ───────────────────────────────────────────────────────
function scheduleAt(hour: number, minute: number, fn: () => void) {
  function next() {
    const now = new Date();
    const target = new Date();
    target.setHours(hour, minute, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    setTimeout(() => { fn(); next(); }, target.getTime() - now.getTime());
  }
  next();
}

// Daily report at 09:00 Tashkent (UTC+5 = 04:00 UTC)
scheduleAt(4, 0, () => sendDailyReport(bot).catch(console.error));

// Weekly report every Monday at 09:00 Tashkent
scheduleAt(4, 5, () => {
  if (new Date().getDay() === 1) sendWeeklyReport(bot).catch(console.error);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
