import { Telegraf } from "telegraf";
import { getOrCreateLead, updateLead, appendMessages, Lead } from "../db.js";
import { getAiResponse } from "../ai.js";
import { nextStep, STEPS } from "../steps.js";
import { notifyHandoff, notifyNewLead } from "../handoff.js";
import { syncLeadToCRM } from "../crm-sync.js";

export async function handleMessage(bot: Telegraf, chatId: string, username: string | null, text: string) {
  let lead: Lead = await getOrCreateLead(chatId, username);

  const isNewLead = lead.conversation_history.length === 0;

  if (text === "/start") {
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

  const isReal = (v: string | null | undefined) => !!v && !v.toLowerCase().includes("aniqlanmagan");
  const hasMinInfo = isReal(updatedLead.full_name) && isReal(updatedLead.country) && isReal(updatedLead.program);
  const isHotLead = ai.handoff_requested && hasMinInfo;

  if (isHotLead) {
    patch.status = "handoff";
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
  }

  // Sync every lead update to CRM (fire-and-forget)
  syncLeadToCRM({ ...lead, ...patch }).catch(() => {});
}
