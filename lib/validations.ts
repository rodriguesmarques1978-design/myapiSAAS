import { z } from "zod";

/** Opções do dropdown "stack" no formulário da waitlist. */
export const STACKS = [
  "Next.js",
  "Node / Express",
  "Python / FastAPI",
  "Go",
  "Ruby on Rails",
  "Other",
] as const;

/**
 * Schema partilhado entre o formulário (client) e a API route (server).
 * Manter num só sítio garante que a validação nunca diverge.
 */
export const waitlistSchema = z.object({
  email: z.email("Enter a valid email address"),
  project: z.string().max(500, "Keep it under 500 characters").optional(),
  stack: z.enum(STACKS).optional(),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;

/* -------------------------------------------------------------------------
 * Autenticação
 *
 * Partilhados entre os formulários (client) e as server actions. A validação
 * do client é conveniência: a server action volta a validar, porque o browser
 * pode sempre mandar o que lhe apetecer.
 * ---------------------------------------------------------------------- */

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  // No login não validamos comprimento: quem tem uma password antiga e curta
  // continua a conseguir entrar. Quem falha, falha no Supabase.
  password: z.string().min(1, "Enter your password"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your name")
    .max(80, "Keep it under 80 characters"),
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters"),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
