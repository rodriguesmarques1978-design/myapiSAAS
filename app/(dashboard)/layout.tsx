import { redirect } from "next/navigation";

import { ensureOrganization } from "@/lib/auth/organizations";
import { createClient } from "@/lib/supabase/server";

/**
 * Porta de entrada de tudo o que vive em /dashboard.
 *
 * O middleware já bloqueia estas rotas sem sessão. Esta verificação é a segunda
 * tranca: o middleware pode ser contornado por uma alteração ao matcher, e
 * layouts de servidor correm sempre.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fica aqui, e não na página, para que qualquer rota futura sob /dashboard
  // encontre a organização criada. Quem confirmou o email chega sem uma,
  // porque no signup ainda não havia sessão para a criar.
  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "My workspace";

  await ensureOrganization(supabase, { userId: user.id, name });

  return <div className="min-h-svh">{children}</div>;
}
