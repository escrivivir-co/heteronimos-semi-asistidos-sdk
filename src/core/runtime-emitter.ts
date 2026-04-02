import { Subject, Observable } from "rxjs";
import { filter, scan, shareReplay } from "rxjs/operators";

// --- Snapshot del estado runtime (construido por el consumidor desde eventos) ---

export interface PluginInfo {
  name: string;
  pluginCode: string;
  commandCount: number;
}

export interface BotRuntime {
  status: "starting" | "running" | "stopped" | "error";
  startedAt: Date | null;
  plugins: PluginInfo[];
  commandCount: number;
  chatCount: number;
}

// --- Unión de eventos emitidos por el SDK ---

export type RuntimeEvent =
  | { type: "log"; level: "debug" | "info" | "warn" | "error"; scope: string; message: string; timestamp: string }
  | { type: "message"; chatId: number; userId?: number; username?: string; text: string; timestamp: string }
  | { type: "status-change"; status: BotRuntime["status"]; timestamp: string }
  | { type: "chat-tracked"; chatId: number; total: number; timestamp: string }
  | { type: "broadcast"; chatCount: number; message: string; timestamp: string }
  | { type: "commands-synced"; commandCount: number; timestamp: string }
  | { type: "plugins-registered"; plugins: PluginInfo[]; timestamp: string };

// --- Reducer puro para BotRuntime ---

export const DEFAULT_BOT_RUNTIME: BotRuntime = {
  status: "starting",
  startedAt: null,
  plugins: [],
  commandCount: 0,
  chatCount: 0,
};

export function reduceRuntime(state: BotRuntime, event: RuntimeEvent): BotRuntime {
  switch (event.type) {
    case "status-change":
      return { ...state, status: event.status };
    case "plugins-registered":
      return {
        ...state,
        plugins: event.plugins,
        status: "running",
        startedAt: state.startedAt ?? new Date(event.timestamp),
      };
    case "commands-synced":
      return { ...state, commandCount: event.commandCount };
    case "chat-tracked":
      return { ...state, chatCount: event.total };
    default:
      return state;
  }
}

// --- Emitter tipado sobre RxJS Subject ---

export class RuntimeEmitter {
  private subject = new Subject<RuntimeEvent>();

  /** Stream de todos los eventos del runtime. */
  readonly events$: Observable<RuntimeEvent> = this.subject.asObservable();

  /** Solo eventos de tipo "log". */
  readonly logs$: Observable<Extract<RuntimeEvent, { type: "log" }>> = this.events$.pipe(
    filter((e): e is Extract<RuntimeEvent, { type: "log" }> => e.type === "log"),
  );

  /** Solo eventos de tipo "message". */
  readonly messages$: Observable<Extract<RuntimeEvent, { type: "message" }>> = this.events$.pipe(
    filter((e): e is Extract<RuntimeEvent, { type: "message" }> => e.type === "message"),
  );

  /** Snapshot acumulado del estado del bot — emite tras cada evento relevante. */
  readonly snapshot$: Observable<BotRuntime> = this.events$.pipe(
    scan<RuntimeEvent, BotRuntime>(reduceRuntime, DEFAULT_BOT_RUNTIME),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  constructor() {
    // Bootstrap snapshot$ eagerly so it accumulates state from the moment the emitter
    // is created. Without this, events emitted before the first subscriber are lost.
    this.snapshot$.subscribe();
  }

  /** Emite un evento al stream. */
  emit(event: RuntimeEvent): void {
    this.subject.next(event);
  }

  /**
   * Suscribe un listener a todos los eventos del runtime.
   * Devuelve una función de desubscripción (API legacy, compatibilidad con Logger/ChatTracker).
   */
  on(listener: (event: RuntimeEvent) => void): () => void {
    const sub = this.subject.subscribe(listener);
    return () => sub.unsubscribe();
  }

  /**
   * @deprecated Usa el unsub devuelto por on() en su lugar.
   * No-op en la implementación RxJS. Mantenido por compatibilidad legacy.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  off(_listener: (event: RuntimeEvent) => void): void {
    // No-op. Con RxJS la desubscripción se hace vía el valor de retorno de on().
  }

  /** Señala el fin del stream (shutdown del bot). Completa todos los observables derivados. */
  complete(): void {
    this.subject.complete();
  }
}
