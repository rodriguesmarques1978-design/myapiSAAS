import type { SupabaseClient } from "@supabase/supabase-js";

/** Transforma "António Marques" em "antonio-marques". */
function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  return base || "org";
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

/**
 * Garante que o utilizador tem uma organização, criando-a se faltar.
 *
 * A linha em `members` não é inserida aqui: o trigger
 * `organizations_add_creator_as_owner` trata disso, o que evita o problema do
 * arranque (a policy de insert em members exige já ser admin da org).
 *
 * É chamada em dois sítios — no signup, quando vem sessão logo, e no dashboard,
 * para quem confirmou o email e só chega cá depois. Daí ser idempotente.
 */
export async function ensureOrganization(
  supabase: SupabaseClient,
  { userId, name }: { userId: string; name: string },
): Promise<{ error: string | null }> {
  const { data: existing, error: lookupError } = await supabase
    .from("members")
    .select("org_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error("[auth] members lookup:", lookupError.message);
    return { error: "We couldn't load your workspace. Please try again." };
  }

  if (existing) return { error: null };

  const base = slugify(name);

  // O slug entra em URLs, por isso tentamos primeiro a versão limpa e só
  // acrescentamos sufixo se já estiver tomada.
  for (const slug of [base, `${base}-${randomSuffix()}`, `${base}-${randomSuffix()}`]) {
    // Sem .select(): o returning de um insert é filtrado pela policy de select,
    // e a linha de members que o trigger cria ainda não está visível nesse
    // instante. Com .select() isto rebenta com 42501.
    const { error } = await supabase
      .from("organizations")
      .insert({ name, slug });

    if (!error) return { error: null };

    // 23505 = unique_violation. Qualquer outro erro não se resolve a repetir.
    if (error.code !== "23505") {
      console.error("[auth] org insert:", error.code, error.message);
      return { error: "We couldn't create your workspace. Please try again." };
    }
  }

  return { error: "We couldn't create your workspace. Please try again." };
}
