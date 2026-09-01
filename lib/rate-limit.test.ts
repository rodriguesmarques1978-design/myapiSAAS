import { describe, expect, it } from "vitest";

import {
  counterId,
  DEFAULT_RULE,
  isRateLimitWindow,
  matchesEndpoint,
  rateLimitHeaders,
  retryAfterSeconds,
  selectRule,
  type RateLimitRow,
} from "@/lib/rate-limit";

/**
 * Testes da lógica pura de resolução de regras.
 *
 * O checkRateLimit em si não é testado aqui: precisaria de Redis e Postgres a
 * sério, e o que tem de interessante — qual a regra que ganha e como se conta —
 * está todo nestas funções.
 */

const KEY = "key-1";
const OTHER_KEY = "key-2";

function row(overrides: Partial<RateLimitRow> = {}): RateLimitRow {
  return {
    api_key_id: null,
    endpoint: null,
    requests: 100,
    window: "1m",
    ...overrides,
  };
}

describe("matchesEndpoint", () => {
  it("null vale para todos os endpoints", () => {
    expect(matchesEndpoint(null, "/v1/qualquer")).toBe(true);
  });

  it("sem asterisco, compara exatamente", () => {
    expect(matchesEndpoint("/v1/chat", "/v1/chat")).toBe(true);
    expect(matchesEndpoint("/v1/chat", "/v1/chat/stream")).toBe(false);
    expect(matchesEndpoint("/v1/chat", "/v1/cha")).toBe(false);
  });

  it("com asterisco, compara por prefixo", () => {
    expect(matchesEndpoint("/v1/chat*", "/v1/chat")).toBe(true);
    expect(matchesEndpoint("/v1/chat*", "/v1/chat/stream")).toBe(true);
    expect(matchesEndpoint("/v1/users/*", "/v1/users/42")).toBe(true);
    expect(matchesEndpoint("/v1/chat*", "/v1/embeddings")).toBe(false);
  });
});

describe("selectRule", () => {
  it("sem regras, devolve null para quem chama decidir o fallback", () => {
    expect(selectRule([], KEY, "/v1/chat")).toBeNull();
  });

  it("ignora regras de outra key", () => {
    const rows = [row({ api_key_id: OTHER_KEY, requests: 5 })];

    expect(selectRule(rows, KEY, "/v1/chat")).toBeNull();
  });

  it("ignora regras cujo endpoint não casa", () => {
    const rows = [row({ endpoint: "/v1/embeddings", requests: 5 })];

    expect(selectRule(rows, KEY, "/v1/chat")).toBeNull();
  });

  it("aplica uma regra do projeto inteiro", () => {
    const rows = [row({ requests: 50, window: "10s" })];

    expect(selectRule(rows, KEY, "/v1/chat")).toEqual({
      requests: 50,
      window: "10s",
      perEndpoint: false,
    });
  });

  it("key + endpoint ganha a só key, que ganha a só endpoint, que ganha ao projeto", () => {
    const rows = [
      row({ requests: 1 }),
      row({ endpoint: "/v1/chat", requests: 2 }),
      row({ api_key_id: KEY, requests: 3 }),
      row({ api_key_id: KEY, endpoint: "/v1/chat", requests: 4 }),
    ];

    // A mais específica das quatro.
    expect(selectRule(rows, KEY, "/v1/chat")?.requests).toBe(4);

    // Tirada essa, ganha a de key sem endpoint (2 pontos) e não a de endpoint
    // sem key (1 ponto).
    expect(selectRule(rows.slice(0, 3), KEY, "/v1/chat")?.requests).toBe(3);

    expect(selectRule(rows.slice(0, 2), KEY, "/v1/chat")?.requests).toBe(2);
    expect(selectRule(rows.slice(0, 1), KEY, "/v1/chat")?.requests).toBe(1);
  });

  it("a ordem das linhas não muda o resultado", () => {
    const rows = [
      row({ api_key_id: KEY, endpoint: "/v1/chat", requests: 4 }),
      row({ requests: 1 }),
    ];

    expect(selectRule(rows, KEY, "/v1/chat")?.requests).toBe(4);
    expect(selectRule([...rows].reverse(), KEY, "/v1/chat")?.requests).toBe(4);
  });

  it("marca perEndpoint só quando a regra que ganhou é de endpoint", () => {
    // A regra de key sem endpoint ganha (2 pontos) à de endpoint sem key (1).
    // O contador tem de ser da key inteira, senão o limite de 50 passava a ser
    // 50 por cada path chamado.
    const rows = [
      row({ api_key_id: KEY, requests: 50 }),
      row({ endpoint: "/v1/chat", requests: 10 }),
    ];

    expect(selectRule(rows, KEY, "/v1/chat")).toEqual({
      requests: 50,
      window: "1m",
      perEndpoint: false,
    });
  });

  it("uma janela inválida na base de dados cai no default em vez de rebentar", () => {
    const rows = [row({ requests: 7, window: "2 fortnights" })];

    expect(selectRule(rows, KEY, "/v1/chat")).toEqual({
      requests: 7,
      window: DEFAULT_RULE.window,
      perEndpoint: false,
    });
  });
});

describe("counterId", () => {
  it("inclui sempre a key, para uma key não gastar o limite de outra", () => {
    expect(counterId("proj", KEY, "/v1/chat", false)).toBe(`proj:${KEY}`);
    expect(counterId("proj", OTHER_KEY, "/v1/chat", false)).toBe(
      `proj:${OTHER_KEY}`,
    );
  });

  it("junta o endpoint só quando a regra é por endpoint", () => {
    expect(counterId("proj", KEY, "/v1/chat", true)).toBe(
      `proj:${KEY}:/v1/chat`,
    );

    // Sem perEndpoint, paths diferentes partilham o mesmo contador.
    expect(counterId("proj", KEY, "/v1/chat", false)).toBe(
      counterId("proj", KEY, "/v1/embeddings", false),
    );
  });
});

describe("retryAfterSeconds", () => {
  it("conta os segundos que faltam para o reset", () => {
    const now = 1_700_000_000_000;
    const result = {
      allowed: false,
      limit: 10,
      remaining: 0,
      resetAt: Math.ceil(now / 1000) + 30,
    };

    expect(retryAfterSeconds(result, now)).toBe(30);
  });

  it("nunca devolve menos de 1, mesmo com o reset já passado", () => {
    const now = 1_700_000_000_000;
    const result = {
      allowed: false,
      limit: 10,
      remaining: 0,
      resetAt: Math.ceil(now / 1000) - 5,
    };

    // Um Retry-After de 0 convidava o cliente a repetir de imediato.
    expect(retryAfterSeconds(result, now)).toBe(1);
  });
});

describe("rateLimitHeaders", () => {
  it("usa os nomes que a landing page documenta", () => {
    expect(
      rateLimitHeaders({
        allowed: true,
        limit: 1000,
        remaining: 993,
        resetAt: 1735689600,
      }),
    ).toEqual({
      "x-ratelimit-limit": "1000",
      "x-ratelimit-remaining": "993",
      "x-ratelimit-reset": "1735689600",
    });
  });
});

describe("isRateLimitWindow", () => {
  it("aceita as janelas do check constraint e recusa o resto", () => {
    expect(isRateLimitWindow("1m")).toBe(true);
    expect(isRateLimitWindow("1d")).toBe(true);
    expect(isRateLimitWindow("2m")).toBe(false);
    expect(isRateLimitWindow("")).toBe(false);
  });
});
