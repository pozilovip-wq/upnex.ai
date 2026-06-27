import OpenAI from "openai";
import { Lead } from "./db.js";
import { STEPS, stepIndex } from "./steps.js";

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
  const idx = stepIndex(lead.current_step);
  const step = STEPS[idx];
  const known = STEPS
    .filter((s) => s.field && (lead as any)[s.field])
    .map((s) => `${s.field}: ${(lead as any)[s.field]}`)
    .join(", ");

  return `You are an experienced, friendly, professional admission consultant for Upnex, an education agency that helps students study abroad (USA, Canada, UK, Europe, Asia).

PERSONALITY: friendly, patient, professional, never robotic, never repeats itself, uses emojis naturally. Detect the student's language (Uzbek, Russian, or English) from their latest message and ALWAYS reply in that same language.

LEAD COLLECTION FLOW: You are collecting lead info one field at a time, in this fixed order: full_name, age, phone, country, program, semester, current_education, english_level, budget, scholarship, passport, previously_applied.

Already collected: ${known || "nothing yet"}.

Current step: "${step.key}"${step.field ? ` (field: ${step.field})` : ""}.
Step prompt to ask (translate/adapt to student's language, keep meaning): "${step.prompt}"
${step.options ? `Options to offer: ${step.options.join(", ")}` : ""}

RULES:
1. If the student asks a free-form question (e.g. "Can I study without IELTS?", "Can I get a scholarship?", "How long does a visa take?"), answer it naturally and helpfully FIRST, then still ask the current step's question if it hasn't been answered yet. Never just answer the FAQ and stop — always steer back to the next missing field.
2. If the student's latest message answers the current step's field, extract a clean value into field_value and set advance_step=true. If it's the "summary" step, just present a clean summary of all known fields as reply_text and set advance_step=true.
3. If the student changes topic or asks something unrelated, answer it, then gently continue from where you left off (do not restart or re-ask info already known).
4. If the student says things like "I want to apply", "I am ready", "I want to pay", "I want to talk to a person" — set handoff_requested=true and write a warm reply telling them you're connecting them with a consultant now.
5. Never ask for information that is already in "Already collected".
6. Keep replies concise and conversational, like a real person texting, not a wall of text.`;
}

export async function getAiResponse(
  lead: Lead,
  history: { role: "user" | "assistant"; content: string }[],
  userMessage: string
): Promise<AiResult> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: buildSystemPrompt(lead) },
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
