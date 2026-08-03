/**
 * Backfill field extraction — reads conversation history and fills ONLY null fields.
 * Run with DRY_RUN=true (default) to preview, DRY_RUN=false to write.
 * Run with TEST_ONLY=true to process just the 5 test leads.
 * Processes in batches of 25 with a 2-second pause between batches.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const DRY_RUN = process.env.DRY_RUN !== "false";
const TEST_ONLY = process.env.TEST_ONLY !== "false";
const BATCH_SIZE = 25;
const TEST_USERNAMES = ["dovan_57", "nuriymon_uz", "sherxon873"];

const bot = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

interface Lead {
  id: string;
  telegram_username: string | null;
  full_name: string | null;
  age: string | null;
  country: string | null;
  program: string | null;
  semester: string | null;
  current_education: string | null;
  english_level: string | null;
  budget: string | null;
  scholarship: string | null;
  passport: string | null;
  previously_applied: string | null;
  conversation_history: { role: string; content: string }[];
}

interface Extracted {
  full_name?: string | null;
  age?: string | null;
  country?: string | null;
  program?: string | null;
  semester?: string | null;
  current_education?: string | null;
  english_level?: string | null;
  budget?: string | null;
  scholarship?: string | null;
  passport?: string | null;
  previously_applied?: string | null;
}

const EXTRACT_SCHEMA = {
  type: "object" as const,
  properties: {
    full_name:          { type: ["string", "null"], description: "Person's first+last name only. Null if not clearly stated." },
    age:                { type: ["string", "null"], description: "Age as a number string (e.g. '18'). Null if not stated." },
    country:            { type: ["string", "null"], description: "Target study country/region (e.g. 'USA', 'AQSh', 'Korea'). Null if not stated." },
    program:            { type: ["string", "null"], description: "Degree type only: Bachelor, Master, PhD, Foundation, Transfer. Null if not stated." },
    semester:           { type: ["string", "null"], description: "Intake period (e.g. 'Spring 2027', 'Fall 2026'). Null if not stated." },
    current_education:  { type: ["string", "null"], description: "Current study level (e.g. '11-sinf', 'kollej bitirgan', 'bakalavr 2-kurs'). Null if not stated." },
    english_level:      { type: ["string", "null"], description: "English level or test (e.g. 'B2', 'IELTS 6.5', 'Duolingo 110', 'yo`q'). Null if not stated." },
    budget:             { type: ["string", "null"], description: "Financial budget for study (e.g. '$8000', '10 ming dollar'). Null if not stated." },
    scholarship:        { type: ["string", "null"], description: "Scholarship interest: 'ha' or 'yo`q'. Null if not stated." },
    passport:           { type: ["string", "null"], description: "Passport status: 'bor'/'ha' if has one, 'yo`q' if not. Null if unclear. NEVER a person's name." },
    previously_applied: { type: ["string", "null"], description: "Prior application: 'ha' or 'yo`q' or details. Null if not stated." },
  },
  required: ["full_name","age","country","program","semester","current_education","english_level","budget","scholarship","passport","previously_applied"],
  additionalProperties: false,
};

async function extractFromConversation(lead: Lead): Promise<Extracted> {
  const transcript = (lead.conversation_history ?? [])
    .filter(m => m.role === "user" || m.role === "assistant")
    .map(m => `${m.role === "user" ? "STUDENT" : "BOT"}: ${(m.content ?? "").slice(0, 300)}`)
    .join("\n");

  if (!transcript.trim()) return {};

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: `You are extracting structured lead data from a Telegram conversation between a student and an education consulting bot (Upnex).

Extract ONLY values the STUDENT explicitly stated. Return null for anything not clearly stated.

STRICT RULES:
- full_name: must be a real name (letters only, 2+ words preferred). NEVER a city, country, degree, or "Aniqlanmagan".
- age: must be a number between 14-60. NEVER a country, degree, or non-number.
- country: target study destination. NEVER a city within Uzbekistan.
- program: degree type ONLY (Bachelor/Bakalavr/Master/PhD). NEVER a country or city.
- passport: "bor" if student has a passport, "yo'q" if not. NEVER a person's name.
- budget: must mention money. NEVER a year (2026, 2027) or semester.
- If the student's answer is ambiguous, vague, or clearly wrong for the field → null.`,
      },
      {
        role: "user",
        content: `Extract structured fields from this conversation:\n\n${transcript}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "lead_extraction", schema: EXTRACT_SCHEMA, strict: true },
    },
  });

  return JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Extracted;
}

function buildPatch(lead: Lead, extracted: Extracted): Partial<Lead> {
  const patch: Partial<Lead> = {};
  const FIELDS = ["full_name","age","country","program","semester","current_education","english_level","budget","scholarship","passport","previously_applied"] as const;

  for (const field of FIELDS) {
    const current = (lead as any)[field];
    const newVal = (extracted as any)[field];
    // Only fill truly empty (null/undefined) fields — never overwrite existing values
    if ((current === null || current === undefined) && newVal !== null && newVal !== undefined) {
      (patch as any)[field] = newVal;
    }
  }
  return patch;
}

async function processLead(lead: Lead, index: number, total: number): Promise<{ patched: boolean; patch: Partial<Lead> }> {
  const extracted = await extractFromConversation(lead);
  const patch = buildPatch(lead, extracted);

  const label = lead.telegram_username ?? lead.id.slice(0, 8);
  console.log(`\n[${index}/${total}] @${label}`);
  console.log("  BEFORE:", {
    full_name: lead.full_name, age: lead.age, country: lead.country,
    program: lead.program, english_level: lead.english_level,
    budget: lead.budget, passport: lead.passport, scholarship: lead.scholarship,
  });
  console.log("  EXTRACTED:", extracted);
  console.log("  PATCH (empty fields only):", Object.keys(patch).length ? patch : "(nothing to fill)");

  if (!DRY_RUN && Object.keys(patch).length > 0) {
    const { error } = await bot.from("leads").update(patch).eq("id", lead.id);
    if (error) console.error("  ❌ Update failed:", error.message);
    else console.log("  ✅ Written to DB");
  } else if (DRY_RUN) {
    console.log("  [DRY RUN — not written]");
  }

  return { patched: Object.keys(patch).length > 0, patch };
}

async function run() {
  console.log(`\n=== Backfill extraction | DRY_RUN=${DRY_RUN} | TEST_ONLY=${TEST_ONLY} ===\n`);

  const { data: allLeads, error } = await bot.from("leads").select("*");
  if (error || !allLeads) { console.error("Failed to fetch leads:", error); process.exit(1); }

  let candidates: Lead[];

  if (TEST_ONLY) {
    candidates = allLeads.filter(l =>
      TEST_USERNAMES.includes(l.telegram_username ?? "")
    ) as Lead[];
    console.log(`Test mode: processing ${candidates.length} leads (${TEST_USERNAMES.join(", ")})\n`);
  } else {
    // Full run: only leads with real conversations and at least one empty key field
    candidates = allLeads.filter(l =>
      Array.isArray(l.conversation_history) &&
      l.conversation_history.length >= 4 &&
      (!l.country || !l.english_level || !l.budget || !l.program)
    ) as Lead[];
    console.log(`Full run: ${candidates.length} leads to process in batches of ${BATCH_SIZE}\n`);
  }

  let patched = 0;
  let skipped = 0;

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    console.log(`\n--- Batch ${Math.floor(i/BATCH_SIZE)+1} / ${Math.ceil(candidates.length/BATCH_SIZE)} ---`);

    for (let j = 0; j < batch.length; j++) {
      const result = await processLead(batch[j], i + j + 1, candidates.length);
      if (result.patched) patched++; else skipped++;
      // Small delay between GPT calls to avoid rate limits
      await new Promise(r => setTimeout(r, 300));
    }

    if (i + BATCH_SIZE < candidates.length) {
      console.log(`\nPausing 2s between batches...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`\n=== Done: ${patched} patched, ${skipped} no new data, ${candidates.length} total ===`);
}

run().catch(console.error);
