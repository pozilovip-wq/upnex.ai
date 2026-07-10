import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { ownerName } from "./owners.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

interface ParsedTransaction {
  amount: number;
  currency: string;
  service: string;
  student_name: string | null;
  note: string | null;
}

const PARSE_SCHEMA = {
  type: "object" as const,
  properties: {
    amount: { type: "number", description: "The numeric amount. Convert UZS millions to full number (e.g. '2 mln' = 2000000)." },
    currency: { type: "string", enum: ["USD", "UZS", "EUR"], description: "Currency. Default USD if unclear." },
    service: { type: "string", enum: ["admission", "visa", "sop_essay", "translation", "accommodation", "consultation", "other"] },
    student_name: { type: ["string", "null"], description: "Student name if mentioned, else null." },
    note: { type: ["string", "null"], description: "Any extra note." },
  },
  required: ["amount", "currency", "service", "student_name", "note"],
  additionalProperties: false,
};

export async function parseTransaction(text: string): Promise<ParsedTransaction | null> {
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an accounting assistant for Upnex education agency.
Extract transaction info from the owner's message.
Services: admission (universitetga qabul), visa (viza), sop_essay (SOP/essay yozish), translation (tarjima), accommodation (turar joy), consultation (konsultatsiya), other.
The message may be in Uzbek, Russian, or English.`,
        },
        { role: "user", content: text },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "transaction", schema: PARSE_SCHEMA, strict: true },
      },
    });
    return JSON.parse(res.choices[0].message.content ?? "null");
  } catch {
    return null;
  }
}

export async function saveTransaction(chatId: string, parsed: ParsedTransaction, raw: string) {
  const { error } = await supabase.from("transactions").insert({
    owner_chat_id: chatId,
    owner_username: ownerName(chatId),
    amount: parsed.amount,
    currency: parsed.currency,
    service: parsed.service,
    student_name: parsed.student_name,
    note: parsed.note,
    raw_input: raw,
  });
  if (error) throw error;
}

interface StatsRow {
  owner_username: string;
  currency: string;
  total: number;
  count: number;
}

export async function getStats(period: "today" | "week" | "month" | "all") {
  const now = new Date();
  let from: string | null = null;

  if (period === "today") {
    const d = new Date(now); d.setHours(0, 0, 0, 0);
    from = d.toISOString();
  } else if (period === "week") {
    const d = new Date(now); d.setDate(d.getDate() - 7);
    from = d.toISOString();
  } else if (period === "month") {
    const d = new Date(now); d.setDate(1); d.setHours(0, 0, 0, 0);
    from = d.toISOString();
  }

  let query = supabase
    .from("transactions")
    .select("owner_username, currency, amount");

  if (from) query = query.gte("created_at", from);

  const { data, error } = await query;
  if (error) throw error;

  // Group by owner + currency
  const grouped: Record<string, StatsRow> = {};
  for (const row of data ?? []) {
    const key = `${row.owner_username}_${row.currency}`;
    if (!grouped[key]) grouped[key] = { owner_username: row.owner_username, currency: row.currency, total: 0, count: 0 };
    grouped[key].total += Number(row.amount);
    grouped[key].count += 1;
  }

  return Object.values(grouped);
}

export async function getServiceBreakdown(chatId: string, period: "month" | "all" = "month") {
  const now = new Date();
  let from: string | null = null;
  if (period === "month") {
    const d = new Date(now); d.setDate(1); d.setHours(0, 0, 0, 0);
    from = d.toISOString();
  }

  let query = supabase
    .from("transactions")
    .select("service, currency, amount")
    .eq("owner_chat_id", chatId);

  if (from) query = query.gte("created_at", from);

  const { data, error } = await query;
  if (error) throw error;

  const grouped: Record<string, number> = {};
  for (const row of data ?? []) {
    const key = `${row.service} (${row.currency})`;
    grouped[key] = (grouped[key] ?? 0) + Number(row.amount);
  }
  return grouped;
}

export function formatStats(rows: StatsRow[], period: string): string {
  if (!rows.length) return `📊 ${period} davrida hech qanday daromad kiritilmagan.`;

  const byOwner: Record<string, string[]> = {};
  for (const r of rows) {
    if (!byOwner[r.owner_username]) byOwner[r.owner_username] = [];
    byOwner[r.owner_username].push(`${r.total.toLocaleString()} ${r.currency} (${r.count} ta)`);
  }

  const lines = [`📊 Daromad hisoboti — ${period}`, ""];
  for (const [owner, totals] of Object.entries(byOwner)) {
    lines.push(`👤 @${owner}`);
    totals.forEach(t => lines.push(`   💰 ${t}`));
  }

  // Split difference
  const owners = Object.keys(byOwner);
  if (owners.length === 2) {
    const usdRows = rows.filter(r => r.currency === "USD");
    if (usdRows.length === 2) {
      const [a, b] = usdRows;
      const diff = Math.abs(a.total - b.total);
      const more = a.total > b.total ? a.owner_username : b.owner_username;
      lines.push("", `⚖️ Farq: @${more} $${diff.toLocaleString()} ko'proq topdi`);
    }
  }

  return lines.join("\n");
}
