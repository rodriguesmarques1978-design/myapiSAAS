import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Subdomínio do gateway. Em produção os clientes batem em
 * gw.myapi.dev/<slug>/<path>, que é reescrito para a route /gw/<slug>/<path>.
 *
 * Em desenvolvimento não há subdomínio: chama-se /gw/... diretamente.
 */
const GATEWAY_HOST_PREFIX = "gw.";

export async function middleware(request: NextRequest) {
  if (isGatewayRequest(request)) return gatewayRewrite(request);

  return await updateSession(request);
}

function isGatewayRequest(request: NextRequest): boolean {
  // O host vem do header e não do nextUrl: atrás do proxy da Vercel, o
  // nextUrl.hostname é o interno, não o que o cliente pediu.
  const host = request.headers.get("host") ?? "";

  return (
    host.startsWith(GATEWAY_HOST_PREFIX) ||
    request.nextUrl.pathname.startsWith("/gw/")
  );
}

/**
 * Encaminha o pedido para a route do gateway sem lhe tocar em mais nada.
 *
 * O ponto importante é o early return: o gateway não tem sessão nem cookies, e
 * passar por updateSession custava uma revalidação de token no Supabase a cada
 * pedido — latência pura no caminho quente, para deitar fora o resultado.
 */
function gatewayRewrite(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Já vem com /gw/ (chamada direta em dev, ou um rewrite anterior).
  if (pathname.startsWith("/gw/") || pathname === "/gw") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/gw${pathname}`;

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    /*
     * Corre em tudo menos assets estáticos e imagens — esses não precisam de
     * sessão e cada passagem pelo middleware custa uma revalidação de token.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ico)$).*)",
  ],
};
