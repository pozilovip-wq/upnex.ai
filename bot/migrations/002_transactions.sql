create type service_type as enum (
  'admission',
  'visa',
  'sop_essay',
  'translation',
  'accommodation',
  'consultation',
  'other'
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  owner_chat_id text not null,
  owner_username text not null,
  amount numeric(10,2) not null,
  currency text not null default 'USD',
  service service_type not null default 'other',
  student_name text,
  note text,
  raw_input text,
  created_at timestamptz not null default now()
);

create index transactions_owner_idx on transactions (owner_chat_id);
create index transactions_created_at_idx on transactions (created_at);
