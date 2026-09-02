-- Core Proxy Engine: configuração de rate limit e log de requests.
-- Correr no SQL Editor do Supabase depois do schema.sql.
--
-- É idempotente: pode ser corrido mais que uma vez sem estragar nada.

-- ---------------------------------------------------------------------------
-- Rate limit por key
--
-- Fica em api_keys e não em projects porque o limite é por cliente: duas keys
-- do mesmo projeto podem estar em planos diferentes. O default de 1000/1m é o
-- mesmo que a landing page mostra no exemplo.
--
-- A janela é texto no formato do @upstash/ratelimit ("1m", "10s", "1h"), e não
-- um interval do Postgres, porque quem a consome é o gateway e não o SQL.
-- ---------------------------------------------------------------------------

alter table public.api_keys
  add column if not exists rate_limit_requests integer not null default 1000,
  add column if not exists rate_limit_window text not null default '1m';

alter table public.api_keys
  drop constraint if exists api_keys_rate_limit_requests_check;

alter table public.api_keys
  add constraint api_keys_rate_limit_requests_check
    check (rate_limit_requests > 0);

alter table public.api_keys
  drop constraint if exists api_keys_rate_limit_window_check;

-- Só as janelas que o gateway sabe traduzir. Um valor fora desta lista faria
-- o Ratelimit rebentar em runtime, com o pedido já a meio.
alter table public.api_keys
  add constraint api_keys_rate_limit_window_check
    check (rate_limit_window in ('1s', '10s', '1m', '5m', '1h', '1d'));

-- ---------------------------------------------------------------------------
-- Comportamento em falha
--
-- Default false = fail-closed: se não conseguirmos validar a key, o pedido não
-- passa. É o default seguro para APIs pagas. A coluna existe desde já para a
-- migração não voltar cá, mas o gateway ainda não a lê — expor isto na UI é
-- fase seguinte.
-- ---------------------------------------------------------------------------

alter table public.projects
  add column if not exists fail_open boolean not null default false;

-- ---------------------------------------------------------------------------
-- Log de requests
--
-- Só metadata. O body nunca é guardado — é o que a FAQ da landing promete.
--
-- id é bigint identity e não uuid: esta tabela cresce por ordem de magnitude
-- acima das outras, e um índice sequencial não fragmenta como um uuid random.
-- ---------------------------------------------------------------------------

create table if not exists public.request_logs (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  -- on delete set null, não cascade: apagar uma key não pode apagar o
  -- histórico em que a faturação desse mês se baseia.
  api_key_id uuid references public.api_keys (id) on delete set null,
  method text not null,
  -- Path do lado da origin, já sem o prefixo /gw/<slug>.
  path text not null,
  status_code integer not null,
  -- Tempo total do gateway, do primeiro byte recebido ao último enviado.
  duration_ms integer not null,
  -- Vêm do content-length e por isso podem ser null em respostas chunked.
  request_bytes integer,
  response_bytes integer,
  created_at timestamptz not null default now()
);

alter table public.request_logs enable row level security;

-- É assim que as queries de analytics leem: um projeto, ordenado por data
-- decrescente, com corte por período.
create index if not exists request_logs_project_created_idx
  on public.request_logs (project_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Só select, e espelha a policy de api_keys_select: um membro vê os logs dos
-- projetos das organizações a que pertence.
--
-- Não há policy de insert/update/delete de propósito. Quem escreve é o
-- gateway, com a service role key, que ignora RLS. Sem policy, mais ninguém
-- consegue forjar ou apagar linhas de uso — incluindo o dono do projeto, que
-- de outra forma podia apagar o histórico que lhe vai ser faturado.
-- ---------------------------------------------------------------------------

drop policy if exists request_logs_select on public.request_logs;
create policy request_logs_select on public.request_logs
  for select to authenticated
  using (
    project_id in (
      select id from public.projects
      where org_id in (select public.user_org_ids())
    )
  );
