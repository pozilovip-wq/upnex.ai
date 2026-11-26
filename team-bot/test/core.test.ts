import { test } from "node:test";
import assert from "node:assert/strict";
import { dateKey, dayStart, fmtTime, keyToDate, monthStart, parseDate, parseDateTime, parseTime, weekStart } from "../src/time.ts";
import { computeStats } from "../src/stats.ts";
import { parseClient } from "../src/text.ts";

// Thu 26 Nov 2026, 10:00 Tashkent = 05:00 UTC
const now = new Date("2026-11-26T05:00:00Z");

test("Tashkent day/week/month boundaries", () => {
  assert.equal(dayStart(now).toISOString(), "2026-11-25T19:00:00.000Z");
  assert.equal(dateKey(weekStart(now)), "2026-11-23"); // Monday
  assert.equal(dateKey(weekStart(now, -1)), "2026-11-16");
  assert.equal(dateKey(monthStart(now)), "2026-11-01");
  assert.equal(dateKey(monthStart(now, -1)), "2026-10-01");
  // 23:30 Tashkent is still the same local day even though UTC is earlier
  assert.equal(dateKey(new Date("2026-11-26T18:30:00Z")), "2026-11-26");
  assert.equal(dateKey(new Date("2026-11-26T19:00:00Z")), "2026-11-27");
});

test("parseTime", () => {
  assert.deepEqual(parseTime("14:30"), { hh: 14, mm: 30 });
  assert.deepEqual(parseTime("9"), { hh: 9, mm: 0 });
  assert.deepEqual(parseTime("9.05"), { hh: 9, mm: 5 });
  assert.equal(parseTime("25:00"), null);
  assert.equal(parseTime("abc"), null);
});

test("parseDate", () => {
  assert.equal(parseDate("ertaga", now), "2026-11-27");
  assert.equal(parseDate("Bugun", now), "2026-11-26");
  assert.equal(parseDate("05.12", now), "2026-12-05");
  assert.equal(parseDate("01.03", now), "2027-03-01"); // already passed this year → next year
  assert.equal(parseDate("31.02", now), null);
  assert.equal(parseDate("10/01/2027", now), "2027-01-10");
});

test("parseDateTime", () => {
  assert.equal(fmtTime(parseDateTime("ertaga 15:00", now)!), "15:00");
  assert.equal(dateKey(parseDateTime("ertaga 15:00", now)!), "2026-11-27");
  assert.equal(parseDateTime("28.11 9:30", now)!.toISOString(), keyToDate("2026-11-28", 9, 30).toISOString());
  assert.equal(dateKey(parseDateTime("16:00", now)!), "2026-11-26");
  assert.equal(parseDateTime("28.11", now), null); // date only → time step
});

test("parseClient", () => {
  assert.deepEqual(parseClient("Aziz Karimov +998 90 123-45-67"), { name: "Aziz Karimov", phone: "+998901234567" });
  assert.deepEqual(parseClient("Madina"), { name: "Madina", phone: null });
  assert.deepEqual(parseClient("901234567"), { name: "901234567", phone: "901234567" });
  assert.equal(parseClient("   "), null);
});

test("computeStats", () => {
  const from = dayStart(now);
  const to = dayStart(now, 1);
  const at = (h: number) => keyToDate("2026-11-26", h).toISOString();
  const done = (result: any, h = 9) => ({ status: "done" as const, result, completed_at: at(h), scheduled_at: null });
  const s = computeStats([
    done("interested"), done("no_answer"), done("no_answer"), done("converted"), done("follow_up"), done("not_interested"),
    done("interested", 0 - 24), // yesterday → excluded
    { status: "pending", result: null, completed_at: null, scheduled_at: at(8) },  // overdue
    { status: "pending", result: null, completed_at: null, scheduled_at: at(15) }, // upcoming
    { status: "cancelled", result: null, completed_at: null, scheduled_at: at(8) },
  ], from, to, now);
  assert.deepEqual(s, { made: 6, connected: 4, noAnswer: 2, interested: 1, notInterested: 1, followUp: 1, converted: 1, overdue: 1, pending: 1 });
});
