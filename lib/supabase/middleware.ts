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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && isUnder(pathname, PROTECTED_ROUTES)) {
    return redirectKeepingCookies(request, "/login", supabaseResponse);
  }

  if (user && isUnder(pathname, AUTH_ROUTES)) {
    return redirectKeepingCookies(request, "/dashboard", supabaseResponse);
  }

  return supabaseResponse;
}

/** Páginas que só fazem sentido sem sessão. */
const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];

/** Páginas que só fazem sentido com sessão. */
const PROTECTED_ROUTES = ["/dashboard"];

function isUnder(pathname: string, routes: string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * Redireciona sem perder os cookies que o refresh acabou de emitir.
 *
 * Se a resposta do redirect fosse criada do zero, o token renovado ficava para
 * trás e o utilizador era desligado no pedido seguinte.
 */
function redirectKeepingCookies(
  request: NextRequest,
  pathname: string,
  from: NextResponse,
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";

  const response = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));

  return response;
}
