import React from "react";
import { render } from "ink";
import * as path from "node:path";
import {
  Bot,
  RuntimeEmitter,
  ChatTracker,
  FileChatStore,
  registerPlugins,
  syncCommands,
  Logger,
} from "../../src/index.js";
import { TOKEN, SOLANA_ADDRESS } from "../console-app/config.js";
import { RabbitBot } from "../console-app/rabbit-bot.js";
import { createStore } from "./store.js";
import { getDefaultDashboardState } from "./state.js";
import { connectEmitterToStore } from "./emitter-bridge.js";
import { App } from "./App.js";

// --- RuntimeEmitter: puente entre el SDK y la UI ---
const emitter = new RuntimeEmitter();

// --- Logger con emitter ---
const log = new Logger("dashboard", { emitter });

// --- Store reactivo de la UI ---
const store = createStore(getDefaultDashboardState());
connectEmitterToStore(emitter, store);

// --- Bot setup (mismo que console-app pero ahora con emitter) ---
const bot = new Bot(TOKEN);
const storeFile = path.join(import.meta.dir, "..", "..", ".chats.json");
const chatStore = new FileChatStore(storeFile);
const tracker = new ChatTracker(chatStore, emitter);

const plugins = [new RabbitBot(SOLANA_ADDRESS)];

registerPlugins(bot, plugins, tracker, emitter);

// --- Montar la TUI con Ink ---
const { unmount } = render(<App store={store} />);

// --- Cleanup: completar el stream al salir ---
function shutdown() {
  emitter.complete();
  unmount();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// --- Arrancar el bot en background ---
async function main() {
  try {
    await syncCommands(bot, plugins, tracker, { autoConfirm: true }, emitter);
    log.info("Bot started — polling...");
    emitter.emit({ type: "status-change", status: "running", timestamp: new Date().toISOString() });
    await bot.start();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`Bot error: ${msg}`);
    emitter.emit({ type: "status-change", status: "error", timestamp: new Date().toISOString() });
    shutdown();
    process.exitCode = 1;
  }
}

main();
