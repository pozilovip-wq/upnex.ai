# UPNEX Team Bot — calls, meetings & reminders

Telegram bot for the sales team: log every call, schedule calls and follow-ups,
book meetings, get reminders, and get daily/weekly/monthly reports.
Separate from the lead bot in `../bot` (own token, own process).

All times are Asia/Tashkent (UTC+5).

## What it does

**For every team member** (bottom menu):

| Button | What happens |
|---|---|
| 📞 Qo'ng'iroq qayd etish | Pick a scheduled call or type `Ism +998…`, then tap the result: Qiziqdi / Qiziqmadi / Javob bermadi / Qayta qo'ng'iroq / Mijozga aylandi. "Qayta qo'ng'iroq" and "Qiziqdi" ask for the next call date, so the follow-up is booked straight away. |
| 🗓 Qo'ng'iroq rejalash | Client name + phone → date (buttons or `ertaga 15:00`, `28.11 14:30`) → time. |
| 📋 Bugungi reja | Progress vs. daily target, overdue calls, today's calls, today's meetings. One tap on a call records its result. |
| 📅 Uchrashuvlar / ➕ Uchrashuv belgilash | Today / tomorrow / 7-day meetings. A new meeting is either internal or with a client, with a place or link and attendees; every attendee is notified. |
| 📊 Statistikam | Today, this week and this month. |

**Automatic messages**

- 1 day before every call and meeting (unless it was booked less than 24h ahead).
- 30 minutes before. Call reminders include the result buttons, plus Reschedule and Cancel.
- 15 minutes after a call's time, if no result was entered: an overdue alert.
- 09:00: morning plan for each member (target, today's calls, overdue, meetings).
- 19:00: day summary for each member, and the team report with a ranking for admins.
- Monday 09:00: weekly report for admins. 1st of the month: monthly report.

**Admin panel** (👑): team stats for today / week / month, ranking, team plan with all
overdue calls, per-member details (set daily target, make admin, deactivate),
and approval of new members. Admins also get a 🎉 message on every conversion.

### Report definitions

- **Jami qo'ng'iroqlar (total calls)**: calls with a recorded result.
- **Muvaffaqiyatli bog'lanish (successful connections)**: every result except "Javob bermadi" (no answer).
- **O'tkazib yuborilgan (missed)**: "Javob bermadi" results plus scheduled calls whose time passed with no result.
- **Qayta qo'ng'iroq (follow-ups)**: calls with the "Qayta qo'ng'iroq" result.
- **Uchrashuvlar belgilandi (meetings booked)**: meetings created in the period (per member: the ones they created).
- **Mijozga aylandi (converted)**: the "Mijozga aylandi" result.

## Setup

1. **New bot**: in @BotFather run `/newbot` and copy the token. Use a separate bot from the lead bot.
2. **Database**: open the Supabase SQL editor and run `migrations/001_team.sql`.
   Copy the project URL and the `service_role` key.
3. **Env**: `cp .env.example .env` and fill in `BOT_TOKEN`, `SUPABASE_URL`, `SUPABASE_KEY`, `ADMIN_IDS`.
4. **Run**:
   ```bash
   npm install
   npm run dev
   ```
5. **Team**: each member opens the bot and presses /start. Admins get an approve/reject button.

## Deploy (Railway)

Create a new service from this repo with the root directory set to `team-bot/`. Add the env vars.
It uses the included Dockerfile and runs with long polling, so it needs no public URL.
Run only one instance: reminders are deduplicated in the database, but Telegram allows only one poller per token.

## Code map

- `src/index.ts`: startup, access control, menu routing
- `src/flows.ts`: call logging, scheduling, follow-ups, rescheduling, meetings
- `src/admin.ts`: admin panel and member management
- `src/scheduler.ts`: reminders, overdue alerts, daily/weekly/monthly reports (runs every minute)
- `src/reports.ts`: text for plans, stats and reports; `src/stats.ts` holds the pure aggregation
- `src/time.ts`: Tashkent time helpers and date parsing
- `npm test`: unit tests for date parsing and stats; `npm run typecheck`
