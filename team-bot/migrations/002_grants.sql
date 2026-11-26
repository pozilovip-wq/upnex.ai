-- Newer Supabase projects don't grant API roles access to new tables automatically.
-- Give the bot's secret key (service_role) full access. anon stays locked out.
grant usage on schema public to service_role;
grant select, insert, update, delete on team_members, calls, meetings, bot_events to service_role;
