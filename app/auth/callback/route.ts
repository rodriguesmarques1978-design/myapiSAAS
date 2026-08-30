import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Troca o `code` dos links de email (recovery, confirmação) por uma sessão.
 *
 * O Supabase manda o utilizador para aqui; nós pomos os cookies e reencaminhamos.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  // Só caminhos relativos. Sem isto, `?next=//evil.com` mandava o utilizador
  // para fora do site com a sessão acabada de criar. A barra invertida também
  // é recusada: há browsers que leem `/\` como `//`.
  const destination = next && /^\/(?![\/\\])/.test(next) ? next : "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=link`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth] callback:", error.code ?? "no-code", error.message);
    return NextResponse.redirect(`${origin}/login?error=link`);
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
