import { createClient } from "@supabase/supabase-js";
import { Lead } from "./db.js";

const crm = createClient(
  "https://ivhkczwosslgergpimfd.supabase.co",
  process.env.CRM_SUPABASE_KEY!
);

function mapStage(status: string): string {
  const map: Record<string, string> = {
    new:         "New Lead",
    in_progress: "New Lead",
    handoff:     "Consultation Scheduled",
    qualified:   "Documents Requested",
  };
  return map[status] ?? "New Lead";
}

function mapLeadScore(status: string): string {
  if (status === "handoff") return "Hot";
  if (status === "qualified") return "Warm";
  return "Cold";
}

function parseIelts(val: string | null): number {
  if (!val) return 0;
  const m = val.match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
}

function parseBudget(val: string | null): number {
  if (!val) return 0;
  const m = val.replace(/[,. ]/g, "").match(/\d+/);
  const n = m ? parseInt(m[0]) : 0;
  // Handle "20 ming" → 20000
  if (/ming|000/.test(val.toLowerCase()) && n < 1000) return n * 1000;
  return n;
}

function mapPassport(val: string | null): string {
  if (!val) return "Not Started";
  const v = val.toLowerCase();
  if (/bor|ha|yes|tayyor|mavjud|valid/.test(v)) return "Valid";
  if (/yoq|yo'q|no|none/.test(v)) return "Not Started";
  if (/jarayonda|process/.test(v)) return "In Process";
  return "Not Started";
}

function mapIntake(val: string | null): "Spring" | "Fall" {
  if (!val) return "Fall";
  return /spring|bahor/i.test(val) ? "Spring" : "Fall";
}

export function buildCrmStudent(lead: Lead) {
  const ielts = parseIelts(lead.english_level);
  const hasDuolingo = /duolingo/i.test(lead.english_level ?? "");
  const hasSat = /sat/i.test(lead.english_level ?? "");

  return {
    full_name:    lead.full_name ?? "Unknown",
    phone:        lead.phone ?? "",
    email:        "",
    telegram:     lead.telegram_username ? `@${lead.telegram_username}` : `id:${lead.telegram_chat_id}`,
    country:      "Uzbekistan",
    preferred_country: lead.country ?? "USA",
    major:        lead.program ?? "",
    intake:       mapIntake(lead.semester),
    ielts:        ielts,
    duolingo:     hasDuolingo ? 1 : undefined,
    sat:          hasSat ? 1 : undefined,
    budget:       parseBudget(lead.budget),
    passport_status: mapPassport(lead.passport),
    stage:        mapStage(lead.status ?? "new"),
    lead_score:   mapLeadScore(lead.status ?? "new"),
    enrollment_probability: lead.status === "handoff" ? 70 : lead.status === "qualified" ? 50 : 20,
    notes: [
      lead.current_education ? `Ta'lim: ${lead.current_education}` : "",
      lead.english_level     ? `Ingliz tili: ${lead.english_level}` : "",
      lead.scholarship       ? `Scholarship: ${lead.scholarship}` : "",
      lead.budget            ? `Byudjet: ${lead.budget}` : "",
      lead.semester          ? `Semester: ${lead.semester}` : "",
      `Bot status: ${lead.status}`,
      `Telegram ID: ${lead.telegram_chat_id}`,
    ].filter(Boolean).join(" | "),
    tags: ["telegram-bot", lead.status ?? "new"],
  };
}

export async function syncLeadToCRM(lead: Lead): Promise<void> {
  try {
    const student = buildCrmStudent(lead);
    const tgId = lead.telegram_username
      ? `@${lead.telegram_username}`
      : `id:${lead.telegram_chat_id}`;

    // Check if already exists
    const { data: existing } = await crm
      .from("students")
      .select("id")
      .eq("telegram", tgId)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const { error } = await crm
        .from("students")
        .update(student)
        .eq("id", existing.id);
      if (error) console.error("[CRM] Update failed:", error.message);
      else console.log(`[CRM] ✅ Updated ${student.full_name}`);
    } else {
      // Insert new
      const { error } = await crm.from("students").insert(student);
      if (error) console.error("[CRM] Insert failed:", error.message);
      else console.log(`[CRM] ✅ Inserted ${student.full_name}`);
    }
  } catch (err) {
    console.error("[CRM] Unexpected error:", err);
  }
}
