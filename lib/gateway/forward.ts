/**
 * Reencaminhamento do pedido para a origin do cliente.
 *
 * A promessa da landing page é "same paths, same headers, same bodies". O que
 * este módulo tira é só o que um proxy tem obrigação de tirar.
 */

/**
 * Abaixo do limite de execução do edge no Vercel, para sermos nós a devolver
 * um 504 explicável em vez de a plataforma cortar o pedido a meio.
 */
const TIMEOUT_MS = 25_000;

/**
 * Headers hop-by-hop (RFC 9110 §7.6.1): dizem respeito à ligação entre dois
 * nós, não ao pedido. Reencaminhá-los corrompe a ligação seguinte.
 *
 * content-length e host vão fora à mesma: o fetch recalcula-os a partir do
 * corpo e do destino reais.
 */
const HOP_BY_HOP = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

const STRIP_FROM_REQUEST = new Set(
  HOP_BY_HOP.concat([
    "host",
    "content-length",
    // A key é nossa, não da origin — nas duas formas em que a aceitamos. Vai
    // substituída por x-myapi-key-id.
    "authorization",
    "x-api-key",
    // Vêm do cliente e não são de confiar. Escrevemos os nossos por baixo.
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
  ]),
);

/**
 * content-encoding e content-length saem da resposta porque o fetch já
 * descomprimiu o corpo que estamos a passar adiante. Mantê-los faria o cliente
 * tentar descomprimir texto simples, e é dos bugs mais chatos de diagnosticar
 * num proxy.
 */
const STRIP_FROM_RESPONSE = new Set(
  HOP_BY_HOP.concat(["content-encoding", "content-length"]),
);

export type ForwardContext = {
  targetUrl: string;
  /** Já com a barra inicial, ou vazio. Vem cru do URL, sem re-encoding. */
  path: string;
  /** Query string com o "?", ou vazia. */
  search: string;
  keyId: string;
  projectId: string;
};

export type ForwardResult =
  | { ok: true; response: Response; responseBytes: number | null }
  | { ok: false; code: "upstream_timeout" | "upstream_unreachable" };

export function buildTargetUrl(ctx: ForwardContext): string {
  // Sem barras duplas na junção, e o target_url pode trazer o seu próprio
  // prefixo de path (https://api.exemplo.com/api), que é para preservar.
  const base = ctx.targetUrl.replace(/\/+$/, "");
  return `${base}${ctx.path}${ctx.search}`;
}

export async function forwardRequest(
  request: Request,
  ctx: ForwardContext,
): Promise<ForwardResult> {
  const headers = new Headers();

  request.headers.forEach((value, name) => {
    if (!STRIP_FROM_REQUEST.has(name.toLowerCase())) headers.set(name, value);
  });

  // A origin fica a saber que key fez o pedido sem nunca ver a key. Chega para
  // atribuir uso a um cliente do lado dela.
  headers.set("x-myapi-key-id", ctx.keyId);
  headers.set("x-myapi-project-id", ctx.projectId);

  const forwardedFor = clientIp(request);
  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);

  const origin = new URL(request.url);
  headers.set("x-forwarded-host", origin.host);
  headers.set("x-forwarded-proto", origin.protocol.replace(":", ""));

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  try {
    const response = await fetch(buildTargetUrl(ctx), {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      // Exigido quando o corpo é um stream: diz ao runtime que só enviamos,
      // não lemos em simultâneo.
      ...(hasBody ? { duplex: "half" } : {}),
      // Um 3xx da origin é resposta dela e vai inteiro para o cliente. Segui-lo
      // aqui esconderia o redirect de quem o pediu.
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    } as RequestInit);

    const responseBytes = parseContentLength(
      response.headers.get("content-length"),
    );

    const outHeaders = new Headers();
    response.headers.forEach((value, name) => {
      if (!STRIP_FROM_RESPONSE.has(name.toLowerCase())) {
        outHeaders.set(name, value);
      }
    });

    return {
      ok: true,
      response: new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: outHeaders,
      }),
      responseBytes,
    };
  } catch (error) {
    // AbortSignal.timeout rejeita com TimeoutError; um abort do cliente dá
    // AbortError. Distinguir importa: um é culpa da origin, o outro não.
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return { ok: false, code: "upstream_timeout" };
    }

    console.error("[gateway] origin inacessível:", error);
    return { ok: false, code: "upstream_unreachable" };
  }
}

/** Primeiro IP do x-forwarded-for do edge, que é o do cliente real. */
function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  return request.headers.get("x-real-ip");
}

export function parseContentLength(value: string | null): number | null {
  if (!value) return null;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
