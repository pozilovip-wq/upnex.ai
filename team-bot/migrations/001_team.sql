-- UPNEX Team Bot — call & meeting management
-- Run once in the Supabase SQL editor of the project the team bot uses.

create extension if not exists pgcrypto;

create table if not exists team_members (
  telegram_id  bigint primary key,
  name         text not null,
  username     text,
  role         text not null default 'member' check (role in ('admin', 'member')),
  status       text not null default 'pending' check (status in ('pending', 'active', 'inactive')),
  daily_target int  not null default 20,
  created_at   timestamptz not null default now()
);

create table if not exists calls (
  id               uuid primary key default gen_random_uuid(),
  member_id        bigint not null references team_members(telegram_id),
  client_name      text not null,
  phone            text,
  scheduled_at     timestamptz,            -- null for ad-hoc calls logged after the fact
  status           text not null default 'pending' check (status in ('pending', 'done', 'cancelled')),
  result           text check (result in ('interested', 'not_interested', 'no_answer', 'follow_up', 'converted')),
  notes            text,
  completed_at     timestamptz,
  follow_up_of     uuid references calls(id),
  reminded_day     boolean not null default false,
  reminded_30      boolean not null default false,
  overdue_notified boolean not null default false,
  created_at       timestamptz not null default now()
);

create index if not exists calls_member_completed_idx on calls (member_id, completed_at);
create index if not exists calls_status_scheduled_idx on calls (status, scheduled_at);

create table if not exists meetings (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  kind         text not null check (kind in ('internal', 'client')),
  client_name  text,
  location     text,
  scheduled_at timestamptz not null,
  created_by   bigint not null references team_members(telegram_id),
  attendee_ids bigint[] not null default '{}',
  status       text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  reminded_day boolean not null default false,
  reminded_30  boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists meetings_scheduled_idx on meetings (status, scheduled_at);

-- One row per scheduled job run (e.g. 'morning:2026-11-26'), so restarts never double-send.
create table if not exists bot_events (
  key        text primary key,
  created_at timestamptz not null default now()
);

-- Lock tables to the server: only the secret (service_role) key can read/write.
alter table team_members enable row level security;
alter table calls        enable row level security;
alter table meetings     enable row level security;
alter table bot_events   enable row level security;
