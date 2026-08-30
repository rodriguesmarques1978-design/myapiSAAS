import type { z } from "zod";
import { flattenError } from "zod";

/**
 * Primeiro erro de cada campo, no formato que os formulários mostram.
 *
 * Só o primeiro: mostrar três queixas sobre o mesmo campo não ajuda ninguém.
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const flat = flattenError(error).fieldErrors as Record<
    string,
    string[] | undefined
  >;

  return Object.fromEntries(
    Object.entries(flat)
      .filter(([, messages]) => messages && messages.length > 0)
      .map(([field, messages]) => [field, messages![0]]),
  );
}
