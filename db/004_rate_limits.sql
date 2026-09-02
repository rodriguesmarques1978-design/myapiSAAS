-- Regras de rate limit por projeto, key e endpoint.
-- Correr no SQL Editor do Supabase depois do 003_gateway.sql.
--
-- É idempotente: pode ser corrido mais que uma vez sem estragar nada.
--
-- Relação com as colunas de api_keys (criadas no 003): esta tabela é a camada
-- específica, aquelas são o fallback. Uma key sem regra nenhuma aqui continua a
-- usar api_keys.rate_limit_requests / rate_limit_window. Nada do 003 é perdido.

create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  -- null = a regra vale para todas as keys do projeto.
  api_key_id uuid references public.api_keys (id) on delete cascade,
  -- null = a regra vale para todos os endpoints. Um valor terminado em "*" é
  -- prefixo (/v1/chat*), senão é comparação exata.
  endpoint text,
  requests integer not null check (requests > 0),
  window text not null
    check (window in ('1s', '10s', '1m', '5m', '1h', '1d')),
  created_at timestamptz not null default now()
);

alter table public.rate_limits enable row level security;

-- ---------------------------------------------------------------------------
-- Uma regra por combinação de âmbito
--
-- Um unique normal não serve: em Postgres dois NULL não são iguais, por isso
-- (projeto, null, null) podia ser inserido as vezes que se quisesse. O coalesce
-- dá a cada âmbito um valor concreto e resolve isso sem depender do
-- `nulls not distinct`, que só existe a partir do Postgres 15.
-- ---------------------------------------------------------------------------

create unique index if not exists rate_limits_scope_idx
  on public.rate_limits (
    project_id,
    coalesce(api_key_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(endpoint, '*')
  );

-- O gateway lê todas as regras de um projeto de uma vez e escolhe a mais
-- específica em memória — são poucas por projeto e poupa queries no caminho
-- quente.
create index if not exists rate_limits_project_idx
  on public.rate_limits (project_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Ler é para qualquer membro da org; escrever é só para owner/admin. Espelha o
-- que o schema.sql faz para projects e api_keys.
-- ---------------------------------------------------------------------------

drop policy if exists rate_limits_select on public.rate_limits;
create policy rate_limits_select on public.rate_limits
  for select to authenticated
  using (
    project_id in (
      select id from public.projects
      where org_id in (select public.user_org_ids())
    )
  );

drop policy if exists rate_limits_insert on public.rate_limits;
create policy rate_limits_insert on public.rate_limits
  for insert to authenticated
  with check (
    project_id in (
      select id from public.projects
      where public.user_is_org_admin(org_id)
    )
  );

drop policy if exists rate_limits_update on public.rate_limits;
create policy rate_limits_update on public.rate_limits
  for update to authenticated
  using (
    project_id in (
      select id from public.projects
      where public.user_is_org_admin(org_id)
    )
  )
  with check (
    project_id in (
      select id from public.projects
      where public.user_is_org_admin(org_id)
    )
  );

drop policy if exists rate_limits_delete on public.rate_limits;
create policy rate_limits_delete on public.rate_limits
  for delete to authenticated
  using (
    project_id in (
      select id from public.projects
      where public.user_is_org_admin(org_id)
    )
  );
