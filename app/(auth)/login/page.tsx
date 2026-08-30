import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in — myapi",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <AuthShell
      title="Sign in"
      description="Pick up where you left off."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-foreground underline-offset-4 hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      {searchParams.error === "link" ? (
        <p role="alert" className="mb-4 text-sm text-destructive">
          That link has expired or was already used. Request a new one below.
        </p>
      ) : null}

      <LoginForm />

      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link
          href="/forgot-password"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          Forgot password?
        </Link>
      </p>
    </AuthShell>
  );
}
