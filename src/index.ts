export type { BotPlugin } from "./core/bot-handler.js";
export { registerPlugins, syncCommands, collectPluginFatherSettings } from "./core/bot-handler.js";

export type { CommandDefinition, BotCommand, SyncOptions } from "./core/command-handler.js";
export {
  registerCommands,
  handleCommand,
  toBotFatherFormat,
  toBotCommands,
  commandsMatch,
  syncCommandsWithTelegram,
} from "./core/command-handler.js";

export type {
  MenuDefinition,
  MenuPage,
  MenuButton,
  NavButton,
  UrlButton,
} from "./core/menu-handler.js";
export { registerMenu } from "./core/menu-handler.js";

export type { LogLevel, LoggerOptions } from "./core/logger.js";
export { Logger } from "./core/logger.js";

export type { ChatStore } from "./core/chat-tracker.js";
export { ChatTracker, FileChatStore, MemoryChatStore } from "./core/chat-tracker.js";

export type { BotRuntime, PluginInfo, RuntimeEvent } from "./core/runtime-emitter.js";
export { RuntimeEmitter, reduceRuntime, DEFAULT_BOT_RUNTIME } from "./core/runtime-emitter.js";

export type { StartupResult, EnsureEnvOptions } from "./core/startup.js";
export { ensureEnv } from "./core/startup.js";

export type { BootBotOptions, BootResult } from "./core/boot.js";
export { bootBot } from "./core/boot.js";

export { Bot } from "grammy";
export type { Context } from "grammy";

// --- Store + UI bridge ---
export type { LogEntry, MessageEntry, Store } from "./core/store.js";
export { LOG_BUFFER_SIZE, MSG_BUFFER_SIZE, createStore } from "./core/store.js";

export type { BaseRuntimeState, EmitterBridgeOptions } from "./core/emitter-bridge.js";
export { getDefaultBaseState, connectEmitterToStore } from "./core/emitter-bridge.js";