import type { RuntimeEmitter, RuntimeEvent, PluginInfo } from "./runtime-emitter.js";
import type { Store, LogEntry, MessageEntry } from "./store.js";
import { LOG_BUFFER_SIZE, MSG_BUFFER_SIZE } from "./store.js";

/**
 * Estado base que el bridge sabe reducir.
 * Los consumidores pueden extender esta interfaz con campos propios
 * (ej. DashboardState extiende con mockMode, tokenConfigured, etc.).
 */
export interface BaseRuntimeState {
  botStatus: "starting" | "running" | "stopped" | "error";
  startedAt: Date | null;
  plugins: PluginInfo[];
  commandCount: number;
  chatIds: number[];
  logs: LogEntry[];
  messages: MessageEntry[];
}

/** Estado base por defecto — usado como initial si el consumidor no aporta el suyo. */
export function getDefaultBaseState(): BaseRuntimeState {
  return {
    botStatus: "starting",
    startedAt: null,
    plugins: [],
    commandCount: 0,
    chatIds: [],
    logs: [],
    messages: [],
  };
}

/** Opciones de configuración del bridge. */
export interface EmitterBridgeOptions {
  /** Tamaño máximo del buffer de logs. Default: LOG_BUFFER_SIZE (200). */
  logBufferSize?: number;
  /** Tamaño máximo del buffer de mensajes. Default: MSG_BUFFER_SIZE (100). */
  msgBufferSize?: number;
}

/**
 * Conecta un RuntimeEmitter a un Store<T> donde T extiende BaseRuntimeState.
 * Aplica cada RuntimeEvent como mutación de estado.
 * Devuelve la función de desubscripción.
 */
export function connectEmitterToStore<T extends BaseRuntimeState>(
  emitter: RuntimeEmitter,
  store: Store<T>,
  options?: EmitterBridgeOptions,
): () => void {
  const maxLogs = options?.logBufferSize ?? LOG_BUFFER_SIZE;
  const maxMsgs = options?.msgBufferSize ?? MSG_BUFFER_SIZE;

  function handleEvent(event: RuntimeEvent) {
    store.setState((prev) => {
      switch (event.type) {
        case "plugins-registered":
          return {
            ...prev,
            plugins: event.plugins,
            botStatus: "running" as const,
            startedAt: prev.startedAt ?? new Date(event.timestamp),
          };

        case "commands-synced":
          return { ...prev, commandCount: event.commandCount };

        case "status-change":
          return { ...prev, botStatus: event.status };

        case "chat-tracked":
          if (prev.chatIds.includes(event.chatId)) return prev;
          return { ...prev, chatIds: [...prev.chatIds, event.chatId] };

        case "broadcast":
          return prev;

        case "log": {
          const entry: LogEntry = {
            level: event.level,
            scope: event.scope,
            message: event.message,
            timestamp: event.timestamp,
          };
          const logs = [...prev.logs, entry].slice(-maxLogs) as T["logs"];
          return { ...prev, logs };
        }

        case "message": {
          const entry: MessageEntry = {
            chatId: event.chatId,
            username: event.username,
            text: event.text,
            timestamp: event.timestamp,
          };
          const messages = [...prev.messages, entry].slice(-maxMsgs) as T["messages"];
          return { ...prev, messages };
        }

        default:
          return prev;
      }
    });
  }

  const sub = emitter.events$.subscribe(handleEvent);
  return () => sub.unsubscribe();
}
