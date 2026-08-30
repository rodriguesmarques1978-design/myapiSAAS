-- Schema core do myapi: organizations, members, projects, api_keys.
-- Correr no SQL Editor do Supabase (Dashboard → SQL Editor → New query).
--
-- É idempotente: pode ser corrido mais que uma vez sem estragar nada.

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'free'
    check (plan in ('free', 'starter', 'growth', 'scale')),
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner'
    check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  -- Um utilizador tem no máximo um papel por organização.
  unique (org_id, user_id)
);

alter table public.members enable row level security;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  -- A API do cliente, para onde o gateway faz proxy.
  target_url text not null,
  -- Entra no URL do gateway, por isso é único globalmente.
  slug text not null unique,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  -- SHA-256 da key. A key em plaintext só existe uma vez, no momento em que é
  -- gerada e mostrada ao utilizador. Nunca é guardada.
  key_hash text not null unique,
  -- Primeiros chars, para dar a reconhecer a key na UI (pk_live_abc...).
  key_prefix text not null,
  name text not null,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.api_keys enable row level security;

-- ---------------------------------------------------------------------------
-- Índices
--
-- Nota: as constraints unique (organizations.slug, projects.slug,
-- api_keys.key_hash, members(org_id, user_id)) já criam índice, por isso não
-- são repetidas aqui. O lookup do gateway (where key_hash = $1) usa o índice
-- da constraint unique.
-- ---------------------------------------------------------------------------

create index if not exists members_org_id_idx on public.members (org_id);
create index if not exists members_user_id_idx on public.members (user_id);
create index if not exists projects_org_id_idx on public.projects (org_id);
create index if not exists api_keys_project_id_idx on public.api_keys (project_id);

-- ---------------------------------------------------------------------------
-- Helpers de RLS
--
-- São security definer de propósito: correm com os privilégios do owner e por
-- isso ignoram o RLS da tabela members. Sem isto, uma policy em members que
-- consulta members entra em recursão infinita e o Postgres rebenta o pedido.
--
-- O search_path fixo evita que um search_path manipulado aponte estas funções
-- para tabelas falsas.
-- ---------------------------------------------------------------------------

create or replace function public.user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select org_id from public.members where user_id = auth.uid();
$$;

create or replace function public.user_is_org_admin(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.members
    where org_id = target_org_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- ---------------------------------------------------------------------------
-- Bootstrap: quem cria a organização fica owner
--
-- Sem isto haveria um buraco no arranque: a policy de insert em members exige
-- ser admin da org, mas numa org acabada de criar ainda não há members nenhuns.
-- ---------------------------------------------------------------------------

create or replace function public.add_creator_as_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.members (org_id, user_id, role)
  values (new.id, auth.uid(), 'owner')
  on conflict (org_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists organizations_add_creator_as_owner on public.organizations;

create trigger organizations_add_creator_as_owner
  after insert on public.organizations
  for each row
  when (auth.uid() is not null)
  execute function public.add_creator_as_owner();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Regra geral: um utilizador só vê o que pertence às organizações de que é
-- membro. Ler é para qualquer membro; escrever é só para owner/admin.
--
-- A service role key ignora tudo isto. É por isso que o gateway (que precisa
-- de validar keys de qualquer projeto) corre server-side com essa chave.
--
-- O RLS é ligado logo a seguir a cada create table, de propósito: se este
-- script falhasse a meio, nenhuma tabela ficaria criada sem RLS ativo.
-- ---------------------------------------------------------------------------


-- organizations ------------------------------------------------------------

drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select to authenticated
  using (id in (select public.user_org_ids()));

-- Qualquer utilizador autenticado pode criar uma org; o trigger acima torna-o
-- owner logo a seguir.
drop policy if exists organizations_insert on public.organizations;
create policy organizations_insert on public.organizations
  for insert to authenticated
  with check (true);

drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations
  for update to authenticated
  using (public.user_is_org_admin(id))
  with check (public.user_is_org_admin(id));

-- Apagar a org apaga members, projects e api_keys em cascata, por isso fica
-- reservado ao owner.
drop policy if exists organizations_delete on public.organizations;
create policy organizations_delete on public.organizations
  for delete to authenticated
  using (
    exists (
      select 1 from public.members
      where org_id = organizations.id
        and user_id = auth.uid()
        and role = 'owner'
    )
  );

-- members -------------------------------------------------------------------

drop policy if exists members_select on public.members;
create policy members_select on public.members
  for select to authenticated
  using (org_id in (select public.user_org_ids()));

drop policy if exists members_insert on public.members;
create policy members_insert on public.members
  for insert to authenticated
  with check (public.user_is_org_admin(org_id));

drop policy if exists members_update on public.members;
create policy members_update on public.members
  for update to authenticated
  using (public.user_is_org_admin(org_id))
  with check (public.user_is_org_admin(org_id));

drop policy if exists members_delete on public.members;
create policy members_delete on public.members
  for delete to authenticated
  using (public.user_is_org_admin(org_id));

-- projects ------------------------------------------------------------------

drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select to authenticated
  using (org_id in (select public.user_org_ids()));

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
  for insert to authenticated
  with check (public.user_is_org_admin(org_id));

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
  for update to authenticated
  using (public.user_is_org_admin(org_id))
  with check (public.user_is_org_admin(org_id));

drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects
  for delete to authenticated
  using (public.user_is_org_admin(org_id));

-- api_keys ------------------------------------------------------------------

drop policy if exists api_keys_select on public.api_keys;
create policy api_keys_select on public.api_keys
  for select to authenticated
  using (
    project_id in (
      select id from public.projects
      where org_id in (select public.user_org_ids())
    )
  );

drop policy if exists api_keys_insert on public.api_keys;
create policy api_keys_insert on public.api_keys
  for insert to authenticated
  with check (
    project_id in (
      select id from public.projects
      where public.user_is_org_admin(org_id)
    )
  );

drop policy if exists api_keys_update on public.api_keys;
create policy api_keys_update on public.api_keys
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

drop policy if exists api_keys_delete on public.api_keys;
create policy api_keys_delete on public.api_keys
  for delete to authenticated
  using (
    project_id in (
      select id from public.projects
      where public.user_is_org_admin(org_id)
    )
  );
