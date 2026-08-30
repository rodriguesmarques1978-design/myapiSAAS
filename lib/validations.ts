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
