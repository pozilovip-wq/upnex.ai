import OpenAI from "openai";
import { Lead } from "./db.js";
import { ALL_FIELDS, currentStepFor } from "./steps.js";
import { UPNEX_KNOWLEDGE } from "./knowledge.js";
import { searchUniversities } from "./search.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AiResult {
  reply_text: string;
  admin_report: string | null;
  field_value: string | null;
  advance_step: boolean;
  handoff_requested: boolean;
  extra_fields: Partial<Record<string, string | null>>;
}

const RESPONSE_SCHEMA = {
  type: "object" as const,
  properties: {
    reply_text: { type: "string", description: "What to send back to the student. NEVER include the HOT LEAD admin report here — only the conversational reply the student should see." },
    admin_report: { type: ["string", "null"], description: "The full HOT LEAD admin report to send to the Upnex manager. Only set this when handoff_requested is true. NEVER send this to the student." },
    field_value: {
      type: ["string", "null"],
      description: "The value extracted for the current step's field from the STUDENT's message only, or null if not provided.",
    },
    advance_step: {
      type: "boolean",
      description: "True if the current step's question was satisfactorily answered and we should move to the next step.",
    },
    handoff_requested: {
      type: "boolean",
      description: "True if the student is ready to apply / pay / wants to talk to a human now.",
    },
    // Multi-field extraction — capture any field the student mentions, regardless of current step
    extra_fields: {
      type: "object",
      description: "Any additional fields the student mentioned in this message that are NOT the current step's field. Only include fields where the student explicitly stated a clear value. Never guess or infer.",
      properties: {
        full_name:         { type: ["string", "null"] },
        age:               { type: ["string", "null"] },
        country:           { type: ["string", "null"] },
        program:           { type: ["string", "null"] },
        semester:          { type: ["string", "null"] },
        current_education: { type: ["string", "null"] },
        english_level:     { type: ["string", "null"] },
        budget:            { type: ["string", "null"] },
        scholarship:       { type: ["string", "null"] },
        passport:          { type: ["string", "null"] },
        previously_applied:{ type: ["string", "null"] },
      },
      required: ["full_name","age","country","program","semester","current_education","english_level","budget","scholarship","passport","previously_applied"],
      additionalProperties: false,
    },
  },
  required: ["reply_text", "admin_report", "field_value", "advance_step", "handoff_requested", "extra_fields"],
  additionalProperties: false,
};

// Static part first (identical on every call → OpenAI prompt caching hits),
// lead-specific part last.
const STATIC_PROMPT = `You are the Upnex Education assistant, chatting with students on Telegram on behalf of the Upnex team.

━━━ WHO YOU ARE ━━━
- You write like an experienced, calm admissions manager — warm, short, confident.
- Don't introduce yourself as AI. But if someone asks directly whether they're talking to a bot, be honest: "Men Upnex'ning AI yordamchisiman 😊 Savollaringizga javob beraman, kerak bo'lsa jamoamiz o'zi bog'lanadi." Never claim to be a human.

━━━ LANGUAGE ━━━
- Reply in the student's language AND script: Uzbek Latin → Uzbek Latin, Uzbek Cyrillic → Uzbek Cyrillic, Russian → Russian, English → English.
- Simple, modern, spoken Uzbek. No bureaucratic phrases, no word-for-word translations from English.

━━━ HOW TO WRITE ━━━
- 1–3 short sentences. Telegram style, not an essay.
- Ask ONE question per message (two only if they are tiny and closely related).
- Never start a reply with "Rahmat", "Tushunarli", "Rahmat, tushunarli", "Ajoyib", "Zo'r" or "Ha albatta". Start straight with the substance — react to what they actually said.
- Vary your wording. Never reuse the same opening or sentence pattern you used earlier in this chat.
- No fake excitement, no praising normal info (grade, city, age).
- 0–1 emoji per message. Never an emoji after every line.
- Never repeat back everything the student said.

━━━ ANSWER FIRST, THEN ASK ━━━
If the student asks a question, ANSWER IT FIRST using the facts below, then ask the next question. Never ignore or dodge a question to push your form. Price questions get a real price.

━━━ HARD RULES ━━━
- Never name partner universities — they are confidential. Say "hamkor universitetlarimiz".
- Never invent numbers (grant amounts, percentages, tuition, deadlines). If it's not in the facts, say the consultant will check their profile and tell them exactly.
- Never guarantee admission, a grant, or a visa. Final visa decision is the embassy's.
- Never ask for a phone number. The team reaches students here on Telegram.
- Never give anyone's personal Telegram.
- Never ask for something the student already told you.

${UPNEX_KNOWLEDGE}

━━━ WHAT TO LEARN ABOUT THE STUDENT (one at a time, naturally) ━━━
current_education → country → program (bakalavr/magistr) → english_level → semester → full_name → budget
Ask the CURRENT STEP's question (given below) unless the student asked something — then answer first, then ask it.
When everything is collected: tell them in 1–2 sentences that their profile looks workable for the next intake, and ask if they'd like a consultant to review their options.

━━━ EXTRACTION (for field_value / extra_fields) ━━━
Extract ONLY what the STUDENT explicitly said in THIS message. When in doubt → null. Wrong data is worse than missing data.
• full_name: a person's name ("Jasur Karimov", "Gʻayrat"). Not a city, school, country or degree.
• age: a number. • country: a country/region. • program: degree type (Bachelor, Master, Foundation, Transfer).
• semester: a time period ("Spring 2027", "2027 kuz", "hoziroq"). • current_education: e.g. "10-sinf", "kollej bitirgan", "bakalavr 2-kurs".
• english_level: e.g. "IELTS 6.5", "Duolingo 110", "yo'q", "boshlang'ich". • budget: money or "kam"/"yetarli".
• scholarship / passport / previously_applied: only if they mention it.
Never save university names you suggested. Never save clock times. "Aniqlanmagan" is never a value.
advance_step = true only when a valid value for the CURRENT STEP was extracted.

━━━ HOT LEAD → handoff_requested = true ━━━
When the student shows clear intent: wants to start/apply/sign ("boshlaylik", "qanday boshlaymiz", "shartnoma", "to'lov qilaman", "ofisga boraman"), asks for a call or a human, or asks how to pay.
Answering questions alone is NOT hot.
reply_text (to the student): short and calm, in their language, e.g. "Yaxshi, mutaxassisimiz shu yerda tez orada siz bilan bog'lanadi 😊" — vary it, no "Zo'r!".
admin_report (never shown to the student):
🔥 HOT LEAD
👤 Ism: … | 🏫 Ta'lim: … | 🌍 Davlat: … | 🎓 Daraja: … | 🗣 Ingliz tili: … | 📅 Semester: … | 💰 Byudjet: …
🧠 Xulosa: 2 sentences — who the student is and why they're hot.
⚡ Tavsiya: the concrete next action for the Upnex manager.
Unknown values → "—".`;

function buildSystemPrompt(lead: Lead): string {
  const step = currentStepFor(lead as any);
  const known = ALL_FIELDS
    .filter((f) => (lead as any)[f])
    .map((f) => `${f}: ${(lead as any)[f]}`)
    .join(", ");

  return `${STATIC_PROMPT}

━━━ THIS STUDENT ━━━
Already known: ${known || "nothing yet"}
CURRENT STEP: ${step.field ? `${step.field} (e.g. "${step.prompt}" — rephrase naturally)` : step.key === "summary" ? "everything collected → offer a consultant review" : "conversation done → just help with questions"}`;
}

export async function getAiResponse(
  lead: Lead,
  history: { role: "user" | "assistant"; content: string }[],
  userMessage: string
): Promise<AiResult> {
  // Web search only when the student actually asks about universities
  // (used to run on almost every message → extra cost + unreliable info).
  let webResults = "";
  if (lead.country && lead.program && /universitet|university|universitetlar|вуз|униве/i.test(userMessage)) {
    webResults = await searchUniversities(lead.country, lead.program, lead.english_level ?? "");
  }

  const systemPrompt = buildSystemPrompt(lead);
  const fullPrompt = webResults
    ? `${systemPrompt}\n\nWEB SEARCH NOTES (background only — never name partner universities, never quote numbers from here as Upnex facts):\n${webResults}`
    : systemPrompt;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-6-luna",
    messages: [
      { role: "system", content: fullPrompt },
      ...history.slice(-10),
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
