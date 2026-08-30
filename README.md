# myapi

API infrastructure for indie developers — rate limits, API keys, and metered
billing in 5 minutes.

Landing page + waitlist. Next.js 14 (App Router), TypeScript strict, Tailwind,
shadcn/ui, dark mode por defeito.

## Setup

```bash
npm install
cp .env.example .env.local   # preencher LOOPS_API_KEY
npm run dev
```

Sem `LOOPS_API_KEY` a página funciona na mesma; o endpoint da waitlist responde
`503` até a chave estar definida.

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
  api/waitlist/route.ts POST → Loops.so
components/
  waitlist.tsx          provider + botão + modal (client)
  site-header.tsx  hero.tsx  features.tsx  how-it-works.tsx  site-footer.tsx
  ui/                   shadcn/ui
lib/
  validations.ts        schema zod partilhado client/server
```

## Waitlist

`POST /api/waitlist` recebe `{ email, project? }`, valida com zod e cria o
contacto no [Loops](https://loops.so) com `source: "landing-waitlist"`.

| Situação                 | Resposta                          |
| ------------------------ | --------------------------------- |
| Sucesso                  | `200 { success: true }`           |
| Email já inscrito        | `200 { alreadySubscribed: true }` |
| Payload inválido         | `400`                             |
| `LOOPS_API_KEY` em falta | `503`                             |
| Loops indisponível       | `502`                             |
