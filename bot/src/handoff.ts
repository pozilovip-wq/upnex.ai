import { Telegraf } from "telegraf";
import { Lead } from "./db.js";
import { STEPS } from "./steps.js";

export async function notifyAdmin(bot: Telegraf, lead: Lead): Promise<void> {
  const adminChatId = process.env.ADMIN_CHAT_ID;
  if (!adminChatId) return;

  const fields = STEPS
    .filter((s) => s.field)
    .map((s) => `${s.field}: ${(lead as any)[s.field!] ?? "—"}`)
    .join("\n");

  const text = [
    "🔥 Lead is ready for handoff!",
    `Telegram: @${lead.telegram_username ?? "unknown"} (chat_id: ${lead.telegram_chat_id})`,
    "",
    fields,
  ].join("\n");

  await bot.telegram.sendMessage(adminChatId, text);
}
