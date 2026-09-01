/**
 * Geração e validação de API keys.
 *
 * Usa Web Crypto (crypto.subtle, crypto.getRandomValues) e não node:crypto,
 * porque isto corre no edge runtime.
 */

/** Prefixo das keys de produção. É o que a landing page mostra. */
const KEY_PREFIX = "sk_live_";

/** Chars visíveis do prefixo guardados em api_keys.key_prefix, para a UI. */
const PREFIX_DISPLAY_LENGTH = KEY_PREFIX.length + 8;

/**
 * Gera uma API key nova.
 *
 * 32 bytes de entropia em base64url. A key em plaintext só existe aqui e é
 * mostrada uma única vez — o que fica na base de dados é o hash.
 */
export function generateKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  const base64 = btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${KEY_PREFIX}${base64}`;
}

/**
 * SHA-256 da key, em hex. É isto que vai para api_keys.key_hash.
 *
 * Sem salt de propósito: a key tem 256 bits de entropia aleatória, por isso
 * não há dicionário nem rainbow table que ajude, e um hash determinístico é o
 * que permite o lookup direto por índice (where key_hash = $1). Salt aqui só
 * daria trabalho e obrigaria a varrer a tabela toda a cada pedido.
 */
export async function hashKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(key),
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Parte visível da key, para a mostrar na UI (sk_live_8f2c1a9b…). */
export function keyPrefix(key: string): string {
  return key.slice(0, PREFIX_DISPLAY_LENGTH);
}

/**
 * Extrai a key do pedido.
 *
 * Aceita duas formas: "Authorization: Bearer <key>", que é o que os SDKs que o
 * nosso cliente já usa esperam, e "X-API-Key: <key>", que é mais direto para
 * quem chama a API à mão. O Authorization ganha quando vêm os dois — é o
 * header standard, e ter os dois a divergir num pedido é sinal de erro do
 * cliente, não de intenção.
 *
 * O scheme do Bearer é case-insensitive porque o RFC 7235 assim o exige e há
 * clientes que mandam "bearer".
 *
 * Devolve null se nenhum dos headers vier, ou se vierem mal formados — quem
 * chama traduz isso em 401.
 */
export function extractApiKey(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (authorization) {
    const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
    return match ? match[1] : null;
  }

  const apiKey = request.headers.get("x-api-key")?.trim();

  return apiKey ? apiKey : null;
}
