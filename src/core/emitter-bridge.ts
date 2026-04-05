import type { RuntimeEmitter, RuntimeEvent, PluginInfo } from "./runtime-emitter.js";
import type { Store, LogEntry, MessageEntry, CommandResponseEntry } from "./persistence/store.js";
import { LOG_BUFFER_SIZE, MSG_BUFFER_SIZE, CMD_BUFFER_SIZE } from "./persistence/store.js";
import type { MessageStore } from "./persistence/message-store.js";

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
  /** Nombres/títulos conocidos de cada chat. Clave: chatId numérico. */
  chatNames: Record<number, string>;
  logs: LogEntry[];
  messages: MessageEntry[];
  /** Respuestas de comandos ejecutados desde la UI (mock mode). Buffer circular. */
  commandResponses: CommandResponseEntry[];
}

/** Estado base por defecto — usado como initial si el consumidor no aporta el suyo. */
export function getDefaultBaseState(): BaseRuntimeState {
  return {
    botStatus: "starting",
    startedAt: null,
    plugins: [],
    commandCount: 0,
    chatIds: [],
    chatNames: {},
    logs: [],
    messages: [],
    commandResponses: [],
  };
}

/** Opciones de configuración del bridge. */
export interface EmitterBridgeOptions {
  /** Tamaño máximo del buffer de logs. Default: LOG_BUFFER_SIZE (200). */
  logBufferSize?: number;
  /** Tamaño máximo del buffer de mensajes. Default: MSG_BUFFER_SIZE (100). */
  msgBufferSize?: number;
  /** Tamaño máximo del buffer de respuestas de comandos. Default: CMD_BUFFER_SIZE (50). */
  cmdBufferSize?: number;
  /**
   * Si se proporciona, persiste mensajes y command-responses a disco.
   * Al conectar, carga el historial previo en el store.
   */
  messageStore?: MessageStore;
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
  const maxCmds = options?.cmdBufferSize ?? CMD_BUFFER_SIZE;
  const messageStore = options?.messageStore;

  // Cargar historial persistido antes de suscribirnos a eventos nuevos.
  if (messageStore) {
    const loaded = messageStore.load();
    const applyLoaded = (data: import("./persistence/message-store.js").PersistedMessages) => {
      // Derivar chatIds de los mensajes cargados + los persistidos directamente.
      // ChatTracker no re-emite chat-tracked para chats ya conocidos al arrancar.
      const chatIdSet = new Set<number>(data.chatIds ?? []);
      for (const m of data.messages) chatIdSet.add(m.chatId);
      for (const c of data.commandResponses) chatIdSet.add(c.chatId);
      store.setState((prev) => {
        // Merge con chatIds que ya pueda haber (e.g. cargados por ChatTracker)
        const merged = new Set([...prev.chatIds, ...chatIdSet]);
        return {
          ...prev,
          messages: (data.messages as T["messages"]),
          commandResponses: (data.commandResponses as T["commandResponses"]),
          chatIds: [...merged] as T["chatIds"],
          chatNames: { ...prev.chatNames, ...(data.chatNames ?? {}) } as T["chatNames"],
        };
      });
    };
    const loaded2 = messageStore.load();
    if (loaded2 instanceof Promise) {
      loaded2.then(applyLoaded);
    } else {
      applyLoaded(loaded2);
    }
  }

  // Debounce de escritura a disco (500 ms) para absorber ráfagas.
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  function scheduleSave(state: BaseRuntimeState): void {
    if (!messageStore) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      messageStore.save({ messages: state.messages, commandResponses: state.commandResponses, chatIds: state.chatIds, chatNames: state.chatNames });
    }, 500);
  }
  function flushSave(state: BaseRuntimeState): void {
    if (!messageStore) return;
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    messageStore.save({ messages: state.messages, commandResponses: state.commandResponses, chatIds: state.chatIds, chatNames: state.chatNames });
  }

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

        case "chat-tracked": {
          if (prev.chatIds.includes(event.chatId)) return prev;
          const nextChatState = { ...prev, chatIds: [...prev.chatIds, event.chatId] };
          scheduleSave(nextChatState);
          return nextChatState;
        }

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
          // Si no tenemos nombre para este chat aún, usar el username del remitente.
          const chatNames = event.username && !prev.chatNames[event.chatId]
            ? { ...prev.chatNames, [event.chatId]: event.username }
            : prev.chatNames;
          const nextMsgState = { ...prev, messages, chatNames };
          scheduleSave(nextMsgState);
          return nextMsgState;
        }

        case "command-response": {
          const entry: CommandResponseEntry = {
            command: event.command,
            text: event.text,
            chatId: event.chatId,
            timestamp: event.timestamp,
          };
          const commandResponses = [...prev.commandResponses, entry].slice(-maxCmds) as T["commandResponses"];
          const nextCmdState = { ...prev, commandResponses };
          scheduleSave(nextCmdState);
          return nextCmdState;
        }

        case "command-executed":
          // Informativo; no requiere campo propio en state
          return prev;

        default:
          return prev;
      }
    });
  }

  const sub = emitter.events$.subscribe(handleEvent);

  // Flush al completar el emitter (shutdown del bot).
  const completeSub = emitter.events$.subscribe({
    complete: () => flushSave(store.getState()),
  });

  return () => {
    sub.unsubscribe();
    completeSub.unsubscribe();
    flushSave(store.getState());
  };
}
