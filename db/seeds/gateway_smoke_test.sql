-- Dados de teste do gateway. NÃO correr em produção.
--
-- Cria uma org, um projeto a apontar para o httpbin e uma API key com limite
-- baixo, para o 429 ser fácil de provocar à mão.
--
-- A key NÃO está aqui de propósito: este ficheiro está num repo público, e uma
-- key com prefixo sk_live_ commitada é uma credencial funcional para quem
-- correr o seed. Geras a tua antes de correr isto:
--
--   node -e "const c=require('crypto'); \
--     const k='sk_live_'+c.randomBytes(32).toString('base64url'); \
--     console.log('key   :', k); \
--     console.log('hash  :', c.createHash('sha256').update(k).digest('hex')); \
--     console.log('prefix:', k.slice(0,16))"
--
-- Guarda a `key` (é o que mandas no Authorization ou no X-API-Key — só a vês
-- desta vez) e cola o `hash` e o `prefix` nos dois sítios marcados abaixo.
--
-- Correr depois de db/003_gateway.sql e db/004_rate_limits.sql.

insert into public.organizations (name, slug, plan)
values ('Smoke Test', 'smoke-test', 'free')
on conflict (slug) do nothing;

insert into public.projects (org_id, name, target_url, slug)
select id, 'httpbin', 'https://httpbin.org', 'smoke'
from public.organizations
where slug = 'smoke-test'
on conflict (slug) do nothing;

insert into public.api_keys (
  project_id, key_hash, key_prefix, name,
  rate_limit_requests, rate_limit_window
)
select
  id,
  'COLA_AQUI_O_HASH',    -- ← hash do comando acima (64 chars hex)
  'COLA_AQUI_O_PREFIX',  -- ← prefix do comando acima (sk_live_ + 8 chars)
  'smoke-test-key',
  5,
  '1m'
from public.projects
where slug = 'smoke'
on conflict (key_hash) do nothing;
