import { createClient } from "@supabase/supabase-js";

/**
 * Cliente admin — SÓ para uso server-side.
 *
 * Usa a service role key, que ignora RLS. Nunca importar isto a partir de um
 * client component, senão a chave vai parar ao bundle do browser.
 *
 * Devolve null se as env vars não estiverem definidas, para a API route poder
 * responder 503 em vez de rebentar no import.
 */
export function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
