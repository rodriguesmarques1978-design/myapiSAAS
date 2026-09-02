import { Redis } from "@upstash/redis";

/**
 * Cliente Upstash Redis — SÓ para uso server-side.
 *
 * O token é de escrita: nunca importar isto a partir de um client component,
 * senão vai parar ao bundle do browser.
 *
 * Segue o mesmo padrão de lib/supabase/admin.ts: devolve null se as env vars
 * não estiverem definidas, para quem chama poder responder 503 em vez de
 * rebentar no import. No gateway isso traduz-se em fail-closed.
 *
 * É REST-based (fetch por baixo), por isso funciona no edge runtime, onde não
 * há sockets TCP.
 */

let client: Redis | null | undefined;

export function getRedis(): Redis | null {
  // Memoizado: o construtor não abre ligação nenhuma, mas em edge cada
  // instância recriada por pedido é desperdício à mesma.
  if (client !== undefined) return client;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  client = url && token ? new Redis({ url, token }) : null;

  return client;
}
