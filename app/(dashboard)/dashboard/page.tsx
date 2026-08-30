import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard — myapi",
};

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // O layout já garantiu que há sessão; isto é só para o TypeScript saber que
  // `user` não é nulo daqui para baixo.
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <header className="flex items-center justify-between border-b border-border/60 pb-4">
        <h1 className="text-xl font-semibold tracking-tight">
          Welcome, {user.email}
        </h1>
        <SignOutButton />
      </header>

      <p className="mt-6 text-sm text-muted-foreground">
        Your gateway lands here. Projects, API keys and usage are next.
      </p>
    </div>
  );
}
