/**
 * Mini reactive store — genérico sobre T, sin dependencias externas.
 * Provee el patrón getState/setState/subscribe para conectar
 * RuntimeEmitter a cualquier UI framework (Ink, React web, vanilla).
 */

// --- Tipos de buffer estándar ---

/** Entrada de log en un buffer de UI. Corresponde a RuntimeEvent type:"log". */
export interface LogEntry {
  level: "debug" | "info" | "warn" | "error";
  scope: string;
  message: string;
  timestamp: string;
}

/** Mensaje entrante capturado. Corresponde a RuntimeEvent type:"message". */
export interface MessageEntry {
  chatId: number;
  username?: string;
  text: string;
  timestamp: string;
}

/** Tamaños por defecto para los buffers circulares. */
export const LOG_BUFFER_SIZE = 200;
export const MSG_BUFFER_SIZE = 100;

// --- Store ---

type Listener = () => void;

export interface Store<T> {
  getState(): T;
  setState(updater: (prev: T) => T): void;
  subscribe(listener: Listener): () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<Listener>();

  return {
    getState: () => state,
    setState: (updater) => {
      state = updater(state);
      for (const l of listeners) l();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
