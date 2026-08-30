-- Waitlist da landing page.
-- Correr no SQL Editor do Supabase (Dashboard → SQL Editor → New query).

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  project text,
  created_at timestamptz not null default now()
);

-- RLS ligado sem policies: nem anon nem authenticated conseguem ler/escrever.
-- Só a service role key (usada server-side na API route) ignora o RLS.
alter table public.waitlist enable row level security;
