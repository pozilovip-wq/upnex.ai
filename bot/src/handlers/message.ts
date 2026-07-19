import { Telegraf } from "telegraf";
import { getOrCreateLead, updateLead, appendMessages, Lead } from "../db.js";
import { getAiResponse } from "../ai.js";
import { nextStep, STEPS } from "../steps.js";
import { notifyHandoff, notifyNewLead, notifyQualified } from "../handoff.js";

export async function handleMessage(bot: Telegraf, chatId: string, username: string | null, text: string) {
  let lead: Lead = await getOrCreateLead(chatId, username);

  const isNewLead = lead.conversation_history.length === 0;

  if (text === "/start") {
    // Greeting already sent by index.ts — just update DB and notify
    await appendMessages(lead, [{ role: "assistant", content: STEPS[0].prompt }]);
    if (isNewLead) await updateLead(lead.id, { current_step: "full_name" });
    await notifyNewLead(bot, lead);
    return;
  }

  const ai = await getAiResponse(lead, lead.conversation_history, text);

  const patch: Partial<Lead> = {};
  const currentDef = STEPS.find((s) => s.key === lead.current_step);
  if (currentDef?.field && ai.field_value) {
    (patch as any)[currentDef.field] = ai.field_value;
  }

  if (ai.advance_step) {
    patch.current_step = nextStep(lead.current_step).key;
  }

  const updatedLead = { ...lead, ...patch };

  // HOT lead requires: name + country + program collected, none can be "Aniqlanmagan"
  const isReal = (v: string | null | undefined) => !!v && !v.toLowerCase().includes("aniqlanmagan");
  const hasMinInfo = isReal(updatedLead.full_name) && isReal(updatedLead.country) && isReal(updatedLead.program);
  const isHotLead = ai.handoff_requested && hasMinInfo;

  if (isHotLead) {
    patch.status = "handoff";
  } else if (patch.current_step === "done") {
    patch.status = "qualified";
  } else if (lead.status === "new") {
    patch.status = "in_progress";
  }

  if (Object.keys(patch).length > 0) {
    await updateLead(lead.id, patch);
    lead = { ...lead, ...patch };
  }

  await appendMessages(lead, [
    { role: "user", content: text },
    { role: "assistant", content: ai.reply_text },
  ]);

  await bot.telegram.sendMessage(chatId, ai.reply_text);

  if (isHotLead) {
    const ADMIN = process.env.ADMIN_CHAT_ID!;
    // Build Telegram contact link
    const tgLink = lead.telegram_username
      ? `@${lead.telegram_username}`
      : `<a href="tg://user?id=${chatId}">Telegram chatni ochish</a>`;

    // Use AI report if available, otherwise fallback to handoff notify
    const report = ai.admin_report
      ? `${ai.admin_report}\n\n💬 ${tgLink}`
      : null;

    if (report) {
      await bot.telegram.sendMessage(ADMIN, report, { parse_mode: "HTML" });
    } else {
      await notifyHandoff(bot, lead);
    }
  } else if (patch.current_step === "done") {
    await notifyQualified(bot, lead);
  }
}
