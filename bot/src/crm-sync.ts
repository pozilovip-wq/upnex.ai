import { createClient } from "@supabase/supabase-js";
import { Lead } from "./db.js";

// Uses the same Supabase project as the CRM website
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

export async function syncLeadToCRM(lead: Lead): Promise<void> {
  try {
    // Map bot Lead fields → CRM students table columns
    const ieltsMatch = lead.english_level?.match(/[\d.]+/);
    const ieltsValue = ieltsMatch ? parseFloat(ieltsMatch[0]) : 0;

    const student = {
      full_name: lead.full_name ?? "Unknown",
      phone: lead.phone ?? "",
      telegram: lead.telegram_username ? `@${lead.telegram_username}` : "",
      age: lead.age ? parseInt(lead.age) || 18 : 18,
      country: "Uzbekistan",
      preferred_country: lead.country ?? "USA",
      major: lead.program ?? "",
      intake: lead.semester?.includes("Spring") ? "Spring" : "Fall",
      ielts: ieltsValue,
      budget: 0,
      passport_status: lead.passport === "Ha" || lead.passport?.toLowerCase() === "yes"
        ? "Valid"
        : "Not Started",
      notes: [
        lead.current_education ? `Ta'lim: ${lead.current_education}` : "",
        lead.english_level ? `Ingliz tili: ${lead.english_level}` : "",
        lead.scholarship ? `Stipendiya: ${lead.scholarship}` : "",
        lead.previously_applied ? `Avval ariza: ${lead.previously_applied}` : "",
        lead.budget ? `Byudjet: ${lead.budget}` : "",
      ].filter(Boolean).join(" | "),
      stage: "New Lead",
      lead_score: "Hot",
      enrollment_probability: 70,
      tags: ["telegram-bot"],
    };

    // Check if this lead already exists in CRM (by telegram username)
    if (lead.telegram_username) {
      const { data: existing } = await supabase
        .from("students")
        .select("id")
        .eq("telegram", `@${lead.telegram_username}`)
        .maybeSingle();

      if (existing) {
        // Already in CRM — skip to avoid duplicates
        console.log(`[CRM sync] Lead @${lead.telegram_username} already in CRM, skipping.`);
        return;
      }
    }

    const { error } = await supabase.from("students").insert(student);
    if (error) {
      console.error("[CRM sync] Failed to insert student:", error.message);
    } else {
      console.log(`[CRM sync] ✅ Synced lead "${student.full_name}" to CRM`);
    }
  } catch (err) {
    // Never crash the bot — just log
    console.error("[CRM sync] Unexpected error:", err);
  }
}
