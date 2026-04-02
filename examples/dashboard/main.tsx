import React from "react";
import { render } from "ink";
import * as path from "node:path";
import { RuntimeEmitter, Logger, bootBot } from "../../src/index.js";
import { SOLANA_ADDRESS } from "../console-app/config.js";
import { RabbitBot } from "../console-app/rabbit-bot.js";
import { createStore } from "./store.js";
import { getDefaultDashboardState } from "./state.js";
import { connectEmitterToStore } from "./emitter-bridge.js";
import { App } from "./App.js";

const rootDir = path.join(import.meta.dir, "..", "..");

// --- Observabilidad ---
const emitter = new RuntimeEmitter();
const log = new Logger("dashboard", { emitter });

// --- Store reactivo de la UI ---
const store = createStore(getDefaultDashboardState());
connectEmitterToStore(emitter, store);

// --- Montar la TUI con Ink (siempre, independiente del bot) ---
const { unmount } = render(<App store={store} />);

function shutdown() {
  emitter.complete();
  unmount();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// --- Arrancar el bot ---
async function main() {
  const result = await bootBot({
    plugins: [new RabbitBot(SOLANA_ADDRESS)],
    envDir: rootDir,
    chatStorePath: path.join(rootDir, ".chats.json"),
    emitter,
    logger: log,
    nonInteractive: process.env.MOCK_MODE === "1",
  });

  if (!result.started) {
    shutdown();
    process.exitCode = 1;
  }
}

main();
