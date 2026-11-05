export interface StepDef {
  key: string;
  field: string | null;
  prompt: string;
  options?: string[];
}

/**
 * Questions the bot actively ASKS, in order.
 * Kept short on purpose: every extra question loses leads.
 * Fields not listed here (age, scholarship, passport, previously_applied)
 * are still saved whenever the student mentions them — they're just never asked.
 *
 * The welcome message asks about school + city, so the first real step is
 * current_education (previously it was full_name, which made 387 leads stall).
 */
export const STEPS: StepDef[] = [
  {
    key: "greeting",
    field: null,
    prompt:
      "Assalomu alaykum, Upnex jamoasidan! 👋\nAmerika🇺🇸, Yevropa🇪🇺 va Osiyo🌏 universitetlariga hujjat topshirish, grant va viza bo'yicha yordam beramiz.\n\nBoshlash uchun: hozir maktab, litsey, kollej yoki universitetda o'qiysizmi? Qaysi shahardansiz? 😊",
  },
  { key: "current_education", field: "current_education", prompt: "Hozir qayerda o'qiysiz yoki nimani tugatgansiz?" },
  { key: "country", field: "country", prompt: "Qaysi davlatda o'qishni xohlaysiz?", options: ["USA", "Europe", "Asia", "Not sure"] },
  { key: "program", field: "program", prompt: "Bakalavrmi yoki magistratura?", options: ["Bachelor's", "Master's", "Transfer", "English Course"] },
  { key: "english_level", field: "english_level", prompt: "Ingliz tilingiz qay darajada? Sertifikat bormi?" },
  { key: "semester", field: "semester", prompt: "Qachondan o'qishni boshlamoqchisiz?", options: ["Spring 2027", "Fall 2027", "Not sure"] },
  { key: "full_name", field: "full_name", prompt: "Ismingiz va familiyangiz?" },
  { key: "budget", field: "budget", prompt: "Yiliga taxminan qancha mablag' ajrata olasiz?" },
  { key: "summary", field: null, prompt: "SUMMARY" },
  { key: "done", field: null, prompt: "DONE" },
];

/** Every lead field the bot stores (asked or volunteered). Used for admin reports. */
export const ALL_FIELDS = [
  "full_name", "age", "country", "program", "semester", "current_education",
  "english_level", "budget", "scholarship", "passport", "previously_applied",
] as const;

export function stepIndex(key: string): number {
  const i = STEPS.findIndex((s) => s.key === key);
  return i === -1 ? 0 : i;
}

export function nextStep(key: string): StepDef {
  const i = stepIndex(key);
  return STEPS[Math.min(i + 1, STEPS.length - 1)];
}

/**
 * The step the bot should be on, derived from what's actually filled in.
 * Skips anything the student already answered, and handles old step keys
 * (age, passport, scholarship…) from before this version.
 */
export function currentStepFor(lead: Record<string, any>): StepDef {
  if (lead.current_step === "done") return STEPS[STEPS.length - 1];
  const missing = STEPS.find((s) => s.field && !lead[s.field]);
  return missing ?? STEPS.find((s) => s.key === "summary")!;
}

/** 0–100. Higher = closer to signing. Written to leads.lead_score. */
export function computeLeadScore(lead: Record<string, any>, hot = false): number {
  let score = 0;
  const has = (f: string) => !!lead[f] && !String(lead[f]).toLowerCase().includes("aniqlanmagan");
  if (has("current_education")) score += 10;
  if (has("country")) score += 10;
  if (has("program")) score += 10;
  if (has("english_level")) score += 10;
  if (has("semester")) score += 10;
  if (has("full_name")) score += 10;
  if (has("budget")) score += 10;
  if (/usa|amerika|aqsh|америк/i.test(lead.country ?? "")) score += 5;
  if (/spring\s*2027|2027\s*bahor|bahor|hozir/i.test(lead.semester ?? "")) score += 5;
  if (/ielts|duolingo|toefl|b2|c1|good/i.test(lead.english_level ?? "")) score += 5;
  if (lead.status === "handoff" || hot) score += 15;
  return Math.min(score, 100);
}

export const REQUIRED_FIELDS = STEPS.map((s) => s.field).filter((f): f is string => !!f);
