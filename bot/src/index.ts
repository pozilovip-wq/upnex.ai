import "dotenv/config";
import { Telegraf } from "telegraf";
import { handleMessage } from "./handlers/message.js";

const requiredEnv = ["TELEGRAM_BOT_TOKEN", "OPENAI_API_KEY", "SUPABASE_URL", "SUPABASE_KEY"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

bot.start(async (ctx) => {
  await handleMessage(bot, String(ctx.chat.id), ctx.from?.username ?? null, "/start");
});

bot.on("text", async (ctx) => {
  try {
    await handleMessage(bot, String(ctx.chat.id), ctx.from?.username ?? null, ctx.message.text);
  } catch (err) {
    console.error("Error handling message:", err);
    await ctx.reply("Kechirasiz, biroz muammo bo'ldi. Birozdan keyin qayta yozing 🙏");
  }
});

bot.launch();
console.log("Upnex bot is running...");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
