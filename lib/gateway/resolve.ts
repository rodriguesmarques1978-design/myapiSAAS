import type { GatewayErrorCode } from "@/lib/gateway/errors";
import { isRateLimitWindow, type RateLimitWindow } from "@/lib/rate-limit";
import { getRedis } from "@/lib/redis";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resolve (slug, hash da key) → projeto + configuração da key.
 *
 * É o passo mais quente do gateway: corre em todos os pedidos, antes de
 * qualquer trabalho útil. Daí a cache no Redis à frente do Postgres.
 */

export type ResolvedRoute = {
  projectId: string;
  targetUrl: string;
  failOpen: boolean;
  keyId: string;
  rateLimitRequests: number;
  rateLimitWindow: RateLimitWindow;
  /** ISO ou null. Revalidado a cada hit, para a cache não sobreviver à expiração. */
  expiresAt: string | null;
};

export type ResolveResult =
  { ok: true; route: ResolvedRoute } | { ok: false; code: GatewayErrorCode };

/**
 * 60s é o compromisso: tira o Postgres do caminho quente sem deixar uma key
 * revogada viva tempo de mais. Quando a UI de keys existir, a revogação passa
 * a apagar a entrada explicitamente e este TTL deixa de ser o que manda.
 */
const CACHE_TTL_SECONDS = 60;

/**
 * Negativos são cacheados por muito menos tempo. Servem para uma enxurrada de
 * keys inválidas não virar uma enxurrada de queries ao Postgres, mas não podem
 * segurar uma key acabada de criar fora do ar.
 */
const NEGATIVE_CACHE_TTL_SECONDS = 10;

type CacheEntry =
  { hit: true; route: ResolvedRoute } | { hit: false; code: GatewayErrorCode };

function cacheKey(slug: string, keyHash: string): string {
  return `gw:route:${slug}:${keyHash}`;
}

/** Linha do join api_keys × projects. Não há tipos gerados do Supabase. */
type KeyRow = {
  id: string;
  revoked_at: string | null;
  expires_at: string | null;
  rate_limit_requests: number;
  rate_limit_window: string;
  projects: {
    id: string;
    slug: string;
    target_url: string;
    fail_open: boolean;
  } | null;
};

export async function resolveRoute(
  slug: string,
  keyHash: string,
): Promise<ResolveResult> {
  const redis = getRedis();

  // A cache é só otimização: se o Redis estiver em baixo seguimos para o
  // Postgres. O fail-closed de um outage do Redis vem do rate limiter, que
  // não tem fonte de verdade alternativa.
  if (redis) {
    try {
      const cached = await redis.get<CacheEntry>(cacheKey(slug, keyHash));

      if (cached) {
        if (!cached.hit) return { ok: false, code: cached.code };

        // A expiração é revalidada aqui e não confiada à cache: uma key com
        // expires_at dentro dos próximos 60s ficaria válida para lá da hora.
        if (isExpired(cached.route.expiresAt)) {
          return { ok: false, code: "key_expired" };
        }

        return { ok: true, route: cached.route };
      }
    } catch (error) {
      console.error("[gateway] leitura da cache falhou:", error);
    }
  }

  const supabase = createAdminClient();
  if (!supabase) {
    console.error(
      "[gateway] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em falta",
    );
    return { ok: false, code: "gateway_unavailable" };
  }

  const { data, error } = await supabase
    .from("api_keys")
    .select(
      "id, revoked_at, expires_at, rate_limit_requests, rate_limit_window, projects!inner(id, slug, target_url, fail_open)",
    )
    .eq("key_hash", keyHash)
    .maybeSingle<KeyRow>();

  if (error) {
    console.error("[gateway] lookup da key:", error.code, error.message);
    return { ok: false, code: "gateway_unavailable" };
  }

  const project = data?.projects ?? null;

  // Sem linha, ou a key é de outro projeto. Distinguir 404 de 401 custa uma
  // query extra, mas só no caminho de erro — que não é o caminho quente.
  if (!data || !project || project.slug !== slug) {
    const code = await classifyMiss(supabase, slug);
    await writeCache(redis, slug, keyHash, { hit: false, code });
    return { ok: false, code };
  }

  if (data.revoked_at) {
    await writeCache(redis, slug, keyHash, {
      hit: false,
      code: "key_revoked",
    });
    return { ok: false, code: "key_revoked" };
  }

  if (isExpired(data.expires_at)) {
    await writeCache(redis, slug, keyHash, {
      hit: false,
      code: "key_expired",
    });
    return { ok: false, code: "key_expired" };
  }

  // O check constraint da coluna garante isto, mas uma linha escrita à mão no
  // SQL Editor antes da migração podia trazer outra coisa. Cair no default é
  // melhor do que rebentar com o pedido a meio.
  const window = isRateLimitWindow(data.rate_limit_window)
    ? data.rate_limit_window
    : "1m";

  const route: ResolvedRoute = {
    projectId: project.id,
    targetUrl: project.target_url,
    failOpen: project.fail_open,
    keyId: data.id,
    rateLimitRequests: data.rate_limit_requests,
    rateLimitWindow: window,
    expiresAt: data.expires_at,
  };

  await writeCache(redis, slug, keyHash, { hit: true, route });

  return { ok: true, route };
}

function isExpired(expiresAt: string | null): boolean {
  return expiresAt !== null && Date.parse(expiresAt) <= Date.now();
}

/**
 * Um miss ou é slug desconhecido (404) ou é key errada para um slug que
 * existe (401). Não dizemos ao cliente qual das keys existe — só se o gateway
 * a que se dirigiu existe de todo, que é informação pública de qualquer forma.
 */
async function classifyMiss(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  slug: string,
): Promise<GatewayErrorCode> {
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[gateway] lookup do slug:", error.code, error.message);
    return "gateway_unavailable";
  }

  return data ? "invalid_api_key" : "project_not_found";
}

async function writeCache(
  redis: ReturnType<typeof getRedis>,
  slug: string,
  keyHash: string,
  entry: CacheEntry,
): Promise<void> {
  if (!redis) return;

  // Um 503 é estado nosso, não do cliente: cachear isso prolongaria o outage
  // depois de o Supabase já ter voltado.
  if (!entry.hit && entry.code === "gateway_unavailable") return;

  try {
    await redis.set(cacheKey(slug, keyHash), entry, {
      ex: entry.hit ? CACHE_TTL_SECONDS : NEGATIVE_CACHE_TTL_SECONDS,
    });
  } catch (error) {
    console.error("[gateway] escrita na cache falhou:", error);
  }
}
