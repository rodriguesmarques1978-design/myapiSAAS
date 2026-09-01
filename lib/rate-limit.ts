import { Ratelimit } from "@upstash/ratelimit";

import { getRedis } from "@/lib/redis";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Rate limiting por projeto / key / endpoint, com janela deslizante.
 *
 * Sliding window e não fixed window de propósito: com janela fixa, um cliente
 * com limite de 1000/min consegue mandar 2000 pedidos em dois segundos se os
 * puser em cima da fronteira dos minutos. A deslizante não tem essa aresta.
 *
 * A resolução da regra está em funções puras (selectRule, matchesEndpoint) para
 * poder ser testada sem Redis nem Postgres à frente.
 */

/** Janelas aceites. Espelha o check constraint de rate_limits.window. */
export const RATE_LIMIT_WINDOWS = [
  "1s",
  "10s",
  "1m",
  "5m",
  "1h",
  "1d",
] as const;

export type RateLimitWindow = (typeof RATE_LIMIT_WINDOWS)[number];

export function isRateLimitWindow(value: string): value is RateLimitWindow {
  return (RATE_LIMIT_WINDOWS as readonly string[]).includes(value);
}

/** Usado quando não há regra na tabela nem limites na api_key. */
export const DEFAULT_RULE: RateLimitRule = { requests: 100, window: "1m" };

export type RateLimitRule = {
  requests: number;
  window: RateLimitWindow;
};

/**
 * Regra escolhida, mais o âmbito do contador.
 *
 * `perEndpoint` decide se os pedidos a paths diferentes partilham contador ou
 * não — tem de vir da regra que ganhou, não do conjunto todo.
 */
export type SelectedRule = RateLimitRule & { perEndpoint: boolean };

/** Linha de public.rate_limits. Não há tipos gerados do Supabase. */
export type RateLimitRow = {
  api_key_id: string | null;
  endpoint: string | null;
  requests: number;
  window: string;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Unix em segundos — o formato do header x-ratelimit-reset. */
  resetAt: number;
};

/* -------------------------------------------------------------------------
 * Resolução da regra (lógica pura)
 * ---------------------------------------------------------------------- */

/**
 * Um endpoint guardado pode ser exato (/v1/chat) ou prefixo (/v1/chat*).
 *
 * O prefixo existe porque paths REST trazem ids no meio (/v1/users/42) e uma
 * regra que só casasse exatamente seria inútil para eles.
 */
export function matchesEndpoint(
  pattern: string | null,
  endpoint: string,
): boolean {
  // null = a regra vale para todos os endpoints.
  if (pattern === null) return true;

  if (pattern.endsWith("*")) return endpoint.startsWith(pattern.slice(0, -1));

  return pattern === endpoint;
}

/**
 * Pontuação de especificidade de uma regra. Ganha a mais alta.
 *
 * key + endpoint (3) > só key (2) > só endpoint (1) > projeto inteiro (0).
 *
 * Uma regra para esta key e este endpoint é uma decisão deliberada sobre um
 * caso concreto, por isso tem de ganhar a uma regra genérica do projeto.
 */
function specificity(row: RateLimitRow, apiKeyId: string): number {
  const keyScore = row.api_key_id === apiKeyId ? 2 : 0;
  const endpointScore = row.endpoint !== null ? 1 : 0;

  return keyScore + endpointScore;
}

/**
 * Escolhe a regra a aplicar de entre as regras do projeto.
 *
 * Devolve null se nenhuma se aplicar — quem chama decide o fallback.
 */
export function selectRule(
  rows: RateLimitRow[],
  apiKeyId: string,
  endpoint: string,
): SelectedRule | null {
  let best: RateLimitRow | null = null;
  let bestScore = -1;

  for (const row of rows) {
    // Uma regra de outra key não se aplica a esta. Regras com api_key_id null
    // valem para todas as keys do projeto.
    if (row.api_key_id !== null && row.api_key_id !== apiKeyId) continue;

    if (!matchesEndpoint(row.endpoint, endpoint)) continue;

    const score = specificity(row, apiKeyId);

    // Estritamente maior: com empate fica a primeira, e o índice unique da
    // migração garante que não há dois âmbitos iguais para desempatar.
    if (score > bestScore) {
      best = row;
      bestScore = score;
    }
  }

  if (!best) return null;

  return {
    requests: best.requests,
    // O check constraint garante isto, mas uma linha escrita à mão antes da
    // migração podia trazer outra coisa. Cair no default é melhor do que
    // rebentar com o pedido a meio.
    window: isRateLimitWindow(best.window) ? best.window : DEFAULT_RULE.window,
    // Sai daqui e não de uma segunda passagem pelas linhas: o que conta é se a
    // regra escolhida é de endpoint, não se existe alguma no projeto. Um limite
    // de key sem endpoint contado por endpoint multiplicava-se pelo número de
    // endpoints que o cliente chamasse.
    perEndpoint: best.endpoint !== null,
  };
}

/* -------------------------------------------------------------------------
 * Leitura das regras, com cache
 * ---------------------------------------------------------------------- */

/**
 * As regras de um projeto são poucas e mudam raramente, por isso lê-se o
 * conjunto todo de uma vez e escolhe-se em memória — uma query em vez de uma
 * por combinação de âmbito.
 */
const RULES_CACHE_TTL_SECONDS = 60;

function rulesCacheKey(projectId: string): string {
  return `gw:rules:${projectId}`;
}

async function loadRules(projectId: string): Promise<RateLimitRow[] | null> {
  const redis = getRedis();

  if (redis) {
    try {
      const cached = await redis.get<RateLimitRow[]>(rulesCacheKey(projectId));
      if (cached) return cached;
    } catch (error) {
      console.error("[rate-limit] leitura da cache de regras falhou:", error);
    }
  }

  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("rate_limits")
    .select("api_key_id, endpoint, requests, window")
    .eq("project_id", projectId);

  if (error) {
    console.error("[rate-limit] lookup de regras:", error.code, error.message);
    return null;
  }

  const rows = (data ?? []) as RateLimitRow[];

  if (redis) {
    try {
      // Cacheado mesmo quando vazio: a maioria dos projetos não tem regras
      // nenhumas, e é justamente esse caso que não pode ir ao Postgres a cada
      // pedido.
      await redis.set(rulesCacheKey(projectId), rows, {
        ex: RULES_CACHE_TTL_SECONDS,
      });
    } catch (error) {
      console.error("[rate-limit] escrita da cache de regras falhou:", error);
    }
  }

  return rows;
}

/* -------------------------------------------------------------------------
 * Limiter
 * ---------------------------------------------------------------------- */

/**
 * Os limiters são memoizados por (limite, janela) e não por key.
 *
 * O objeto Ratelimit não guarda estado do cliente — esse vive no Redis, sob o
 * identificador que passamos ao .limit(). Criar um por API key encheria a
 * memória da instância à conta de nada.
 */
const limiters = new Map<string, Ratelimit>();

function getLimiter(rule: RateLimitRule): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  const cacheKey = `${rule.requests}:${rule.window}`;
  const existing = limiters.get(cacheKey);
  if (existing) return existing;

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(rule.requests, rule.window),
    prefix: "gw:rl",
    // O analytics do Upstash escreve contadores extra por pedido. As nossas
    // métricas saem de request_logs, por isso seria só custo.
    analytics: false,
  });

  limiters.set(cacheKey, limiter);
  return limiter;
}

/**
 * Identificador do contador no Redis.
 *
 * Inclui sempre a api_key_id, mesmo quando a regra é do projeto inteiro: uma
 * regra ampla significa "cada key tem este limite", não "todas as keys
 * partilham este limite". Partilhar o contador entre keys faria um cliente
 * esgotar o limite de outro.
 *
 * O endpoint entra quando a regra é por endpoint, para os contadores de
 * endpoints diferentes não se misturarem.
 */
export function counterId(
  projectId: string,
  apiKeyId: string,
  endpoint: string,
  ruleIsPerEndpoint: boolean,
): string {
  const scope = ruleIsPerEndpoint ? `:${endpoint}` : "";
  return `${projectId}:${apiKeyId}${scope}`;
}

/* -------------------------------------------------------------------------
 * API pública
 * ---------------------------------------------------------------------- */

/**
 * Verifica e consome uma unidade do limite.
 *
 * Ordem de precedência: regra em rate_limits → `fallback` (os limites da
 * própria api_key, que o gateway já tem em mão) → DEFAULT_RULE.
 *
 * O `fallback` é opcional para a assinatura de três argumentos funcionar tal
 * como pedida. Quando quem chama já resolveu a key — que é o caso do gateway —
 * passá-lo evita uma segunda ida ao Postgres no caminho quente.
 *
 * Devolve null se o Redis não estiver configurado ou falhar. Quem chama trata
 * isso como fail-closed (503): deixar passar sem contar seria dar tráfego
 * grátis e ilimitado durante um outage nosso.
 */
export async function checkRateLimit(
  projectId: string,
  apiKeyId: string,
  endpoint: string,
  fallback?: RateLimitRule,
): Promise<RateLimitResult | null> {
  const rows = await loadRules(projectId);

  // null = a leitura das regras falhou. Aplicar o default nesse caso seria
  // ignorar em silêncio um limite que o cliente configurou.
  if (rows === null) return null;

  const matched = selectRule(rows, apiKeyId, endpoint);

  // Sem regra na tabela, o fallback e o default valem para a key inteira.
  const rule: SelectedRule = matched ?? {
    ...(fallback ?? DEFAULT_RULE),
    perEndpoint: false,
  };

  const limiter = getLimiter(rule);
  if (!limiter) return null;

  try {
    const result = await limiter.limit(
      counterId(projectId, apiKeyId, endpoint, rule.perEndpoint),
    );

    return {
      allowed: result.success,
      limit: result.limit,
      remaining: Math.max(0, result.remaining),
      // O Upstash devolve milissegundos; o header é em segundos.
      resetAt: Math.ceil(result.reset / 1000),
    };
  } catch (error) {
    console.error("[rate-limit] limiter falhou:", error);
    return null;
  }
}

/* -------------------------------------------------------------------------
 * Headers
 * ---------------------------------------------------------------------- */

/**
 * Headers x-ratelimit-* que vão em toda a resposta, não só nos 429.
 *
 * É o que o cliente precisa para se auto-regular antes de bater no limite, e é
 * o que a landing page mostra no exemplo do curl.
 */
export function rateLimitHeaders(
  result: RateLimitResult,
): Record<string, string> {
  return {
    "x-ratelimit-limit": String(result.limit),
    "x-ratelimit-remaining": String(result.remaining),
    "x-ratelimit-reset": String(result.resetAt),
  };
}

/**
 * Segundos até ao reset, para o header Retry-After de um 429.
 *
 * Nunca menos de 1: um Retry-After de 0 convida o cliente a repetir de
 * imediato, que é o oposto do que um 429 quer dizer.
 */
export function retryAfterSeconds(
  result: RateLimitResult,
  now: number = Date.now(),
): number {
  return Math.max(1, result.resetAt - Math.ceil(now / 1000));
}
