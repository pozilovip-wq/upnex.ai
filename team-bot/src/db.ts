import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type Role = "admin" | "member";
export type MemberStatus = "pending" | "active" | "inactive";
export type CallResult = "interested" | "not_interested" | "no_answer" | "follow_up" | "converted";

export interface Member {
  telegram_id: number;
  name: string;
  username: string | null;
  role: Role;
  status: MemberStatus;
  daily_target: number;
  created_at: string;
}

export interface Call {
  id: string;
  member_id: number;
  client_name: string;
  phone: string | null;
  scheduled_at: string | null;
  status: "pending" | "done" | "cancelled";
  result: CallResult | null;
  notes: string | null;
  completed_at: string | null;
  follow_up_of: string | null;
  reminded_day: boolean;
  reminded_30: boolean;
  overdue_notified: boolean;
  created_at: string;
}

export interface Meeting {
  id: string;
  title: string;
  kind: "internal" | "client";
  client_name: string | null;
  location: string | null;
  scheduled_at: string;
  created_by: number;
  attendee_ids: number[];
  status: "scheduled" | "cancelled";
  reminded_day: boolean;
  reminded_30: boolean;
  created_at: string;
}

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

const iso = (d: Date) => d.toISOString();

// ─── Members ─────────────────────────────────────────────────────────────────

export async function getMember(id: number): Promise<Member | null> {
  return check(await supabase.from("team_members").select("*").eq("telegram_id", id).maybeSingle()) as Member | null;
}

export async function upsertMember(row: Partial<Member> & { telegram_id: number }): Promise<Member> {
  return check(await supabase.from("team_members").upsert(row, { onConflict: "telegram_id" }).select("*").single()) as Member;
}

export async function updateMember(id: number, patch: Partial<Member>): Promise<Member> {
  return check(await supabase.from("team_members").update(patch).eq("telegram_id", id).select("*").single()) as Member;
}

export async function listMembers(status?: MemberStatus): Promise<Member[]> {
  let q = supabase.from("team_members").select("*").order("name");
  if (status) q = q.eq("status", status);
  return check(await q) as Member[];
}

export async function listAdmins(): Promise<Member[]> {
  return check(await supabase.from("team_members").select("*").eq("role", "admin").eq("status", "active")) as Member[];
}

// ─── Calls ───────────────────────────────────────────────────────────────────

export async function insertCall(row: Partial<Call> & { member_id: number; client_name: string }): Promise<Call> {
  return check(await supabase.from("calls").insert(row).select("*").single()) as Call;
}

export async function getCall(id: string): Promise<Call | null> {
  return check(await supabase.from("calls").select("*").eq("id", id).maybeSingle()) as Call | null;
}

export async function updateCall(id: string, patch: Partial<Call>): Promise<Call> {
  return check(await supabase.from("calls").update(patch).eq("id", id).select("*").single()) as Call;
}

/** Completes a call only if it is still pending. Returns null if someone already closed it. */
export async function completeCall(id: string, result: CallResult): Promise<Call | null> {
  const rows = check(
    await supabase.from("calls")
      .update({ status: "done", result, completed_at: iso(new Date()) })
      .eq("id", id).eq("status", "pending").select("*"),
  ) as Call[];
  return rows[0] ?? null;
}

/** Pending calls scheduled before `until` (includes overdue ones), oldest first. */
export async function pendingCalls(opts: { memberId?: number; until?: Date; from?: Date } = {}): Promise<Call[]> {
  let q = supabase.from("calls").select("*").eq("status", "pending").not("scheduled_at", "is", null);
  if (opts.memberId) q = q.eq("member_id", opts.memberId);
  if (opts.until) q = q.lt("scheduled_at", iso(opts.until));
  if (opts.from) q = q.gte("scheduled_at", iso(opts.from));
  return check(await q.order("scheduled_at")) as Call[];
}

/** Calls completed OR scheduled inside [from, to). */
export async function callsInRange(from: Date, to: Date, memberId?: number): Promise<Call[]> {
  const base = () => {
    const q = supabase.from("calls").select("*");
    return memberId ? q.eq("member_id", memberId) : q;
  };
  const [done, scheduled] = await Promise.all([
    base().gte("completed_at", iso(from)).lt("completed_at", iso(to)),
    base().gte("scheduled_at", iso(from)).lt("scheduled_at", iso(to)),
  ]);
  const byId = new Map<string, Call>();
  for (const c of [...(check(done) as Call[]), ...(check(scheduled) as Call[])]) byId.set(c.id, c);
  return [...byId.values()];
}

// ─── Meetings ────────────────────────────────────────────────────────────────

export async function insertMeeting(row: Partial<Meeting> & { title: string; kind: Meeting["kind"]; scheduled_at: string; created_by: number }): Promise<Meeting> {
  return check(await supabase.from("meetings").insert(row).select("*").single()) as Meeting;
}

export async function getMeeting(id: string): Promise<Meeting | null> {
  return check(await supabase.from("meetings").select("*").eq("id", id).maybeSingle()) as Meeting | null;
}

export async function updateMeeting(id: string, patch: Partial<Meeting>): Promise<Meeting> {
  return check(await supabase.from("meetings").update(patch).eq("id", id).select("*").single()) as Meeting;
}

export async function meetingsBetween(from: Date, to: Date): Promise<Meeting[]> {
  return check(
    await supabase.from("meetings").select("*").eq("status", "scheduled")
      .gte("scheduled_at", iso(from)).lt("scheduled_at", iso(to)).order("scheduled_at"),
  ) as Meeting[];
}

/** Meetings created in [from, to) — counts as "meetings scheduled" in reports. */
export async function meetingsCreatedBetween(from: Date, to: Date): Promise<Meeting[]> {
  return check(
    await supabase.from("meetings").select("*").neq("status", "cancelled")
      .gte("created_at", iso(from)).lt("created_at", iso(to)),
  ) as Meeting[];
}

export function meetingAttendees(m: Meeting, active: Member[]): Member[] {
  if (!m.attendee_ids.length) return active;
  const ids = new Set([...m.attendee_ids, m.created_by]);
  return active.filter(a => ids.has(a.telegram_id));
}

export function isInMeeting(m: Meeting, memberId: number): boolean {
  return !m.attendee_ids.length || m.created_by === memberId || m.attendee_ids.includes(memberId);
}

// ─── Atomic claims (prevent duplicate reminders / reports) ───────────────────

export async function claimFlag(table: "calls" | "meetings", id: string, flag: string): Promise<boolean> {
  const { data, error } = await supabase.from(table).update({ [flag]: true }).eq("id", id).eq(flag, false).select("id");
  if (error) { console.error(`[claimFlag] ${table}.${flag}:`, error.message); return false; }
  return (data?.length ?? 0) > 0;
}

export async function claimEvent(key: string): Promise<boolean> {
  const { error } = await supabase.from("bot_events").insert({ key });
  if (!error) return true;
  if (error.code !== "23505") console.error(`[claimEvent] ${key}:`, error.message);
  return false;
}
