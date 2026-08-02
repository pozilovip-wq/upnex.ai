import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
const bot = createClient("https://ifhjjafkogxauqhrmzaj.supabase.co", process.env.SUPABASE_KEY!);
const { data } = await bot.from("leads").select("id, conversation_history").eq("id", "0a30c0f5-8d6b-49d1-a430-64f4363347ed").single();
console.log("type:", typeof data?.conversation_history);
console.log("value:", JSON.stringify(data?.conversation_history)?.slice(0, 300));
