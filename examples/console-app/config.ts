/**
 * Configuración de ejemplo.
 *
 * BOT_TOKEN ya no se lee aquí — lo gestiona ensureEnv() del SDK.
 * Este archivo solo exporta variables opcionales de la app.
 */

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function envFlag(name: string, defaultValue: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return defaultValue;
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

export const SOLANA_ADDRESS = optionalEnv("SOLANA_ADDRESS");
export const RABBIT_AUTO_ACK = envFlag("RABBIT_AUTO_ACK", false);
export const RABBIT_AUTO_ACK_TEMPLATE =
  optionalEnv("RABBIT_AUTO_ACK_TEMPLATE")
  ?? "Mensaje recibido de {sender}. Contenido: {size} caracteres. -- RabbitBot · BotHubSDK Scriptorium";
