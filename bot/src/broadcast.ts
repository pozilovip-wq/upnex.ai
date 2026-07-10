import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function sendMessage(chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const json = await res.json() as any;
  if (!json.ok) throw new Error(json.description);
}

const MESSAGE = `Assalomu alaykum! 👋

Upnex AI bot yangilandi va endi to'liq ishlayapti! 🎓✅

Endi men sizga:
🇺🇸 Amerika, 🇪🇺 Yevropa, 🌏 Osiyo universitetlari haqida batafsil ma'lumot bera olaman
💰 Byudjetingizga mos universitetlarni tavsiya qila olaman
🏆 100% gacha grant imkoniyatlari haqida gaplasha olamiz
🛂 Viza jarayoni bo'yicha yordam bera olaman

Savollaringiz bo'lsa, yozing! 😊`;

async function broadcast() {
  const { data: leads, error } = await supabase
    .from("leads")
    .select("telegram_chat_id, full_name")
    .neq("telegram_chat_id", "");

  if (error) { console.error("DB error:", error); process.exit(1); }
  if (!leads?.length) { console.log("No users found."); process.exit(0); }

  console.log(`Sending to ${leads.length} users...`);
  let success = 0, failed = 0;

  for (const lead of leads) {
    try {
      await sendMessage(lead.telegram_chat_id, MESSAGE);
      console.log(`✅ Sent to ${lead.full_name ?? lead.telegram_chat_id}`);
      success++;
      await new Promise(r => setTimeout(r, 100)); // avoid rate limit
    } catch (err: any) {
      console.log(`❌ Failed ${lead.telegram_chat_id}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone! ✅ ${success} sent, ❌ ${failed} failed`);
  process.exit(0);
}

broadcast();
