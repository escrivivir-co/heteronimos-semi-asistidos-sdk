/**
 * config.ts — Configuración centralizada del demo IACM.
 *
 * Lee variables de entorno; usa valores por defecto si no están presentes.
 * Exportar constantes en lugar de llamar a process.env directamente
 * facilita el testing y la refactorización.
 */

function env(key: string, fallback = ""): string {
  return process.env[key]?.trim() || fallback;
}

// ── Tokens de los dos bots ─────────────────────────────────────────────────
export const METEO_TOKEN = env("BOT_TOKEN_METEO");
export const DISPATCH_TOKEN = env("BOT_TOKEN_DISPATCH");

// ── Nombres de agentes ─────────────────────────────────────────────────────
export const METEO_AGENT_NAME = env("METEO_AGENT_NAME", "MeteoBot");
export const DISPATCH_AGENT_NAME = env("DISPATCH_AGENT_NAME", "DispatchBot");

// ── Valores por defecto del dominio ──────────────────────────────────────────
export const DEFAULT_CITY = env("DEFAULT_CITY", "Madrid");
export const DEFAULT_TIMEZONE = env("DEFAULT_TIMEZONE", "Europe/Madrid");

// ── Rutas de almacenamiento ───────────────────────────────────────────────
export const METEO_STORE_PATH = env("METEO_STORE_PATH", ".meteo-chats.json");
export const DISPATCH_STORE_PATH = env("DISPATCH_STORE_PATH", ".dispatch-chats.json");
