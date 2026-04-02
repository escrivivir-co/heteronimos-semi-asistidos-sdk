import { describe, test, expect } from "bun:test";
import { createStore } from "../src/index";
import type { Store } from "../src/index";

describe("createStore — basic operations", () => {
  test("getState returns initial state", () => {
    const store = createStore({ count: 0 });
    expect(store.getState()).toEqual({ count: 0 });
  });

  test("setState updates state via updater fn", () => {
    const store = createStore({ count: 0 });
    store.setState((prev) => ({ count: prev.count + 1 }));
    expect(store.getState().count).toBe(1);
  });

  test("setState calls subscribers", () => {
    const store = createStore({ count: 0 });
    let calls = 0;
    store.subscribe(() => { calls++; });
    store.setState((prev) => ({ count: prev.count + 1 }));
    expect(calls).toBe(1);
  });

  test("multiple subscribers all notified", () => {
    const store = createStore({ x: 0 });
    const log: number[] = [];
    store.subscribe(() => log.push(1));
    store.subscribe(() => log.push(2));
    store.setState((s) => ({ x: s.x + 1 }));
    expect(log).toEqual([1, 2]);
  });

  test("unsubscribe stops notifications", () => {
    const store = createStore({ x: 0 });
    let calls = 0;
    const unsub = store.subscribe(() => { calls++; });
    unsub();
    store.setState((s) => ({ x: s.x + 1 }));
    expect(calls).toBe(0);
  });

  test("state is immutable between updates", () => {
    const store = createStore({ items: [1, 2] });
    const before = store.getState();
    store.setState((s) => ({ items: [...s.items, 3] }));
    expect(before.items).toEqual([1, 2]);
    expect(store.getState().items).toEqual([1, 2, 3]);
  });

  test("generic over complex types", () => {
    interface AppState { name: string; active: boolean }
    const store: Store<AppState> = createStore({ name: "bot", active: false });
    store.setState((s) => ({ ...s, active: true }));
    expect(store.getState()).toEqual({ name: "bot", active: true });
  });
});
