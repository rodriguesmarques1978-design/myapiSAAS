import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnv } from "./env";

/**
 * Client para Server Components, Server Actions e Route Handlers.
 *
 * Tem de ser criado por request — nunca guardar numa variável de módulo, senão
 * a sessão de um utilizador fica partilhada com os outros.
 */
export function createClient() {
  const cookieStore = cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components não podem escrever cookies. É seguro ignorar:
          // o middleware já refresca a sessão em cada request.
        }
      },
    },
  });
}
