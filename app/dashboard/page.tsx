import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { ensureOrganization } from "@/lib/auth/organizations";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard — myapi",
};

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // O middleware já protege esta rota; isto é o cinto para além dos suspensórios,
  // e dá-nos o `user` tipado como não-nulo daqui para baixo.
  if (!user) redirect("/login");

  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "My workspace";

  // Quem confirmou o email chega aqui sem org, porque no signup ainda não havia
  // sessão para a criar.
  const { error: orgError } = await ensureOrganization(supabase, {
    userId: user.id,
    name,
  });

  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name, slug, plan");

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <header className="flex items-center justify-between border-b border-border/60 pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <SignOutButton />
      </header>

      {orgError ? (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {orgError}
        </p>
      ) : null}

      <section className="mt-6 space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Your organizations
        </h2>
        {organizations?.length ? (
          <ul className="space-y-2">
            {organizations.map((org) => (
              <li
                key={org.id}
                className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{org.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    /{org.slug}
                  </p>
                </div>
                <span className="rounded-md border border-border px-2 py-0.5 text-xs capitalize text-muted-foreground">
                  {org.plan}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No organizations yet.</p>
        )}
      </section>
    </div>
  );
}
