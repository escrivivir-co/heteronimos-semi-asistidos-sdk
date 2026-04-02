/**
 * Mini reactive store — 30 lines, mismo patrón que reference-console-app/state/store.ts
 * genérico sobre T, sin dependencias externas.
 */
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
