import { NextResponse } from "next/server";

/**
 * Erros do gateway, com forma estável.
 *
 * Quem os lê é o cliente do nosso cliente, muitas vezes dentro de um SDK, por
 * isso o `code` é a parte que interessa: é estável e programável, enquanto a
 * mensagem pode mudar.
 *
 * As mensagens não distinguem "key não existe" de "key de outro projeto" nem
 * dizem que serviço nosso falhou. Isso é detalhe interno e só ajudaria quem
 * estivesse a sondar o gateway.
 */

export type GatewayErrorCode =
  | "missing_api_key"
  | "invalid_api_key"
  | "key_revoked"
  | "key_expired"
  | "project_not_found"
  | "rate_limit_exceeded"
  | "upstream_timeout"
  | "upstream_unreachable"
  | "gateway_unavailable";

const STATUS: Record<GatewayErrorCode, number> = {
  missing_api_key: 401,
  invalid_api_key: 401,
  key_revoked: 403,
  key_expired: 403,
  project_not_found: 404,
  rate_limit_exceeded: 429,
  upstream_timeout: 504,
  upstream_unreachable: 502,
  gateway_unavailable: 503,
};

const MESSAGE: Record<GatewayErrorCode, string> = {
  missing_api_key:
    "Missing API key. Send it as: Authorization: Bearer <key> or X-API-Key: <key>.",
  invalid_api_key: "Invalid API key.",
  key_revoked: "This API key has been revoked.",
  key_expired: "This API key has expired.",
  project_not_found: "Unknown gateway. Check the slug in your gateway URL.",
  rate_limit_exceeded: "Rate limit exceeded.",
  upstream_timeout: "The upstream API did not respond in time.",
  upstream_unreachable: "The upstream API could not be reached.",
  gateway_unavailable: "The gateway is temporarily unavailable.",
};

/**
 * `details` acrescenta campos ao body sem mexer na forma base.
 *
 * Serve sobretudo o 429: um cliente que apanha um limite precisa de saber qual
 * era o limite e quando pode voltar, sem ter de ler headers. O Retry-After
 * continua a ir como header, porque é isso que os clientes HTTP leem sozinhos.
 */
export function gatewayError(
  code: GatewayErrorCode,
  headers?: HeadersInit,
  details?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json(
    { error: MESSAGE[code], code, ...details },
    { status: STATUS[code], headers },
  );
}

export function statusForCode(code: GatewayErrorCode): number {
  return STATUS[code];
}
