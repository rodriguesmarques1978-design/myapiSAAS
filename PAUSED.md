# PAUSADO

**Estado:** PAUSADO
**Data da pausa:** 2 de setembro de 2026
**Retomável:** sim — nada foi apagado

## Motivo

O nicho de API gateway está saturado e a mesma estratégia já está a ser
executada por muita gente. A probabilidade de diferenciação é baixa, e o esforço
passa a ser explorado noutro nicho com melhor potencial.

A pausa é de desenvolvimento, não de arquivo: código, dados, histórico do git,
configurações e dependências ficam todos no sítio.

## O que foi concluído

**Landing page e waitlist** — em produção. `POST /api/waitlist` valida com zod e
insere na tabela `waitlist` do Supabase, que tem RLS ligado e nenhuma policy: só
a service role key lá chega. É a única parte do projeto que está mesmo a
funcionar de ponta a ponta.

**Páginas de autenticação** — login, signup e recuperação de password, com o
dashboard num route group a verificar sessão no layout.

**Schema core na base de dados** — `organizations`, `members`, `projects`,
`api_keys`, com RLS. Aplicado ao Supabase e a funcionar.

**Motor do gateway — escrito, nunca funcional.** Está todo em
`feat/gateway-proxy-engine` (PR #1, por fazer merge): proxy em
`/gw/[slug]/[[...path]]` no edge runtime, validação de API key com cache no
Redis, rate limiting por (projeto, key, endpoint), reencaminhamento para o
`target_url` do projeto e logging com duas estratégias. Autenticação por
`Authorization: Bearer` ou `X-API-Key`.

## O que ficou pendente

**As migrações `db/003_gateway.sql` e `db/004_rate_limits.sql` nunca foram
aplicadas ao Supabase.** É por isto que o gateway nunca chegou a servir um
pedido: o `resolveRoute` pede a coluna `projects.fail_open`, que não existe na
base de dados real, e o Postgres rejeita a query inteira com
`42703 column projects_1.fail_open does not exist`. Todos os pedidos ao gateway
respondem 503.

Em falta na base de dados: `projects.fail_open`,
`api_keys.rate_limit_requests`, `api_keys.rate_limit_window`, e as tabelas
`request_logs` e `rate_limits` por inteiro. As duas migrações são idempotentes.

**Por verificar de ponta a ponta**, porque as migrações travam o pedido antes:
que a API key é removida do pedido antes de chegar à origin do cliente, e que os
headers `X-RateLimit-*` aparecem na resposta do proxy.

**PR #1 está aberto e por fazer merge.** Nenhum trabalho se perde por isso — a
branch está no GitHub.

**Sem features de produto.** Não há UI de gestão de keys, analytics nem
billing. O `fail_open` é lido pelo `resolveRoute` mas nunca consumido por
ninguém; era para expor na UI numa fase seguinte.

## O que foi desativado nesta pausa

**Cron da Vercel.** O bloco `crons` foi removido do `vercel.json` na branch
`feat/gateway-proxy-engine`. Nunca chegou a correr — o `vercel.json` só existe
nessa branch, e os crons da Vercel só disparam em deployments de produção, que
saem do `main`. Foi removido para que um merge futuro não o ligue por
distração. Para o repor, devolver ao `vercel.json`:

```json
"crons": [
  {
    "path": "/api/cron/flush-logs",
    "schedule": "* * * * *"
  }
]
```

**Servidor de desenvolvimento local.** Estava a correr na porta 3000 e foi
terminado.

Nada mais estava ativo: não há CI/CD (não existe `.github/` em nenhuma branch),
não há workers, filas nem webhooks, e o Redis está vazio.

## Como retomar

1. `git checkout feat/gateway-proxy-engine` — é onde está o motor do gateway.
2. Correr `db/003_gateway.sql` e `db/004_rate_limits.sql` no SQL Editor do
   Supabase, por essa ordem. **Sem isto nada funciona.**
3. Gerar uma API key de teste com o comando no cabeçalho de
   `db/seeds/gateway_smoke_test.sql` e correr o seed.
4. `npm install && npm run dev`, e testar com
   `curl -H "X-API-Key: <key>" localhost:3000/gw/smoke/headers`. O httpbin
   devolve os headers que recebeu — a key não pode aparecer lá.
5. Repor o bloco `crons` acima, se o modo `batch` de logging for para usar.
6. Definir `CRON_SECRET` no ambiente da Vercel antes de qualquer deploy que
   inclua o cron.

## Riscos e decisões a rever

**A `service_role` key do Supabase continua por rodar.** Foi exposta numa
conversa a 30 de agosto de 2026 e ainda é a chave válida do projeto. Ignora o
RLS, portanto dá leitura e escrita a tudo — incluindo os emails da waitlist. O
repositório passou a público a 1 de setembro, o que agrava a exposição. Rodar em
`https://supabase.com/dashboard/project/uiurkvabatnjrgmyvvxu/settings/api-keys`.
Não foi feito nesta pausa por instrução explícita de não mexer em credenciais.

**O plano da Vercel nunca foi confirmado.** O cron de 60 em 60 segundos precisa
de plano Pro; no gratuito os crons correm uma vez por dia. Se o projeto for
retomado com o modo `batch`, isto decide se a estratégia é sequer viável.

**A entrega dos logs em modo `batch` é at-least-once.** Um `XDEL` falhado depois
de um insert bem sucedido duplica linhas. Chega para analytics; para faturação
precisa de uma unique key pelo entry-id do stream.

**A decisão de mercado a rever:** a pausa assume que o nicho está saturado. Se
for retomado, vale a pena rever se a saturação é real em todo o mercado ou só no
segmento genérico — a hipótese original era developer experience de 5 minutos
para solo founders, e essa parte não chegou a ser testada com utilizadores.
