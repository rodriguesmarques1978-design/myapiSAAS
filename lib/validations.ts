import { z } from "zod";

/**
 * Schema partilhado entre o modal (client) e a API route (server).
 * Manter num só sítio garante que a validação nunca diverge.
 */
export const waitlistSchema = z.object({
  email: z.email("Enter a valid email address"),
  project: z.string().max(500, "Keep it under 500 characters").optional(),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;
