import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Escrita das linhas de request_logs no Postgres.
 *
 * Só metadata: método, path, status, latência e bytes. O corpo nunca é lido
 * nem guardado — é o que a FAQ da landing promete e é o que permite passar o
 * corpo em streaming sem o bufferizar.
 *
 * Escreve com a service role key. A tabela não tem policy de insert, por isso
 * mais ninguém consegue forjar linhas de uso.
 *
 * Este módulo é a camada de baixo: não sabe nada de estratégias nem de quando
 * escrever. Quem decide isso é lib/logger.ts.
 */

/** Uma linha de request_logs, já com os nomes das colunas. */
export type RequestLogRow = {
  project_id: string;
  api_key_id: string | null;
  method: string;
  path: string;
  status_code: number;
  duration_ms: number;
  request_bytes: number | null;
  response_bytes: number | null;
  created_at: string;
};

/**
 * Insere um lote de linhas.
 *
 * Um único insert para o lote todo: o flush do stream traz centenas de linhas
 * de cada vez, e uma chamada REST por linha punha o cron a demorar mais do que
 * o intervalo entre corridas.
 */
export async function insertRequestLogs(rows: RequestLogRow[]): Promise<void> {
  if (rows.length === 0) return;

  const supabase = createAdminClient();
  if (!supabase) return;

  const { error } = await supabase.from("request_logs").insert(rows);

  if (error) {
    console.error("[gateway] log falhou:", error.code, error.message);
    // Quem chama precisa de saber: no flush, um erro aqui é o que impede o
    // XDEL e deixa os entries no stream para a próxima tentativa.
    throw new Error(`insert em request_logs falhou: ${error.message}`);
  }
}
