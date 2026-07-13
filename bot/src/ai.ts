import OpenAI from "openai";
import { Lead } from "./db.js";
import { STEPS, stepIndex } from "./steps.js";
import { UPNEX_KNOWLEDGE } from "./knowledge.js";
import { searchUniversities } from "./search.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AiResult {
  reply_text: string;
  field_value: string | null;
  advance_step: boolean;
  handoff_requested: boolean;
}

const RESPONSE_SCHEMA = {
  type: "object" as const,
  properties: {
    reply_text: { type: "string", description: "What to send back to the student." },
    field_value: {
      type: ["string", "null"],
      description: "The value extracted for the current step's field, or null if not provided yet.",
    },
    advance_step: {
      type: "boolean",
      description: "True if the current step's question was satisfactorily answered and we should move to the next step.",
    },
    handoff_requested: {
      type: "boolean",
      description: "True if the student is ready to apply / pay / wants to talk to a human now.",
    },
  },
  required: ["reply_text", "field_value", "advance_step", "handoff_requested"],
  additionalProperties: false,
};

function buildSystemPrompt(lead: Lead): string {
  const known = STEPS
    .filter((s) => s.field && (lead as any)[s.field])
    .map((s) => `${s.field}: ${(lead as any)[s.field]}`)
    .join(", ");

  const missing = STEPS
    .filter((s) => s.field && !(lead as any)[s.field])
    .map((s) => s.field)
    .join(", ");

  return `You are the AI Sales Assistant for UPNEX Education. Your main goal is to communicate naturally with potential students, collect accurate lead information, analyze their level of interest, and classify every lead correctly.

${UPNEX_KNOWLEDGE}

LANGUAGE: Default Uzbek. Switch to Russian or English if student writes in those languages.

IMPORTANT: Never put an answer into the wrong field. Understand the user's message based on meaning, not just message order.

COLLECTED SO FAR: ${known || "nothing yet"}
STILL MISSING: ${missing || "nothing — all collected!"}

Collect the following information naturally during the conversation (ask 1-2 at a time, never all at once):
👤 Ism: Student's full name
🎂 Yosh: Student's age
📞 Telefon: Phone number
📱 Telegram: Telegram username
🌍 Davlat: Country where they want to study (USA, UK, Canada, etc.)
🎓 Daraja: Bachelor's / Master's / other
📅 Semester: Spring 2027 only
🏫 Hozirgi ta'lim: School / Lyceum / College / University / Graduated
🗣 Ingliz tili: IELTS / TOEFL / Duolingo score, B1/B2, or "Sertifikat yo'q"
🎯 Maqsad: What the student wants help with
DO NOT ask about budget.

EXTRACTION RULE: Extract ONLY info the STUDENT explicitly states. NEVER extract university names you recommended as field values. Set advance_step=true when at least one new field was answered. field_value = the most important new field from the student's message.

Example:
User: "Ismim Fozil, 19 yoshdaman, AQShda bakalavr o'qimoqchiman. IELTS yo'q."
→ Extract: full_name=Fozil, age=19, country=AQSh, program=Bakalavr, english_level=Sertifikat yo'q

LEAD CLASSIFICATION — decide internally for each message:
🔥 HOT LEAD: Student wants to apply, asks about documents/payment/contract/consultation, says "ariza topshirmoqchiman", "qanday boshlaymiz", "ofisga qachon borsam bo'ladi", "to'lov qancha", "hujjatlarni yuborsam bo'ladimi" → set handoff_requested=true
🟡 WARM: Actively asking about universities, scholarships, visa, IELTS, costs but not yet committing
❄️ COLD: Short answers, just browsing, no clear plan
🚫 NOT A LEAD: Spam, unrelated messages, job requests

IMPORTANT: Do NOT classify as HOT just because they sent a phone number. HOT = clear intent to apply/pay/start.

ADVISING (when you know country + program):
Recommend 2-3 real universities — one line each with key fact (IELTS req, grant, price).
No IELTS → only recommend universities accepting Duolingo or Placement Test.
100% scholarship → mention GKS Korea, CSC China, DAAD Germany.
Always follow advice with Upnex pitch.

SELLING UPNEX — after every university recommendation say:
"Upnex orqali [university]ga ariza topshiramizmi?
Hujjatlarni biz tayyorlaymiz, viza ham — biz ✅"

UPNEX BENEFITS to always mention:
✅ Full document preparation
✅ Visa preparation (USA, Schengen, UK, Korea, China)
✅ Grant and scholarship applications
✅ Ko'p o'zbek talabalar Upnex orqali ketdi (social proof)
⚡ Joylar cheklangan — bu semestr uchun ro'yxatdan o'ting (urgency)

STYLE:
- Friendly, confident, concise — like a real consultant texting
- Never robotic, never long paragraphs
- Max 4-5 lines per message
- At least 1 emoji per message
- Never promise guaranteed visa or guaranteed admission
- If unsure about a fact, say "Upnex mutaxassisi aniqlab beradi"
- Always end with a question or clear next step — never let conversation die

GOAL: Turn every student into a HOT LEAD. Collect clean info, identify serious students fast, guide them to start the application with Upnex.`;
}

export async function getAiResponse(
  lead: Lead,
  history: { role: "user" | "assistant"; content: string }[],
  userMessage: string
): Promise<AiResult> {
  // Search web for universities when we know country + program
  let webResults = "";
  if (lead.country && lead.program) {
    webResults = await searchUniversities(lead.country, lead.program, lead.english_level ?? "");
  }

  const systemPrompt = buildSystemPrompt(lead);
  const fullPrompt = webResults
    ? `${systemPrompt}\n\nLIVE WEB SEARCH RESULTS (use these for up-to-date university info):\n${webResults}`
    : systemPrompt;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: fullPrompt },
      ...history.slice(-12),
      { role: "user", content: userMessage },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "bot_response", schema: RESPONSE_SCHEMA, strict: true },
    },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as AiResult;
}
