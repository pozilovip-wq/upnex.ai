import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { buildCrmStudent } from "./crm-sync.js";

const bot = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
const crm = createClient(
  "https://ivhkczwosslgergpimfd.supabase.co",
  process.env.CRM_SUPABASE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function run() {
  const { data: leads, error } = await bot.from("leads").select("*");
  if (error || !leads) { console.error("Failed to fetch leads:", error); process.exit(1); }

  console.log(`Syncing ${leads.length} leads...`);
  let ok = 0, fail = 0;

  for (const lead of leads) {
    try {
      // Ensure conversation_history is always an array
      if (!Array.isArray(lead.conversation_history)) {
        try { lead.conversation_history = JSON.parse(lead.conversation_history ?? "[]"); } catch { lead.conversation_history = []; }
      }
      const student = buildCrmStudent(lead);
      const { error: e } = await crm
        .from("students")
        .upsert(student, { onConflict: "telegram_chat_id" });
      if (e) { console.error(`❌ ${student.full_name} (${lead.telegram_chat_id}): ${e.message}`); fail++; }
      else { console.log(`✅ ${student.full_name}`); ok++; }
    } catch (err: any) {
      console.error(`❌ Error for lead ${lead.id} (conv_history type: ${typeof lead.conversation_history}, isArray: ${Array.isArray(lead.conversation_history)}):`, err?.message);
      fail++;
    }
  }

  console.log(`\nDone: ${ok} synced, ${fail} failed`);
}

run();
