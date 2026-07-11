import { Telegraf } from "telegraf";
import { getOrCreateLead, updateLead, appendMessages, Lead } from "../db.js";
import { getAiResponse } from "../ai.js";
import { nextStep, STEPS } from "../steps.js";
import { notifyHandoff, notifyNewLead, notifyQualified } from "../handoff.js";

export async function handleMessage(bot: Telegraf, chatId: string, username: string | null, text: string) {
  let lead: Lead = await getOrCreateLead(chatId, username);

  const isNewLead = lead.conversation_history.length === 0;
  const isReturning = lead.conversation_history.length > 0 && lead.conversation_history.length <= 2 && text === "/start";

  if (isNewLead) {
    await appendMessages(lead, [{ role: "assistant", content: STEPS[0].prompt }]);
    await updateLead(lead.id, { current_step: "full_name" });
    await bot.telegram.sendMessage(chatId, STEPS[0].prompt);
    await notifyNewLead(bot, lead);
    return;
  }

  if (isReturning) {
    await notifyNewLead(bot, lead);
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

  // Minimum required fields before a student can be considered a hot lead
  const updatedLead = { ...lead, ...patch };
  const hasMinInfo = !!(
    updatedLead.full_name &&
    updatedLead.phone &&
    updatedLead.country &&
    updatedLead.program
  );

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
    await notifyHandoff(bot, lead);
  } else if (ai.handoff_requested && !hasMinInfo) {
    // Student wants to apply but hasn't filled minimum info yet — just keep collecting
    await bot.telegram.sendMessage(chatId,
      "Zo'r! Siz bilan bog'lanishimiz uchun avval bir nechta savollarga javob bering 😊"
    );
  } else if (patch.current_step === "done") {
    await notifyQualified(bot, lead);
  }
}
