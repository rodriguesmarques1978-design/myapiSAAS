import { getRedis } from "@/lib/redis";
import { insertRequestLogs, type RequestLogRow } from "@/lib/gateway/log";

/**
 * Logging de requests do gateway, com duas estratégias.
 *
 * O problema: escrever uma linha no Postgres por cada request põe 20-50ms de
 * latência no caminho quente e uma ligação por request numa base de dados que
 * não foi dimensionada para isso.
 *
 * As duas saídas:
 *
 *   direct — insert no Postgres, disparado sem esperar. Simples, sem peças
 *            móveis. Chega bem abaixo de ~1000 req/dia, que é onde a maior
 *            parte dos projetos vive.
 *
 *   batch  — XADD para um Redis Stream (um round-trip REST, sem transação) e
 *            um cron a esvaziar para o Postgres a cada 60s. Troca frescura
 *            dos dados por escrita constante.
 *
 * Escolhe-se com LOG_STRATEGY. O default é `direct` de propósito: o `batch` só
 * funciona com o cron de /api/cron/flush-logs realmente agendado, e um batch
 * sem cron é um stream a encher até ao teto sem nada do outro lado.
 */

export type LogStrategy = "direct" | "batch";

export type LogEntry = {
  projectId: string;
  apiKeyId: string | null;
  /** Path do lado da origin, já sem o prefixo /gw/<slug>. */
  endpoint: string;
  method: string;
  statusCode: number;
  latencyMs: number;
  /** Epoch em ms. Default: agora. Ver a nota sobre created_at abaixo. */
  timestamp?: number;
  /** Do content-length; null em respostas chunked. */
  requestBytes?: number | null;
  responseBytes?: number | null;
};

/** Stream único para todos os projetos. Segue o prefixo de lib/gateway/resolve.ts. */
export const LOG_STREAM_KEY = "gw:logs";

/**
 * Teto do stream, para um cron parado não encher o Redis até à fatura doer.
 *
 * Com `~` o Redis apara por nós inteiros em vez de contar ao entry exato — é
 * bastante mais barato e o excesso é irrelevante a esta escala.
 */
const STREAM_MAXLEN = 100_000;

export function logStrategy(): LogStrategy {
  return process.env.LOG_STRATEGY === "batch" ? "batch" : "direct";
}

/**
 * Regista um request. Não bloqueia e nunca rejeita.
 *
 * Um log que rebenta não pode derrubar o pedido que o originou: o cliente já
 * teve a resposta dele, e analytics não é motivo para um 500.
 */
export function logRequest(entry: LogEntry): void {
  void writeLog(entry).catch((error) => {
    console.error("[logger] log rebentou:", error);
  });
}

/**
 * O trabalho real. Exportado para os testes e para quem precise de esperar.
 *
 * Cai para o Postgres quando o `batch` está ligado mas o Redis não responde —
 * um log tardio é melhor do que um log perdido, e o custo é assumido só no
 * caminho degradado.
 */
export async function writeLog(entry: LogEntry): Promise<void> {
  const at = entry.timestamp ?? Date.now();

  if (logStrategy() === "batch") {
    const written = await appendToStream(entry, at);
    if (written) return;
  }

  await insertRequestLogs([toRow(entry, at)]);
}

/**
 * created_at vai explícito e não fica ao default do Postgres.
 *
 * No `batch` a linha só é escrita até 60s depois do request. Deixar o now() da
 * base de dados decidir empurrava cada pedido para a janela do flush e as
 * analytics passavam a mostrar a hora do cron, não a do tráfego.
 */
function toRow(entry: LogEntry, at: number): RequestLogRow {
  return {
    project_id: entry.projectId,
    api_key_id: entry.apiKeyId,
    method: entry.method,
    path: entry.endpoint,
    status_code: entry.statusCode,
    duration_ms: entry.latencyMs,
    request_bytes: entry.requestBytes ?? null,
    response_bytes: entry.responseBytes ?? null,
    created_at: new Date(at).toISOString(),
  };
}

/** Campos do stream. Tudo string: um stream do Redis não tem tipos. */
type StreamEntry = Record<string, string>;

async function appendToStream(entry: LogEntry, at: number): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    await redis.xadd(
      LOG_STREAM_KEY,
      "*",
      {
        p: entry.projectId,
        k: entry.apiKeyId ?? "",
        m: entry.method,
        e: entry.endpoint,
        s: String(entry.statusCode),
        d: String(entry.latencyMs),
        rq: entry.requestBytes == null ? "" : String(entry.requestBytes),
        rs: entry.responseBytes == null ? "" : String(entry.responseBytes),
        t: String(at),
      } satisfies StreamEntry,
      { trim: { type: "MAXLEN", comparison: "~", threshold: STREAM_MAXLEN } },
    );

    return true;
  } catch (error) {
    console.error("[logger] XADD falhou, a cair para o Postgres:", error);
    return false;
  }
}

/** Quantos entries por XRANGE. Mantém o payload REST em tamanho sensato. */
const FLUSH_BATCH_SIZE = 500;

/** Teto de batches por invocação, para o cron não correr para sempre. */
const FLUSH_MAX_BATCHES = 20;

export type FlushResult = {
  flushed: number;
  batches: number;
  /** true quando o teto foi atingido e ainda sobrou stream para a próxima. */
  truncated: boolean;
};

/**
 * Esvazia o stream para o Postgres. É o que o cron chama.
 *
 * A ordem é insert primeiro, XDEL só depois: se o insert falhar, os entries
 * ficam no stream e a próxima passagem tenta outra vez. O reverso perdia-os.
 *
 * O preço dessa escolha é entrega at-least-once — um XDEL falhado depois de um
 * insert bem sucedido duplica as linhas na passagem seguinte. Para analytics
 * dá; quando isto for a base da faturação, precisa de uma unique key por
 * entry-id do stream para o insert poder ser idempotente.
 */
export async function flushLogs(): Promise<FlushResult> {
  const redis = getRedis();
  if (!redis) throw new Error("Redis não configurado: não há stream para ler.");

  let flushed = 0;
  let batches = 0;

  for (; batches < FLUSH_MAX_BATCHES; batches++) {
    const range = await redis.xrange<StreamEntry>(
      LOG_STREAM_KEY,
      "-",
      "+",
      FLUSH_BATCH_SIZE,
    );

    const ids = Object.keys(range);
    if (ids.length === 0) return { flushed, batches, truncated: false };

    await insertRequestLogs(ids.map((id) => rowFromStream(range[id])));
    await redis.xdel(LOG_STREAM_KEY, ids);

    flushed += ids.length;

    // Menos do que pedimos significa que o stream acabou.
    if (ids.length < FLUSH_BATCH_SIZE) {
      return { flushed, batches: batches + 1, truncated: false };
    }
  }

  return { flushed, batches, truncated: true };
}

function rowFromStream(fields: StreamEntry): RequestLogRow {
  const at = Number.parseInt(fields.t, 10);

  return {
    project_id: fields.p,
    api_key_id: fields.k || null,
    method: fields.m,
    path: fields.e,
    status_code: Number.parseInt(fields.s, 10),
    duration_ms: Number.parseInt(fields.d, 10),
    request_bytes: fields.rq === "" ? null : Number.parseInt(fields.rq, 10),
    response_bytes: fields.rs === "" ? null : Number.parseInt(fields.rs, 10),
    // Um `t` corrompido não pode fazer o batch inteiro falhar no insert.
    created_at: new Date(Number.isFinite(at) ? at : Date.now()).toISOString(),
  };
}
