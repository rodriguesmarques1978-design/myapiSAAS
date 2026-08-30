import type { AuthError } from "@supabase/supabase-js";

/**
 * Traduz erros do Supabase para mensagens que se mostram ao utilizador.
 *
 * Duas razões para não passar o erro cru: as mensagens do Supabase mudam entre
 * versões e vazam detalhes de implementação ("Database error saving new user"),
 * e algumas dizem coisas que não queremos confirmar a quem está a sondar.
 */
const MESSAGES: Record<string, string> = {
  invalid_credentials: "That email and password don't match an account.",
  email_not_confirmed: "Confirm your email address first — check your inbox.",
  user_already_exists: "An account with that email already exists.",
  email_exists: "An account with that email already exists.",
  weak_password: "That password is too weak. Use at least 8 characters.",
  over_request_rate_limit: "Too many attempts. Wait a minute and try again.",
  over_email_send_rate_limit:
    "Too many emails sent. Wait a few minutes and try again.",
  signup_disabled: "New sign-ups are closed right now.",
  validation_failed: "Check the details you entered and try again.",
};

const FALLBACK = "Something went wrong. Please try again.";

export function friendlyAuthError(error: AuthError | null): string {
  if (!error) return FALLBACK;

  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];

  // Versões mais antigas do Supabase não mandam `code`, só a mensagem.
  const message = error.message.toLowerCase();
  if (message.includes("invalid login credentials")) {
    return MESSAGES.invalid_credentials;
  }
  if (message.includes("email not confirmed")) {
    return MESSAGES.email_not_confirmed;
  }
  if (message.includes("already registered")) {
    return MESSAGES.user_already_exists;
  }
  if (message.includes("rate limit") || message.includes("for security")) {
    return MESSAGES.over_request_rate_limit;
  }

  // Fica no log do servidor para debug, mas não chega ao utilizador.
  console.error("[auth]", error.code ?? "no-code", error.message);
  return FALLBACK;
}
