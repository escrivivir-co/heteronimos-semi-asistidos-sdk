import React from "react";
import { render } from "ink";
import * as path from "node:path";
import { existsSync } from "node:fs";
import { RuntimeEmitter, Logger, bootBot, createStore, connectEmitterToStore, FileMessageStore } from "heteronimos-semi-asistidos-sdk";
import { SOLANA_ADDRESS } from "./config.js";
import { RabbitBot } from "./rabbit-bot.js";
import { SpiderBot } from "./spider-bot.js";
import { HorseBot } from "./horse-bot.js";
import { getDefaultDashboardState } from "./state.js";
import { App } from "./App.js";

const appDir = import.meta.dir;

// --- Observabilidad ---
const emitter = new RuntimeEmitter();
const log = new Logger("dashboard", { emitter });

// --- Store reactivo de la UI ---
const store = createStore(getDefaultDashboardState());
const messageStore = new FileMessageStore(path.join(appDir, ".messages.json"));
connectEmitterToStore(emitter, store, { messageStore });

// --- Arrancar el bot y montar la TUI ---
// nonInteractive: true siempre — la TUI es la interfaz, no readline.
// Si no hay token, arranca en mock automáticamente.
// El panel Config muestra el estado y las instrucciones para conectar a Telegram.
async function main() {
  const rabbitBot = new RabbitBot(SOLANA_ADDRESS, appDir);
  const spiderBot = new SpiderBot();
  const horseBot = new HorseBot();
  const result = await bootBot({
    plugins: [rabbitBot, spiderBot, horseBot],
    envDir: appDir,
    chatStorePath: path.join(appDir, ".chats.json"),
    emitter,
    logger: log,
    nonInteractive: true,
  });

  // Connect broadcast capability to the plugin
  if (result.broadcast) {
    rabbitBot.setBroadcast(result.broadcast);
  }

  // Informar al store del modo de arranque y estado del filesystem
  store.setState((s) => ({
    ...s,
    mockMode: result.mock,
    tokenConfigured: !!process.env.BOT_TOKEN?.trim(),
    envFileExists: existsSync(path.join(appDir, ".env")),
    envExampleExists: existsSync(path.join(appDir, ".env.example")),
    appDir,
    botStatus: result.started ? s.botStatus : "error",
    executeCommand: result.executeCommand ?? null,
  }));

  const { unmount } = render(<App store={store} />);

  function shutdown() {
    emitter.complete();
    unmount();
  }
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
