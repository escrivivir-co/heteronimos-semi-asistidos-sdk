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

export const SOLANA_ADDRESS = optionalEnv("SOLANA_ADDRESS");
