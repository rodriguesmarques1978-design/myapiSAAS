import { gatewayError } from "@/lib/gateway/errors";
import { forwardRequest, parseContentLength } from "@/lib/gateway/forward";
import { extractApiKey, hashKey } from "@/lib/gateway/keys";
import { logRequest } from "@/lib/logger";
import {
  checkRateLimit,
  rateLimitHeaders,
  retryAfterSeconds,
} from "@/lib/rate-limit";
import { resolveRoute } from "@/lib/gateway/resolve";

/**
 * O gateway: gw.myapi.dev/<slug>/<path> → target_url do projeto/<path>.
 *
 * Catch-all opcional ([[...path]]) para o slug sozinho também bater aqui —
 * gw.myapi.dev/acme tem de chegar à raiz da origin.
 */

// Corre perto do cliente, para o hop extra ser o mais curto possível. Obriga a
// Web APIs em vez de APIs do Node — daí o crypto.subtle em lib/gateway/keys.ts.
export const runtime = "edge";

// Nada aqui é cacheável: cada pedido tem de contar para o rate limit.
export const dynamic = "force-dynamic";

type Params = { params: { slug: string; path?: string[] } };

async function handle(request: Request, { params }: Params): Promise<Response> {
  const startedAt = Date.now();
  const { slug } = params;

  // O path sai do URL cru e não de params.path: o Next descodifica os
  // segmentos, e re-codificá-los estragaria paths com %2F ou espaços. Assim
  // o que chega à origin é byte a byte o que o cliente escreveu.
  const url = new URL(request.url);
  const segments = url.pathname.split("/").slice(3);
  const path = segments.length > 0 ? `/${segments.join("/")}` : "";

  const rawKey = extractApiKey(request);
  if (!rawKey) return gatewayError("missing_api_key");

  const resolved = await resolveRoute(slug, await hashKey(rawKey));
  if (!resolved.ok) return gatewayError(resolved.code);

  const route = resolved.route;

  const requestBytes = parseContentLength(
    request.headers.get("content-length"),
  );

  const logAndReturn = (response: Response, responseBytes: number | null) => {
    logRequest({
      projectId: route.projectId,
      apiKeyId: route.keyId,
      method: request.method,
      endpoint,
      statusCode: response.status,
      latencyMs: Date.now() - startedAt,
      // A hora do request, não a da escrita: no modo batch a linha só chega
      // ao Postgres no flush seguinte, até 60s depois.
      timestamp: startedAt,
      requestBytes,
      responseBytes,
    });

    return response;
  };

  // O endpoint do limite é o path do lado da origin, normalizado: as regras
  // em rate_limits são escritas contra ele, não contra o /gw/<slug>/... .
  const endpoint = path || "/";

  // Os limites da própria key vão como fallback porque já foram lidos no
  // resolveRoute. Sem isto, o checkRateLimit ia buscá-los outra vez ao
  // Postgres em cada pedido.
  const limit = await checkRateLimit(route.projectId, route.keyId, endpoint, {
    requests: route.rateLimitRequests,
    window: route.rateLimitWindow,
  });

  // Sem Redis não há como contar, e deixar passar sem contar seria dar
  // tráfego ilimitado durante um outage nosso. Fail-closed.
  if (!limit) {
    return logAndReturn(gatewayError("gateway_unavailable"), null);
  }

  const headers = rateLimitHeaders(limit);

  if (!limit.allowed) {
    const retryAfter = retryAfterSeconds(limit);

    const response = gatewayError(
      "rate_limit_exceeded",
      { ...headers, "retry-after": String(retryAfter) },
      {
        limit: limit.limit,
        remaining: limit.remaining,
        reset_at: limit.resetAt,
        retry_after: retryAfter,
        endpoint,
      },
    );

    return logAndReturn(response, null);
  }

  const forwarded = await forwardRequest(request, {
    targetUrl: route.targetUrl,
    path,
    search: url.search,
    keyId: route.keyId,
    projectId: route.projectId,
  });

  if (!forwarded.ok) {
    const response = gatewayError(forwarded.code, headers);
    return logAndReturn(response, null);
  }

  // Os x-ratelimit-* vão em todas as respostas, não só nos 429: é assim que o
  // cliente se auto-regula antes de bater no limite.
  for (const [name, value] of Object.entries(headers)) {
    forwarded.response.headers.set(name, value);
  }

  return logAndReturn(forwarded.response, forwarded.responseBytes);
}

// Um gateway é agnóstico ao método: o que a origin aceitar, nós passamos.
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
export const OPTIONS = handle;
