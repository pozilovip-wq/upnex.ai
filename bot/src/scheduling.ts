/**
 * scheduled_calls helpers — bot Supabase only.
 * Used exclusively by the Business / Secretary-Mode path.
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

export interface ScheduledCall {
  id: string;
  telegram_chat_id: string;
  lead_name: string | null;
  scheduled_date: string; // 'YYYY-MM-DD'
  time_slot: "08:00" | "19:00";
  status: "offered" | "booked" | "completed" | "no-show";
  created_at: string;
}

const SLOTS: ("08:00" | "19:00")[] = ["08:00", "19:00"];

/** Uzbekistan is UTC+5. Returns today's date string as 'YYYY-MM-DD'. */
function uzDate(offsetDays = 0): string {
  const d = new Date(Date.now() + 5 * 60 * 60 * 1000 + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}

/** Returns which slots are already booked for a given date. */
async function bookedSlots(date: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("scheduled_calls")
    .select("time_slot")
    .eq("scheduled_date", date)
    .in("status", ["booked", "offered"]);
  return new Set((data ?? []).map((r: any) => r.time_slot));
}

/** Returns the first date (today or tomorrow) that has at least one free slot,
 *  plus which slots are free on that date. */
export async function findAvailableSlots(): Promise<{ date: string; freeSlots: ("08:00" | "19:00")[] }> {
  for (let offset = 0; offset <= 1; offset++) {
    const date = uzDate(offset);
    const taken = await bookedSlots(date);
    const free = SLOTS.filter(s => !taken.has(s));
    if (free.length > 0) return { date, freeSlots: free };
  }
  // Both days fully booked — offer day after tomorrow's 08:00
  return { date: uzDate(2), freeSlots: ["08:00"] };
}

/** Returns any pending 'offered' call for this chat (waiting for slot choice). */
export async function getPendingOffer(chatId: string): Promise<ScheduledCall | null> {
  const { data } = await supabase
    .from("scheduled_calls")
    .select("*")
    .eq("telegram_chat_id", chatId)
    .eq("status", "offered")
    .order("created_at", { ascending: false })
    .limit(1);
  return (data?.[0] as ScheduledCall) ?? null;
}

/** Creates an 'offered' row so we remember the proposed date+slots. */
export async function createOffer(
  chatId: string,
  leadName: string | null,
  date: string,
  slot: "08:00" | "19:00"   // the first/default slot offered (for single-slot case)
): Promise<void> {
  // Cancel any stale previous offer first
  await supabase
    .from("scheduled_calls")
    .update({ status: "no-show" })
    .eq("telegram_chat_id", chatId)
    .eq("status", "offered");

  await supabase.from("scheduled_calls").insert({
    telegram_chat_id: chatId,
    lead_name: leadName,
    scheduled_date: date,
    time_slot: slot,
    status: "offered",
  });
}

/** Confirms the chosen slot — updates the offered row to 'booked'. */
export async function confirmSlot(
  chatId: string,
  date: string,
  slot: "08:00" | "19:00"
): Promise<void> {
  // Mark any offered row for this chat as booked with the chosen slot+date
  await supabase
    .from("scheduled_calls")
    .update({ status: "booked", scheduled_date: date, time_slot: slot })
    .eq("telegram_chat_id", chatId)
    .eq("status", "offered");
}

/** Format 'YYYY-MM-DD' → 'DD.MM.YYYY' for display to users. */
export function formatDate(date: string): string {
  const [y, m, d] = date.split("-");
  const today = uzDate(0);
  const tomorrow = uzDate(1);
  if (date === today) return "bugun";
  if (date === tomorrow) return "ertaga";
  return `${d}.${m}.${y}`;
}
