import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Lead } from "./db.js";

let _crm: SupabaseClient | null = null;
function getCrm(): SupabaseClient | null {
  if (!process.env.CRM_SUPABASE_KEY) return null;
  if (!_crm) _crm = createClient("https://ivhkczwosslgergpimfd.supabase.co", process.env.CRM_SUPABASE_KEY);
  return _crm;
}

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

function parseIelts(val: string | null): number | undefined {
  if (!val) return undefined;
  const m = val.match(/[\d.]+/);
  const n = m ? parseFloat(m[0]) : 0;
  return n > 0 && n <= 9 ? n : undefined;
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

  // Last 8 messages from bot conversation
  const recentMessages = (Array.isArray(lead.conversation_history) ? lead.conversation_history : [])
    .filter(m => m.role === "user" || m.role === "assistant")
    .slice(-8)
    .map(m => `${m.role === "user" ? "👤" : "🤖"} ${(m.content ?? "").slice(0, 200)}`)
    .join("\n");

  const profileNotes = [
    lead.current_education ? `Ta'lim: ${lead.current_education}` : "",
    lead.english_level     ? `Ingliz tili: ${lead.english_level}` : "",
    lead.scholarship       ? `Scholarship: ${lead.scholarship}` : "",
    lead.budget            ? `Byudjet: ${lead.budget}` : "",
    lead.semester          ? `Semester: ${lead.semester}` : "",
    `Bot status: ${lead.status}`,
    `Telegram ID: ${lead.telegram_chat_id}`,
  ].filter(Boolean).join(" | ");

  const notes = recentMessages
    ? `${profileNotes}\n\n── Bot suhbati (so'nggi xabarlar) ──\n${recentMessages}`
    : profileNotes;

  return {
    full_name:    lead.full_name ?? "Unknown",
    phone:        lead.phone ?? "",
    email:        "",
    telegram:     lead.telegram_username ? `@${lead.telegram_username}` : `id:${lead.telegram_chat_id}`,
    telegram_chat_id: lead.telegram_chat_id,
    country:      "Uzbekistan",
    preferred_country: lead.country ?? "USA",
    major:        lead.program ?? "",
    intake:       mapIntake(lead.semester),
    ielts:        ielts ?? undefined,
    duolingo:     hasDuolingo ? 1 : undefined,
    sat:          hasSat ? 1 : undefined,
    budget:       parseBudget(lead.budget),
    passport_status: mapPassport(lead.passport),
    stage:        mapStage(lead.status ?? "new"),
    lead_score:   mapLeadScore(lead.status ?? "new"),
    enrollment_probability: lead.status === "handoff" ? 70 : lead.status === "qualified" ? 50 : 20,
    notes,
    tags: ["telegram-bot", lead.status ?? "new"],
  };
}

export async function syncLeadToCRM(lead: Lead): Promise<void> {
  const crm = getCrm();
  if (!crm) return;
  try {
    const student = buildCrmStudent(lead);
    const tgId = lead.telegram_username
      ? `@${lead.telegram_username}`
      : `id:${lead.telegram_chat_id}`;

    const { data: existing } = await crm
      .from("students")
      .select("id")
      .eq("telegram", tgId)
      .maybeSingle();

    if (existing) {
      const { error } = await crm.from("students").update(student).eq("id", existing.id);
      if (error) console.error("[CRM] Update failed:", error.message);
      else console.log(`[CRM] ✅ Updated ${student.full_name}`);
    } else {
      const { error } = await crm.from("students").insert(student);
      if (error) console.error("[CRM] Insert failed:", error.message);
      else console.log(`[CRM] ✅ Inserted ${student.full_name}`);
    }
  } catch (err) {
    console.error("[CRM] Unexpected error:", err);
  }
}
