# Upnex AI Admission Bot (Telegram)

AI-powered lead-collection bot for Upnex. Talks to students like a real consultant, collects lead info in order, and hands off to a human admin when the student is ready to apply.

## Setup

1. **Create the Telegram bot**
   - Message [@BotFather](https://t.me/BotFather) on Telegram, run `/newbot`, follow the prompts.
   - Copy the token into `TELEGRAM_BOT_TOKEN`.
   - To find your own `ADMIN_CHAT_ID`, message [@userinfobot](https://t.me/userinfobot) and copy your numeric chat id.

2. **Create a Supabase project**
   - Go to https://supabase.com, create a free project.
   - In the SQL editor, run `migrations/001_init.sql`.
   - Copy `Project URL` → `SUPABASE_URL`, and the `service_role` key (Settings → API) → `SUPABASE_KEY`.

3. **Get an OpenAI API key**
   - https://platform.openai.com/api-keys → copy into `OPENAI_API_KEY`.

4. **Configure env**
   ```bash
   cp .env.example .env
   # fill in the 5 values
   ```

5. **Run locally**
   ```bash
   npm install
   npm run dev
   ```
   Message your bot on Telegram and try `/start`.

## Deploy (Railway)

1. Push this repo to GitHub.
2. In Railway, "New Project" → "Deploy from GitHub repo" → select this repo, set the root directory to `bot/`.
3. Add the 5 env vars from `.env.example` in Railway's Variables tab.
4. Set the start command to `npm run build && npm start` (or leave Railway's Nixpacks defaults, it detects `npm start`).
5. Deploy. Bot runs via long polling, no public URL needed.

## How it works

- `src/steps.ts` — the fixed, ordered list of questions (name, age, phone, country, program, semester, education, English level, budget, scholarship, passport, prior application).
- `src/ai.ts` — sends the conversation + current step to OpenAI with a structured JSON schema response, so the model both answers free-form questions AND tells us which field it just collected / whether to advance / whether to hand off to a human.
- `src/handlers/message.ts` — orchestrates: load lead from DB → ask AI → save extracted field → advance step → reply → notify admin if needed.
- `src/db.ts` — Supabase read/write helpers for the `leads` table.
- `src/handoff.ts` — sends a lead summary to your admin Telegram chat when a student says they're ready to apply/pay.

## Phase 2 (not built yet)

- Instagram DM integration — requires a Meta Business app + API review, separate effort once Telegram is validated.
- Admin web dashboard — for now, view/filter leads directly in the Supabase Table editor.
