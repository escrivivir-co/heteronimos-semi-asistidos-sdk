import type { RuntimeEmitter, RuntimeEvent } from "../../src/index.js";
import type { Store } from "./store.js";
import type { DashboardState } from "./state.js";
import { LOG_BUFFER_SIZE, MSG_BUFFER_SIZE } from "./state.js";

/**
 * Conecta el RuntimeEmitter al store de la dashboard vía RxJS.
 * Aplica cada RuntimeEvent como una mutación de estado.
 * Devuelve la función de desubscripción.
 */
export function connectEmitterToStore(
  emitter: RuntimeEmitter,
  store: Store<DashboardState>
): () => void {
  function handleEvent(event: RuntimeEvent) {
    store.setState((prev) => {
      switch (event.type) {
        case "plugins-registered":
          return {
            ...prev,
            plugins: event.plugins,
            botStatus: "running",
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
          return prev; // solo informativo — lo veremos en logs

        case "log": {
          const entry = {
            level: event.level,
            scope: event.scope,
            message: event.message,
            timestamp: event.timestamp,
          };
          const logs = [...prev.logs, entry].slice(-LOG_BUFFER_SIZE);
          return { ...prev, logs };
        }

        case "message": {
          const entry = {
            chatId: event.chatId,
            username: event.username,
            text: event.text,
            timestamp: event.timestamp,
          };
          const messages = [...prev.messages, entry].slice(-MSG_BUFFER_SIZE);
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
