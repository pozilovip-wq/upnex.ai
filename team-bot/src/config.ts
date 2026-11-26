const num = (v: string | undefined, fallback: number) => (v && !Number.isNaN(Number(v)) ? Number(v) : fallback);

export const config = {
  /** Telegram IDs that are always active admins (comma-separated). */
  adminIds: (process.env.ADMIN_IDS ?? "").split(",").map(s => Number(s.trim())).filter(Boolean),
  /** Morning digest + weekly/monthly reports, Tashkent hour. */
  morningHour: num(process.env.MORNING_HOUR, 9),
  /** Evening summary for members + team report for admins, Tashkent hour. */
  eveningHour: num(process.env.EVENING_HOUR, 19),
  defaultDailyTarget: num(process.env.DEFAULT_DAILY_TARGET, 20),
};
