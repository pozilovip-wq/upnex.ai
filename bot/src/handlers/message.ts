import { Telegraf } from "telegraf";
import { getOrCreateLead, updateLead, appendMessages, Lead } from "../db.js";
import { getAiResponse } from "../ai.js";
import { nextStep, STEPS } from "../steps.js";
import { notifyAdmin } from "../handoff.js";

export async function handleMessage(bot: Telegraf, chatId: string, username: string | null, text: string) {
  let lead: Lead = await getOrCreateLead(chatId, username);

  if (lead.current_step === "greeting" && lead.conversation_history.length === 0) {
    await appendMessages(lead, [{ role: "assistant", content: STEPS[0].prompt }]);
    await updateLead(lead.id, { current_step: "full_name" });
    await bot.telegram.sendMessage(chatId, STEPS[0].prompt);
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

  if (ai.handoff_requested) {
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

  if (ai.handoff_requested) {
    await notifyAdmin(bot, lead);
  }
}
