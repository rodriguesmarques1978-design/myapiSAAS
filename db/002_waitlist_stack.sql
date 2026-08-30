-- Adiciona a stack escolhida no formulário da waitlist.
-- Correr no SQL Editor do Supabase depois do 001_waitlist.sql.

alter table public.waitlist
  add column if not exists stack text;
