function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Env var ${name} em falta. Copia o .env.example para .env.local e preenche-a.`,
    );
  }
  return value;
}

/**
 * Env vars públicas do Supabase, partilhadas pelos três clients.
 *
 * Precisam do prefixo NEXT_PUBLIC_ porque o browser client corre no bundle do
 * cliente — sem o prefixo o Next.js não as injeta e chegam como undefined.
 *
 * As referências a process.env.NEXT_PUBLIC_* têm de ser literais: o Next.js
 * substitui-as em build time e acesso dinâmico (process.env[nome]) não funciona
 * no browser.
 */
export function getSupabaseEnv() {
  return {
    url: required(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    anonKey: required(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
}
