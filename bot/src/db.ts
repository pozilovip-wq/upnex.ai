import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!, {
  realtime: { transport: ws },
});

export interface Lead {
  id: string;
  telegram_chat_id: string;
  telegram_username: string | null;
  full_name: string | null;
  age: string | null;
  phone: string | null;
  country: string | null;
  program: string | null;
  semester: string | null;
  current_education: string | null;
  english_level: string | null;
  budget: string | null;
  scholarship: string | null;
  passport: string | null;
  previously_applied: string | null;
  current_step: string;
  lead_score: number;
  status: string;
  conversation_history: { role: "user" | "assistant"; content: string }[];
}

export async function getOrCreateLead(chatId: string, username: string | null): Promise<Lead> {
  const { data: existing, error: selErr } = await supabase
    .from("leads")
    .select("*")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing as Lead;

  const { data: created, error: insErr } = await supabase
    .from("leads")
    .insert({ telegram_chat_id: chatId, telegram_username: username })
    .select("*")
    .single();
  if (insErr) throw insErr;
  return created as Lead;
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<void> {
  const { error } = await supabase
    .from("leads")
    .update({ ...patch, last_message_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function appendMessages(
  lead: Lead,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<void> {
  const history = [...lead.conversation_history, ...messages];
  await updateLead(lead.id, { conversation_history: history } as Partial<Lead>);
}
