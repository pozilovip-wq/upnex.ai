export interface StepDef {
  key: string;
  field: string | null;
  prompt: string;
  options?: string[];
}

export const STEPS: StepDef[] = [
  {
    key: "greeting",
    field: null,
    prompt:
      "Assalomu alaykum Upnex jamoasidan! 👋\nBiz talabalarga Amerika🇺🇸, Yevropa🇪🇺 va Osiyo🌏 davlatlarida o'qish, 100% gacha grant va viza tayyorgarligi bo'yicha yordam beramiz✅\n\nO'ziz haqingizda qisqacha ma'lumot bersangiz:\n🎓 Hozir maktab, litsey, kollej yoki universitetda o'qiysizmi?\n📍 Qaysi shahardansiz?\n\nMa'lumotlaringizni kutamiz 😊",
  },
  { key: "full_name", field: "full_name", prompt: "Ismingiz va familiyangiz?" },
  { key: "age", field: "age", prompt: "Yoshingiz nechida?" },
  {
    key: "country",
    field: "country",
    prompt: "Qaysi davlatda o'qishni xohlaysiz?",
    options: ["USA", "Canada", "UK", "Europe", "Asia", "Not sure"],
  },
  {
    key: "program",
    field: "program",
    prompt: "Qaysi daraja qizitiradi?",
    options: ["Bachelor's", "Master's", "Transfer", "Community College", "English Course"],
  },
  {
    key: "semester",
    field: "semester",
    prompt: "Qaysi semestrdan o'qishni boshlamoqchisiz?",
    options: ["Spring 2027", "Fall 2027", "Not sure"],
  },
  {
    key: "current_education",
    field: "current_education",
    prompt: "Hozirgi ta'lim darajangiz qanday?",
    options: ["High School", "Academic Lyceum", "College", "Bachelor's Degree", "Master's Degree"],
  },
  {
    key: "english_level",
    field: "english_level",
    prompt: "Ingliz tili darajangiz qanday?",
    options: ["No IELTS", "IELTS", "Duolingo", "TOEFL", "Good English", "Beginner"],
  },
  { key: "budget", field: "budget", prompt: "Yiliga taxminan qancha mablag' sarflashga tayyorsiz?" },
  { key: "scholarship", field: "scholarship", prompt: "Stipendiya (scholarship) olishni xohlaysizmi?" },
  { key: "passport", field: "passport", prompt: "Pasportingiz bormi?" },
  {
    key: "previously_applied",
    field: "previously_applied",
    prompt: "Ilgari biror universitetga ariza topshirganmisiz?",
  },
  { key: "summary", field: null, prompt: "SUMMARY" },
  { key: "done", field: null, prompt: "DONE" },
];

export function stepIndex(key: string): number {
  const i = STEPS.findIndex((s) => s.key === key);
  return i === -1 ? 0 : i;
}

export function nextStep(key: string): StepDef {
  const i = stepIndex(key);
  return STEPS[Math.min(i + 1, STEPS.length - 1)];
}

export const REQUIRED_FIELDS = STEPS.map((s) => s.field).filter((f): f is string => !!f);
