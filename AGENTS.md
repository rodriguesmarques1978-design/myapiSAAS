# myapi - API Infrastructure SaaS

## Projeto

Micro SaaS que oferece API gateway all-in-one para indie developers:

- Rate limiting
- API key management
- Analytics
- Metered billing

## Target Customer

Solo founders e pequenas equipas técnicas a construir AI wrappers / LLM APIs.

## Stack Preferida

- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind
- UI: shadcn/ui
- Backend: Next.js API routes ou Hono
- Database: Supabase (Postgres)
- Auth: Supabase Auth ou Clerk
- Payments: Stripe
- Hosting: Vercel
- Cache: Upstash Redis

## Princípios

- Ship fast, iterate faster
- Developer Experience acima de tudo (5-min setup)
- Prefer server components quando possível
- Type-safe end-to-end
- Escrever código simples, não clever
- Commits pequenos e frequentes

## Estrutura de Pastas

- /app - Next.js pages
- /components - React components
- /lib - utilities
- /db - schema e migrações
- /docs - documentação

## Comandos

- dev: npm run dev
- build: npm run build
- test: npm run test

## O Que Fazer Sempre

- Escrever comentários em português quando ajudar contexto
- Fazer commits com mensagens descritivas
- Preferir server actions a API routes quando possível
- Usar TypeScript strict

## O Que Evitar

- NÃO adicionar libraries sem me perguntar
- NÃO fazer scope creep
- NÃO over-engineer
- NÃO criar testes se não pedir
