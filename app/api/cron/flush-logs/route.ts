import { NextResponse } from "next/server";

import { flushLogs, logStrategy } from "@/lib/logger";

/**
 * Esvazia o Redis Stream de logs para o Postgres. Chamado pelo cron da Vercel
 * a cada 60s (ver vercel.json).
 *
 * Só existe para LOG_STRATEGY=batch. Em `direct` não há stream nenhum e a
 * rota responde de imediato — assim alternar de estratégia não obriga a mexer
 * no agendamento.
 */

// Node e não edge: isto não está no caminho quente de ninguém e um flush pode
// levar segundos, acima do que o edge dá para uma função de background.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// O flush corre a sério; guardar a resposta não faria sentido nenhum.
export const revalidate = 0;

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    // 404 e não 401: um 401 confirma que a rota existe a quem a anda a sondar.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (logStrategy() !== "batch") {
    return NextResponse.json({ skipped: "LOG_STRATEGY não é batch" });
  }

  try {
    const result = await flushLogs();

    if (result.truncated) {
      // O stream cresce mais depressa do que um flush o esvazia. Ou o cron
      // está a correr com menos frequência do que devia, ou os tetos em
      // lib/logger.ts ficaram pequenos para este volume.
      console.warn(
        `[cron] flush cortado no teto: ${result.flushed} linhas, stream ainda com resto`,
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[cron] flush falhou:", error);

    // 500 de propósito: é assim que o cron aparece como falhado no dashboard
    // da Vercel. Os entries ficaram no stream e a próxima corrida repete.
    return NextResponse.json({ error: "flush falhou" }, { status: 500 });
  }
}

/**
 * O cron da Vercel manda `Authorization: Bearer $CRON_SECRET`.
 *
 * Sem CRON_SECRET definido a rota fica fechada em vez de aberta: uma rota que
 * escreve na base de dados não pode ficar pública por esquecimento de env var.
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] CRON_SECRET em falta: pedido recusado");
    return false;
  }

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());

  return match ? timingSafeEqual(match[1], secret) : false;
}

/**
 * Comparação de tempo constante. Um `===` sai no primeiro byte diferente e
 * deixa o segredo aberto a um ataque por tempo de resposta.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return diff === 0;
}
