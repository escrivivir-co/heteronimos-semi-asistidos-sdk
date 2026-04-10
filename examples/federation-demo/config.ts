/**
 * config.ts — Configuración del federation-demo.
 */

function env(key: string, fallback = ""): string {
  return process.env[key]?.trim() || fallback;
}

export const BOT_TOKEN = env("BOT_TOKEN_CYBORG");
export const OPERATOR_NAME = env("OPERATOR_NAME", "CyborgZero");
export const FEDERATION_STORE_PATH = env("FEDERATION_STORE_PATH", ".fed-store.json");
export const CHAT_STORE_PATH = env("CHAT_STORE_PATH", ".cyborg-chats.json");
