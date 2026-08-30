# myapi

API infrastructure for indie developers — rate limits, API keys, and metered
billing in 5 minutes.

Landing page + waitlist. Next.js 14 (App Router), TypeScript strict, Tailwind,
shadcn/ui, dark mode por defeito.

## Setup

```bash
npm install
cp .env.example .env.local   # preencher as vars do Supabase
npm run dev
```

Depois corre `db/001_waitlist.sql` no SQL Editor do Supabase para criar a tabela.

Sem as env vars a página funciona na mesma; o endpoint da waitlist responde
`503` até estarem definidas.

## Scripts

| Comando             | O que faz                   |
| ------------------- | --------------------------- |
| `npm run dev`       | Servidor de desenvolvimento |
| `npm run build`     | Build de produção           |
| `npm run lint`      | ESLint                      |
| `npm run typecheck` | `tsc --noEmit`              |
| `npm run format`    | Prettier                    |

## Estrutura

```
app/
  page.tsx              landing page (server component)
  layout.tsx            fonts, ThemeProvider, Toaster
  api/waitlist/route.ts POST → Supabase
components/
  waitlist.tsx          provider + botão + modal (client)
  site-header.tsx  hero.tsx  features.tsx  how-it-works.tsx  site-footer.tsx
  ui/                   shadcn/ui
lib/
  validations.ts        schema zod partilhado client/server
  supabase.ts           cliente admin (service role, só server-side)
db/
  001_waitlist.sql      tabela waitlist + RLS
```

## Waitlist

`POST /api/waitlist` recebe `{ email, project? }`, valida com zod e insere na
tabela `waitlist` do Supabase.

| Situação              | Resposta                          |
| --------------------- | --------------------------------- |
| Sucesso               | `200 { success: true }`           |
| Email já inscrito     | `200 { alreadySubscribed: true }` |
| Payload inválido      | `400`                             |
| Env vars em falta     | `503`                             |
| Supabase indisponível | `502`                             |

A tabela tem RLS ligado e nenhuma policy: só a service role key lá chega, e essa
nunca sai do servidor.
