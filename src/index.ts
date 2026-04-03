export type { BotPlugin } from "./core/bot-handler.js";
export { registerPlugins, syncCommands, collectPluginFatherSettings } from "./core/bot-handler.js";

export type { PluginHelpEntry, BuildPluginHelpTextOptions } from "./core/plugin-help.js";
export { collectPluginHelpEntries, buildPluginHelpText } from "./core/plugin-help.js";

export type { CommandDefinition, BotCommand, SyncOptions, BotCommandScope } from "./core/command-handler.js";
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

export type { BotRuntime, PluginInfo, PluginCommandInfo, RuntimeEvent } from "./core/runtime-emitter.js";
export { RuntimeEmitter, reduceRuntime, DEFAULT_BOT_RUNTIME } from "./core/runtime-emitter.js";

export type { StartupResult, EnsureEnvOptions } from "./core/startup.js";
export { ensureEnv } from "./core/startup.js";

export type { BootBotOptions, BootResult } from "./core/boot.js";
export { bootBot } from "./core/boot.js";

export { Bot } from "grammy";
export type { Context } from "grammy";

// --- Store + UI bridge ---
export type { LogEntry, MessageEntry, CommandResponseEntry, Store } from "./core/store.js";
export { LOG_BUFFER_SIZE, MSG_BUFFER_SIZE, CMD_BUFFER_SIZE, createStore } from "./core/store.js";

export type { BaseRuntimeState, EmitterBridgeOptions } from "./core/emitter-bridge.js";
export { getDefaultBaseState, connectEmitterToStore } from "./core/emitter-bridge.js";

// --- Mock utilities ---
export type { SentMessage, SimulateOpts, MockBotOptions } from "./core/mock-telegram.js";
export { MockTelegramBot } from "./core/mock-telegram.js";

// --- Message persistence ---
export type { MessageStore, PersistedMessages } from "./core/message-store.js";
export { FileMessageStore, MemoryMessageStore } from "./core/message-store.js";

// --- AIML Intent Engine (SDS-16) ---
export type {
  IntentResult,
  IntentHandler,
  IntentFn,
  IntentResolver,
  AimlCategory,
  AimlPattern,
  PatternFn,
  PatternMatch,
  ConditionClause,
  SessionVars,
  MessageContext,
  ConversationState,
  ConversationTurn,
  IntentEngineOptions,
} from "./core/aiml-types.js";
export { UNMATCHED_INTENT } from "./core/aiml-types.js";
export { IntentEngine } from "./core/intent-engine.js";
export { AimlBotPlugin } from "./core/aiml-bot-plugin.js";

// --- IACM Protocol (SDS-17) ---
export type {
  IacmMessage,
  IacmMessageType,
  IacmMeta,
  IacmDataMap,
  AnyIacmMessage,
  IacmSessionVars,
  IacmRequestData,
  IacmReportData,
  IacmQuestionData,
  IacmAnswerData,
  IacmProposalData,
  IacmAcknowledgeData,
  IacmAcceptData,
  IacmRejectData,
  IacmDeferData,
  IacmFyiData,
  IacmUrgentData,
  IacmPriority,
} from "./core/iacm-types.js";
export { IACM_VERSION } from "./core/iacm-types.js";

export type { BuildOptions } from "./core/iacm-templates.js";
export {
  generateMessageId,
  iacmTimestamp,
  buildIacmMessage,
  buildRequest,
  buildReport,
  buildQuestion,
  buildAnswer,
  buildProposal,
  buildAcknowledge,
  buildAccept,
  buildReject,
  buildDefer,
  buildFyi,
  buildUrgent,
  formatIacmForChat,
  toIacmYaml,
} from "./core/iacm-templates.js";

export type { ParseResult as IacmParseResult } from "./core/iacm-parser.js";
export {
  detectsIacmMessage,
  extractIacmType,
  extractIacmAgents,
  parseIacmMessage,
  validateIacmMessage,
} from "./core/iacm-parser.js";

export type { IacmIntent } from "./core/iacm-categories.js";
export {
  IACM_INTENTS,
  getIacmChatCategories,
  getIacmCommandCategories,
  getAllIacmCategories,
} from "./core/iacm-categories.js";

export { iacmProtocolHandler, PROTOCOL_HELP } from "./core/iacm-protocol-handlers.js";

export type { IacmBotVars } from "./core/iacm-bot-plugin.js";
export { IacmBotPlugin } from "./core/iacm-bot-plugin.js";

// --- AIML JSON Loader (SDS-16 addendum / SDS-18 §9.5) ---
export type { JsonCategoryDef, JsonResolverDef } from "./core/aiml-json-loader.js";
export { loadJsonCategories } from "./core/aiml-json-loader.js";