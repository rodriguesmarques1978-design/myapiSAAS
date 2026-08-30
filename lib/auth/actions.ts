"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  loginSchema,
  signupSchema,
} from "@/lib/validations";

import { friendlyAuthError } from "./errors";
import { ensureOrganization } from "./organizations";

/**
 * O sucesso nunca é devolvido: ou redireciona, ou devolve um estado que a UI
 * tem de mostrar. Assim é impossível esquecer de tratar um caso.
 */
export type AuthResult =
  | { status: "error"; message: string }
  | { status: "check-email" };

const INVALID_INPUT = "Check the details you entered and try again.";

export async function signIn(input: unknown): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: INVALID_INPUT };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { status: "error", message: friendlyAuthError(error) };
  }

  // Fora do try/catch de propósito: redirect() funciona lançando, e apanhá-lo
  // transformaria a navegação num erro silencioso.
  redirect("/dashboard");
}

export async function signUp(input: unknown): Promise<AuthResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: INVALID_INPUT };
  }

  const { name, email, password } = parsed.data;
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });

  if (error) {
    return { status: "error", message: friendlyAuthError(error) };
  }

  // Com confirmação de email ligada, o signUp não devolve sessão. Sem sessão
  // não há auth.uid(), portanto a org não pode ser criada agora — fica para a
  // primeira visita ao dashboard.
  if (!data.session || !data.user) {
    return { status: "check-email" };
  }

  const { error: orgError } = await ensureOrganization(supabase, {
    userId: data.user.id,
    name,
  });

  if (orgError) {
    return { status: "error", message: orgError };
  }

  redirect("/dashboard");
}

export async function requestPasswordReset(input: unknown): Promise<AuthResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: INVALID_INPUT };
  }

  const requestHeaders = headers();
  const origin =
    requestHeaders.get("origin") ?? `https://${requestHeaders.get("host")}`;

  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${origin}/auth/callback?next=/dashboard` },
  );

  // Só o rate limit é mostrado. Um "email não existe" seria uma forma de
  // descobrir quem tem conta, por isso a resposta é a mesma nos dois casos.
  if (error && error.code?.includes("rate_limit")) {
    return { status: "error", message: friendlyAuthError(error) };
  }

  if (error) {
    console.error("[auth] reset:", error.code ?? "no-code", error.message);
  }

  return { status: "check-email" };
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
