/**
 * boot.ts — Orquestador de arranque del SDK.
 *
 * `bootBot()` encapsula el ciclo completo:
 *   ensureEnv → crear bot (real o mock) → registerPlugins → syncCommands → start
 *
 * Los examples solo tienen que llamar `bootBot(opts)` y reaccionar al resultado.
 * Toda la lógica de fallback, prompts y mock vive aquí, no en cada app.
 */

import { Bot } from "grammy";
import { ensureEnv } from "./startup.js";
import { MockTelegramBot } from "./mock-telegram.js";
import type { SimulateOpts, SentMessage } from "./mock-telegram.js";
import { registerPlugins, syncCommands } from "./bot-handler.js";
import type { BotPlugin } from "./bot-handler.js";
import type { SyncOptions } from "./command-handler.js";
import { ChatTracker, FileChatStore } from "./chat-tracker.js";
import { Logger, confirm } from "./logger.js";
import type { RuntimeEmitter } from "./runtime-emitter.js";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface BootBotOptions {
  /** Plugin instances to register. */
  plugins: BotPlugin[];
  /** Directory where .env and .env.example live. */
  envDir: string;
  /** Path to the .chats.json persistence file. */
  chatStorePath: string;
  /** Optional RuntimeEmitter for observability (dashboard, etc.). */
  emitter?: RuntimeEmitter;
  /** Optional logger. If not provided, creates one with scope "boot". */
  logger?: Logger;
  /** Skip interactive prompts; go to mock directly on failure. Default: false */
  nonInteractive?: boolean;
  /** Options for syncCommandsWithTelegram. Default: { autoConfirm: true } */
  syncOptions?: SyncOptions;
}

export interface BootResult {
  /** true if the bot started in mock mode. */
  mock: boolean;
  /** true if the bot actually started (false = user declined everything). */
  started: boolean;
  /**
   * Executes a registered command locally and returns the bot's reply messages.
   * Available in both mock and real mode (runs handlers in-process via a local
   * MockTelegramBot — no messages are sent to Telegram).
   */
  executeCommand?: (name: string, opts?: SimulateOpts) => Promise<SentMessage[]>;
}

// ---------------------------------------------------------------------------
// bootBot
// ---------------------------------------------------------------------------

export async function bootBot(opts: BootBotOptions): Promise<BootResult> {
  const log = opts.logger ?? new Logger("boot");
  const { emitter, nonInteractive = false } = opts;
  const syncOpts: SyncOptions = opts.syncOptions ?? { autoConfirm: true };

  // --- Paso 1: ensureEnv (detecta .env, ofrece copiar, lee token) ---
  const env = await ensureEnv({ envDir: opts.envDir, nonInteractive });

  if (env.mock) {
    const mockBot = await startMock(opts, log, syncOpts);
    return { mock: true, started: true, executeCommand: (name, simOpts) => mockBot.simulateCommand(name, simOpts) };
  }

  if (!env.token) {
    log.error("Sin token y sin mock. Saliendo.");
    return { mock: false, started: false };
  }

  // --- Paso 2: arrancar bot real ---
  try {
    const bot = new Bot(env.token);
    const store = new FileChatStore(opts.chatStorePath);
    const tracker = new ChatTracker(store, emitter);

    registerPlugins(bot, opts.plugins, tracker, emitter);
    await syncCommands(bot, opts.plugins, tracker, syncOpts, emitter);
    // Notify the dashboard/bridge about already-known chats so they appear
    // in the UI without waiting for a new message to arrive.
    tracker.emitLoaded();

    // Mock auxiliar para ejecución local de comandos desde la UI.
    // Registra los mismos plugins sin emitter/tracker para evitar
    // duplicar plugins-registered y middleware de tracking.
    // El emitter del constructor se usa solo para command-* events.
    const localMock = new MockTelegramBot({ emitter });
    registerPlugins(localMock as any, opts.plugins);

    log.info("Bot started — polling...");
    emitStatus(emitter, "running");

    // Polling en background — bootBot retorna inmediatamente.
    // El event loop se mantiene vivo por el polling HTTP de grammY.
    bot.start().catch((err: unknown) => {
      const errMsg = err instanceof Error ? err.message : String(err);
      log.error(`Polling error: ${errMsg}`);
      emitStatus(emitter, "error");
    });

    return {
      mock: false,
      started: true,
      executeCommand: (name: string, simOpts?: SimulateOpts) => localMock.simulateCommand(name, simOpts),
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error(`Bot startup failed. ${msg}`);
    emitStatus(emitter, "error");

    // --- Paso 3: ofrecer mock como fallback ---
    const useMock = nonInteractive ||
      await confirm("¿Arrancar en modo mock (sin Telegram)?").catch(() => false);

    if (useMock) {
      const mockBot = await startMock(opts, log, syncOpts);
      return { mock: true, started: true, executeCommand: (name, simOpts) => mockBot.simulateCommand(name, simOpts) };
    }

    return { mock: false, started: false };
  }
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

async function startMock(opts: BootBotOptions, log: Logger, syncOpts: SyncOptions): Promise<MockTelegramBot> {
  const { emitter } = opts;
  log.warn("[MOCK] Sin conexión a Telegram — arrancando en modo mock.");
  const store = new FileChatStore(opts.chatStorePath);
  const tracker = new ChatTracker(store, emitter);
  const mockBot = new MockTelegramBot({ emitter });
  registerPlugins(mockBot as any, opts.plugins, tracker, emitter);
  await syncCommands(mockBot as any, opts.plugins, tracker, syncOpts, emitter);
  tracker.emitLoaded();
  emitStatus(emitter, "running");
  log.info("[MOCK] Bot mock activo. Comandos registrados: " + mockBot.getRegisteredCommands().join(", "));
  await mockBot.start();
  return mockBot;
}

function emitStatus(emitter: RuntimeEmitter | undefined, status: string): void {
  if (emitter) {
    emitter.emit({ type: "status-change", status, timestamp: new Date().toISOString() } as any);
  }
}
