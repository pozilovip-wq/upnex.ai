import { Telegraf } from "telegraf";
import { getOrCreateLead, updateLead, appendMessages, Lead } from "../db.js";
import { getAiResponse } from "../ai.js";
import { nextStep, STEPS } from "../steps.js";
import { notifyHandoff, notifyNewLead } from "../handoff.js";
import { syncLeadToCRM } from "../crm-sync.js";

const COUNTRIES = /usa|america|uk|canada|europe|yevropa|angliya|germaniya|koreya|italiya|ispaniya|avstraliya|fransiya|niderlandiya|polsha|chexiya|avstriya|shvetsiya|norwegiya|finlandiya|daniya|portugal/i;
const DEGREES = /bachelor|bakalavr|master|magistr|phd|doktor|foundation|transfer|kollej|college/i;
const CITIES = /toshkent|samarqand|namangan|andijon|farg|buxoro|qashqadaryo|surxon|xorazm|jizzax|sirdaryo|navoiy|fergana/i;
const EDUCATION_LEVELS = /sinf|litsey|kollej bitir|maktab|bakalavr.*kurs|universitet.*kurs|akademik/i;
const MONEY = /\$|\d{3,}|ming|dollar|usd|sum/i;
const TIME = /^\d{1,2}:\d{2}$/;
const NAME_LIKE = /^[a-zA-ZÀ-žА-яёЎўҚқҒғҲҳ'\- ]{2,50}$/u;

function validateFieldValue(field: string, value: string): string | null {
  const v = value.trim();
  if (!v || v.toLowerCase() === "aniqlanmagan") return null;
  if (TIME.test(v)) return null;

  switch (field) {
    case "full_name":
      // Must look like a name — reject countries, cities, degrees, education levels, money
      if (COUNTRIES.test(v) || DEGREES.test(v) || CITIES.test(v) || MONEY.test(v)) return null;
      if (EDUCATION_LEVELS.test(v)) return null;
      if (/^\d+$/.test(v)) return null; // pure number
      if (!NAME_LIKE.test(v)) return null;
      return v;

    case "age":
      // Must be a number between 14 and 60
      const age = parseInt(v.replace(/[^\d]/g, ""));
      if (isNaN(age) || age < 14 || age > 60) return null;
      if (COUNTRIES.test(v) || DEGREES.test(v)) return null;
      return String(age);

    case "country":
      // Must be a country/region — reject degrees, pure numbers, education levels
      if (DEGREES.test(v) && !COUNTRIES.test(v)) return null;
      if (/^\d+$/.test(v)) return null;
      if (EDUCATION_LEVELS.test(v)) return null;
      return v;

    case "program":
      // Must be a degree type — reject countries, cities, semesters, numbers
      if (!DEGREES.test(v)) return null;
      if (/spring|fall|kuz|bahor|\d{4}/i.test(v)) return null;
      return v;

    case "semester":
      // Must contain a year or season word
      if (!/spring|fall|kuz|bahor|yoz|\d{4}|hozir|tez/i.test(v)) return null;
      if (/^\d{4}$/.test(v) && (parseInt(v) < 2024 || parseInt(v) > 2030)) return null;
      return v;

    case "english_level":
      // Must be a language level — reject money, pure country names, degrees
      if (MONEY.test(v) && !/ielts|duolingo|toefl/i.test(v)) return null;
      if (DEGREES.test(v) && !/english|ingliz/i.test(v)) return null;
      if (COUNTRIES.test(v) && !/english|ingliz/i.test(v)) return null;
      if (/^\d{4,}$/.test(v)) return null; // year-like number
      return v;

    case "budget":
      // Must be money-related
      if (!MONEY.test(v) && !/yetarli|kam|ko'p|oz|arzon|qimmat|imkon|bor|yo'q/i.test(v)) return null;
      if (COUNTRIES.test(v) || DEGREES.test(v) || CITIES.test(v)) return null;
      return v;

    case "current_education":
      // Must be an education level — reject money, countries, semesters
      if (MONEY.test(v)) return null;
      if (/spring|fall|\d{4}/i.test(v) && !EDUCATION_LEVELS.test(v)) return null;
      return v;

    case "scholarship":
      // Yes/no type answer
      if (CITIES.test(v) || COUNTRIES.test(v) || /^\d+$/.test(v)) return null;
      return v;

    case "passport":
      // Short yes/no answer — reject semesters, cities, long text
      if (/spring|fall|kuz|bahor|\d{4}/i.test(v)) return null;
      if (v.split(" ").length > 5) return null;
      return v;

    case "previously_applied":
      return v;

    default:
      return v;
  }
}

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
    const validated = validateFieldValue(currentDef.field, ai.field_value);
    if (validated) (patch as any)[currentDef.field] = validated;
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
