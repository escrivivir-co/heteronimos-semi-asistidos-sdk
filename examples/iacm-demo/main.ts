/**
 * main.ts — Punto de entrada del demo IACM.
 *
 * Arranca dos bots simultáneamente:
 *   • MeteoBot   (BOT_TOKEN_METEO)   — proveedor de datos meteorológicos / hora
 *   • DispatchBot (BOT_TOKEN_DISPATCH) — coordinador, envía REQUEST/QUESTION
 *
 * Si alguno de los tokens falta, ese bot arranca en modo mock (simulado).
 *
 * Flujo de arranque:
 *   1. Cargar .env (usando dotenv, ya incluido en Bun y Node.js)
 *   2. Crear instancias de MeteoBot y DispatchBot
 *   3. Llamar a bootBot() dos veces (una por bot) con tokenVar distinto
 *   4. Ambos bots quedan en polling en background
 *
 * Uso:
 *   bun run main.ts              # modo normal (requiere .env con tokens)
 *   bun run main.ts --mock       # fuerza mock en ambos bots
 *
 * Demo rápida (en DispatchBot):
 *   /dp_demo Madrid
 */

// Bun carga automáticamente el .env del directorio de trabajo.
// Si usas Node.js, añade: import "dotenv/config";
import { Logger, bootBot } from "heteronimos-semi-asistidos-sdk";
import * as path from "node:path";

import { MeteoBot } from "./meteo-bot.js";
import { DispatchBot } from "./dispatch-bot.js";
import {
  METEO_AGENT_NAME,
  DISPATCH_AGENT_NAME,
  METEO_STORE_PATH,
  DISPATCH_STORE_PATH,
} from "./config.js";

// ── Detectar --mock flag ──────────────────────────────────────────────────────
const forceMock = process.argv.includes("--mock");

const appDir = path.dirname(new URL(import.meta.url).pathname);
const log = new Logger("main");

// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  log.info("═══════════════════════════════════════════");
  log.info("  IACM Demo — MeteoBot + DispatchBot");
  log.info("═══════════════════════════════════════════");

  // ── MeteoBot ───────────────────────────────────────────────────────────────
  log.info(`Arrancando ${METEO_AGENT_NAME}…`);
  const meteoResult = await bootBot({
    plugins: [new MeteoBot(METEO_AGENT_NAME)],
    envDir: appDir,
    chatStorePath: path.join(appDir, METEO_STORE_PATH),
    tokenVar: "BOT_TOKEN_METEO",
    nonInteractive: forceMock,
    syncOptions: { autoConfirm: true },
    logger: new Logger("meteo"),
  });

  if (!meteoResult.started) {
    log.error("MeteoBot no arrancó. Comprueba BOT_TOKEN_METEO en .env");
    process.exitCode = 1;
    return;
  }

  log.info(
    meteoResult.mock
      ? `${METEO_AGENT_NAME} arrancado en modo MOCK`
      : `${METEO_AGENT_NAME} arrancado en modo REAL (polling Telegram)`,
  );

  // ── DispatchBot ────────────────────────────────────────────────────────────
  log.info(`Arrancando ${DISPATCH_AGENT_NAME}…`);
  const dispatchResult = await bootBot({
    plugins: [new DispatchBot(DISPATCH_AGENT_NAME)],
    envDir: appDir,
    chatStorePath: path.join(appDir, DISPATCH_STORE_PATH),
    tokenVar: "BOT_TOKEN_DISPATCH",
    nonInteractive: forceMock,
    syncOptions: { autoConfirm: true },
    logger: new Logger("dispatch"),
  });

  if (!dispatchResult.started) {
    log.error("DispatchBot no arrancó. Comprueba BOT_TOKEN_DISPATCH en .env");
    process.exitCode = 1;
    return;
  }

  log.info(
    dispatchResult.mock
      ? `${DISPATCH_AGENT_NAME} arrancado en modo MOCK`
      : `${DISPATCH_AGENT_NAME} arrancado en modo REAL (polling Telegram)`,
  );

  // ── Resumen ────────────────────────────────────────────────────────────────
  log.info("");
  log.info("Ambos bots activos. Comandos de ejemplo:");
  log.info("  MeteoBot   → /mt_weather Madrid       (partes directos)");
  log.info("  DispatchBot → /dp_demo Madrid          (demo flujo completo)");
  log.info("  DispatchBot → /dp_weather Madrid       (REQUEST → REPORT)");
  log.info("  DispatchBot → /dp_time Europe/Madrid   (QUESTION → ANSWER)");
  log.info("");
  log.info("Pulsa Ctrl+C para detener.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  log.error(`Error fatal: ${message}`);
  process.exitCode = 1;
});
