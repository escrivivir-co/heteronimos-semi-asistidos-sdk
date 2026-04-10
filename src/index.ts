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

export type { ChatStore } from "./core/persistence/chat-tracker.js";
export { ChatTracker, FileChatStore, MemoryChatStore } from "./core/persistence/chat-tracker.js";

export type { BotRuntime, PluginInfo, PluginCommandInfo, RuntimeEvent } from "./core/runtime-emitter.js";
export { RuntimeEmitter, reduceRuntime, DEFAULT_BOT_RUNTIME } from "./core/runtime-emitter.js";

export type { StartupResult, EnsureEnvOptions } from "./core/startup.js";
export { ensureEnv } from "./core/startup.js";

export type { BootBotOptions, BootResult } from "./core/boot.js";
export { bootBot } from "./core/boot.js";

export { Bot } from "grammy";
export type { Context } from "grammy";

// --- Store + UI bridge ---
export type { LogEntry, MessageEntry, CommandResponseEntry, Store } from "./core/persistence/store.js";
export { LOG_BUFFER_SIZE, MSG_BUFFER_SIZE, CMD_BUFFER_SIZE, createStore } from "./core/persistence/store.js";

export type { BaseRuntimeState, EmitterBridgeOptions } from "./core/emitter-bridge.js";
export { getDefaultBaseState, connectEmitterToStore } from "./core/emitter-bridge.js";

// --- Mock utilities ---
export type { SentMessage, SimulateOpts, MockBotOptions } from "./core/mock-telegram.js";
export { MockTelegramBot } from "./core/mock-telegram.js";

// --- Message persistence ---
export type { MessageStore, PersistedMessages } from "./core/persistence/message-store.js";
export { FileMessageStore, MemoryMessageStore } from "./core/persistence/message-store.js";

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
} from "./core/aiml/aiml-types.js";
export { UNMATCHED_INTENT } from "./core/aiml/aiml-types.js";
export { IntentEngine } from "./core/aiml/intent-engine.js";
export { AimlBotPlugin } from "./core/aiml/aiml-bot-plugin.js";

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
} from "./core/iacm/iacm-types.js";
export { IACM_VERSION } from "./core/iacm/iacm-types.js";

export type { BuildOptions } from "./core/iacm/iacm-templates.js";
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
} from "./core/iacm/iacm-templates.js";

export type { ParseResult as IacmParseResult } from "./core/iacm/iacm-parser.js";
export {
  detectsIacmMessage,
  extractIacmType,
  extractIacmAgents,
  parseIacmMessage,
  validateIacmMessage,
} from "./core/iacm/iacm-parser.js";

export type { IacmIntent } from "./core/iacm/iacm-categories.js";
export {
  IACM_INTENTS,
  getIacmChatCategories,
  getIacmCommandCategories,
  getAllIacmCategories,
} from "./core/iacm/iacm-categories.js";

export { iacmProtocolHandler, PROTOCOL_HELP } from "./core/iacm/iacm-protocol-handlers.js";

export type { IacmBotVars } from "./core/iacm/iacm-bot-plugin.js";
export { IacmBotPlugin } from "./core/iacm/iacm-bot-plugin.js";

// --- AIML JSON Loader (SDS-16 addendum / SDS-18 §9.5) ---
export type { JsonCategoryDef, JsonResolverDef } from "./core/aiml/aiml-json-loader.js";
export { loadJsonCategories } from "./core/aiml/aiml-json-loader.js";

// --- RNFP Federation Protocol (SDS-19) ---
export type {
  RnfpMessage,
  RnfpMessageType,
  RnfpMeta,
  RnfpDataMap,
  AnyRnfpMessage,
  RnfpSessionVars,
  RnfpInviteData,
  RnfpAcceptData,
  RnfpRejectData,
  RnfpRevokeData,
  RnfpAnnounceData,
  RnfpGraphRequestData,
  RnfpGraphPkgData,
  RnfpUnknownMsgData,
  CyborgIdentity,
  FederationPeer,
  FederationPolicy,
  SharedEvent,
  FederationStatus,
  TrustLevel,
  CryptoProvider,
} from "./core/rnfp/rnfp-types.js";
export { RNFP_VERSION, MockCryptoProvider } from "./core/rnfp/rnfp-types.js";

export type { RnfpBuildOptions } from "./core/rnfp/rnfp-builders.js";
export {
  generateRnfpMessageId,
  rnfpTimestamp,
  mockChecksum,
  buildRnfpMessage,
  buildFedInvite,
  buildFedAccept,
  buildFedReject,
  buildFedRevoke,
  buildGraphAnnounce,
  buildGraphRequest,
  buildGraphPkg,
  buildUnknownMsg,
  formatRnfpForChat,
  toRnfpYaml,
} from "./core/rnfp/rnfp-builders.js";

export type { RnfpParseResult } from "./core/rnfp/rnfp-parser.js";
export {
  detectsRnfpMessage,
  extractRnfpType,
  extractRnfpOperators,
  extractBodyField,
  parseRnfpMessage,
  validateRnfpMessage,
} from "./core/rnfp/rnfp-parser.js";

export type { RnfpIntent } from "./core/rnfp/rnfp-categories.js";
export {
  RNFP_INTENTS,
  getRnfpChatCategories,
  getRnfpCommandCategories,
  getAllRnfpCategories,
} from "./core/rnfp/rnfp-categories.js";

export { rnfpProtocolHandler, FEDERATION_HELP } from "./core/rnfp/rnfp-protocol-handlers.js";

export type { FederationStore } from "./core/rnfp/rnfp-store.js";
export { MemoryFederationStore, FileFederationStore } from "./core/rnfp/rnfp-store.js";

export type { RnfpBotVars } from "./core/rnfp/rnfp-bot-plugin.js";
export { FederationBotPlugin } from "./core/rnfp/rnfp-bot-plugin.js";