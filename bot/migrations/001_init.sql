create type lead_status as enum (
  'new',
  'in_progress',
  'qualified',
  'handoff',
  'paid',
  'closed'
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  telegram_chat_id text unique not null,
  telegram_username text,
  instagram_username text,

  full_name text,
  age text,
  phone text,
  country text,
  program text,
  semester text,
  current_education text,
  english_level text,
  budget text,
  scholarship text,
  passport text,
  previously_applied text,

  current_step text not null default 'greeting',
  lead_score int not null default 0,
  status lead_status not null default 'new',

  conversation_history jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index leads_status_idx on leads (status);
create index leads_telegram_chat_id_idx on leads (telegram_chat_id);
