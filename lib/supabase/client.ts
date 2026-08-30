import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./env";

/**
 * Client para Client Components (browser).
 *
 * Usa a anon key, por isso está sempre sujeito a RLS. A sessão é lida dos
 * cookies que o middleware mantém frescos.
 */
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();

  return createBrowserClient(url, anonKey);
}
