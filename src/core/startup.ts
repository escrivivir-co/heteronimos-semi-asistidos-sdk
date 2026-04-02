/**
 * startup.ts — Asistente de arranque del SDK.
 *
 * Centraliza la lógica de:
 *   1. Detectar si .env existe; si no, ofrecer copiar .env.example.
 *   2. Leer BOT_TOKEN; si falta, ofrecer mock mode.
 *
 * Los examples llaman `ensureEnv()` una vez al principio de `main()`.
 * No se ejecuta al importar — todo es lazy y async.
 */

import { existsSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { confirm } from "./logger.js";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface StartupResult {
  /** Token de Telegram si está disponible. */
  token?: string;
  /** true si el usuario eligió mock mode (o no hay token y aceptó). */
  mock: boolean;
}

export interface EnsureEnvOptions {
  /** Directorio donde buscar .env y .env.example. Default: process.cwd() */
  envDir?: string;
  /** Nombre de la variable de entorno del token. Default: "BOT_TOKEN" */
  tokenVar?: string;
  /** Si true, salta prompts interactivos y va directo a mock. Default: false */
  nonInteractive?: boolean;
}

// ---------------------------------------------------------------------------
// ensureEnv
// ---------------------------------------------------------------------------

export async function ensureEnv(opts?: EnsureEnvOptions): Promise<StartupResult> {
  const envDir = opts?.envDir ?? process.cwd();
  const tokenVar = opts?.tokenVar ?? "BOT_TOKEN";
  const nonInteractive = opts?.nonInteractive ?? false;

  const envPath = join(envDir, ".env");
  const examplePath = join(envDir, ".env.example");

  // --- Paso 1: ¿Existe .env? ---
  if (!existsSync(envPath)) {
    if (existsSync(examplePath)) {
      console.log(`\n⚠  No se encontró .env en ${envDir}`);
      console.log(`   Se encontró .env.example — contiene la plantilla de configuración.\n`);

      const shouldCopy = nonInteractive
        ? false
        : await confirm("¿Crear .env a partir de .env.example?");

      if (shouldCopy) {
        copyFileSync(examplePath, envPath);
        console.log(`\n✔  .env creado. Edítalo con tu BOT_TOKEN de @BotFather.`);
        console.log(`   Luego vuelve a arrancar, o continúa ahora en modo mock.\n`);
      }
    } else {
      console.log(`\n⚠  No se encontró .env ni .env.example en ${envDir}\n`);
    }
  }

  // --- Paso 2: Leer token (puede venir del .env recién copiado o del entorno) ---
  const token = process.env[tokenVar]?.trim() || undefined;

  if (token) {
    return { token, mock: false };
  }

  // --- Paso 3: Sin token — ofrecer mock ---
  console.log(
    [
      `⚠  ${tokenVar} no está configurado.`,
      `   Para conectar a Telegram: edita .env y pon tu token de @BotFather.`,
      `   Para probar sin Telegram: arranca en modo mock.\n`,
    ].join("\n"),
  );

  const useMock = nonInteractive || await confirm("¿Arrancar en modo mock (sin Telegram)?");

  return { token: undefined, mock: useMock };
}
