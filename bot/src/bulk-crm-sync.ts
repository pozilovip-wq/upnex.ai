import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { buildCrmStudent } from "./crm-sync.js";

const bot = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
const crm = createClient(
  "https://ivhkczwosslgergpimfd.supabase.co",
  process.env.CRM_SUPABASE_KEY!
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
      const tgId = lead.telegram_username ? `@${lead.telegram_username}` : `id:${lead.telegram_chat_id}`;

      const { data: existing } = await crm.from("students").select("id").eq("telegram", tgId).maybeSingle();

      if (existing) {
        const { error: e } = await crm.from("students").update(student).eq("id", existing.id);
        if (e) { console.error(`❌ Update ${student.full_name}: ${e.message}`); fail++; }
        else { console.log(`✅ Updated: ${student.full_name}`); ok++; }
      } else {
        const { error: e } = await crm.from("students").insert(student);
        if (e) { console.error(`❌ Insert ${student.full_name}: ${e.message}`); fail++; }
        else { console.log(`✅ Inserted: ${student.full_name}`); ok++; }
      }
    } catch (err: any) {
      console.error(`❌ Error for lead ${lead.id} (conv_history type: ${typeof lead.conversation_history}, isArray: ${Array.isArray(lead.conversation_history)}):`, err?.message);
      fail++;
    }
  }

  console.log(`\nDone: ${ok} synced, ${fail} failed`);
}

run();
