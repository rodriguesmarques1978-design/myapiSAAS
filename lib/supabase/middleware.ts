import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "./env";

/**
 * Refresca o token de sessão e reescreve os cookies na response.
 *
 * Chamado pelo middleware.ts na root. Sem isto, Server Components acabam a ler
 * tokens expirados, porque não conseguem escrever cookies.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // IMPORTANTE: não meter código entre createServerClient e getUser().
  // getUser() revalida o token junto do Supabase; adiar esta chamada faz com
  // que sessões sejam terminadas de forma aleatória e difícil de debugar.
  await supabase.auth.getUser();

  return supabaseResponse;
}
