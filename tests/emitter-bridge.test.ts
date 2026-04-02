import { describe, test, expect } from "bun:test";
import {
  RuntimeEmitter,
  createStore,
  connectEmitterToStore,
  getDefaultBaseState,
  LOG_BUFFER_SIZE,
  MSG_BUFFER_SIZE,
  CMD_BUFFER_SIZE,
  type BaseRuntimeState,
} from "../src/index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStore() {
  return createStore<BaseRuntimeState>(getDefaultBaseState());
}

// ---------------------------------------------------------------------------
// connectEmitterToStore — event reduction
// ---------------------------------------------------------------------------

describe("connectEmitterToStore — plugins-registered", () => {
  test("sets plugins, botStatus=running, startedAt", () => {
    const emitter = new RuntimeEmitter();
    const store = makeStore();
    connectEmitterToStore(emitter, store);

    emitter.emit({
      type: "plugins-registered",
      plugins: [{ name: "test", pluginCode: "t", commandCount: 2 }],
      timestamp: "2026-01-01T00:00:00.000Z",
    });

    const s = store.getState();
    expect(s.botStatus).toBe("running");
    expect(s.plugins).toHaveLength(1);
    expect(s.plugins[0].pluginCode).toBe("t");
    expect(s.startedAt).toBeInstanceOf(Date);
  });

  test("startedAt not overwritten on second plugins-registered", () => {
    const emitter = new RuntimeEmitter();
    const store = makeStore();
    connectEmitterToStore(emitter, store);

    const ts1 = "2026-01-01T00:00:00.000Z";
    const ts2 = "2026-01-01T01:00:00.000Z";
    emitter.emit({ type: "plugins-registered", plugins: [], timestamp: ts1 });
    const first = store.getState().startedAt;
    emitter.emit({ type: "plugins-registered", plugins: [], timestamp: ts2 });
    expect(store.getState().startedAt).toBe(first);
  });
});

describe("connectEmitterToStore — commands-synced", () => {
  test("updates commandCount", () => {
    const emitter = new RuntimeEmitter();
    const store = makeStore();
    connectEmitterToStore(emitter, store);
    emitter.emit({ type: "commands-synced", commandCount: 7, timestamp: "t" });
    expect(store.getState().commandCount).toBe(7);
  });
});

describe("connectEmitterToStore — status-change", () => {
  test("updates botStatus", () => {
    const emitter = new RuntimeEmitter();
    const store = makeStore();
    connectEmitterToStore(emitter, store);
    emitter.emit({ type: "status-change", status: "error", timestamp: "t" });
    expect(store.getState().botStatus).toBe("error");
  });
});

describe("connectEmitterToStore — chat-tracked", () => {
  test("appends new chatId", () => {
    const emitter = new RuntimeEmitter();
    const store = makeStore();
    connectEmitterToStore(emitter, store);
    emitter.emit({ type: "chat-tracked", chatId: 42, total: 1, timestamp: "t" });
    expect(store.getState().chatIds).toContain(42);
  });

  test("does not duplicate existing chatId", () => {
    const emitter = new RuntimeEmitter();
    const store = makeStore();
    connectEmitterToStore(emitter, store);
    emitter.emit({ type: "chat-tracked", chatId: 42, total: 1, timestamp: "t" });
    emitter.emit({ type: "chat-tracked", chatId: 42, total: 1, timestamp: "t" });
    expect(store.getState().chatIds).toEqual([42]);
  });
});

describe("connectEmitterToStore — broadcast", () => {
  test("broadcast does not mutate state", () => {
    const emitter = new RuntimeEmitter();
    const store = makeStore();
    connectEmitterToStore(emitter, store);
    const before = store.getState();
    emitter.emit({ type: "broadcast", chatCount: 3, message: "hi", timestamp: "t" });
    expect(store.getState()).toBe(before);
  });
});

describe("connectEmitterToStore — log buffer", () => {
  test("log events appended to logs array", () => {
    const emitter = new RuntimeEmitter();
    const store = makeStore();
    connectEmitterToStore(emitter, store);
    emitter.emit({ type: "log", level: "info", scope: "x", message: "hello", timestamp: "t" });
    const logs = store.getState().logs;
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ level: "info", scope: "x", message: "hello" });
  });

  test("log buffer respects default LOG_BUFFER_SIZE", () => {
    const emitter = new RuntimeEmitter();
    const store = makeStore();
    connectEmitterToStore(emitter, store);
    for (let i = 0; i < LOG_BUFFER_SIZE + 10; i++) {
      emitter.emit({ type: "log", level: "debug", scope: "s", message: `m${i}`, timestamp: "t" });
    }
    expect(store.getState().logs).toHaveLength(LOG_BUFFER_SIZE);
  });

  test("log buffer respects custom logBufferSize", () => {
    const emitter = new RuntimeEmitter();
    const store = makeStore();
    connectEmitterToStore(emitter, store, { logBufferSize: 5 });
    for (let i = 0; i < 10; i++) {
      emitter.emit({ type: "log", level: "info", scope: "s", message: `m${i}`, timestamp: "t" });
    }
    expect(store.getState().logs).toHaveLength(5);
    expect(store.getState().logs[4].message).toBe("m9");
  });
});

describe("connectEmitterToStore — message buffer", () => {
  test("message events appended to messages array", () => {
    const emitter = new RuntimeEmitter();
    const store = makeStore();
    connectEmitterToStore(emitter, store);
    emitter.emit({ type: "message", chatId: 1, text: "hi", timestamp: "t" });
    const msgs = store.getState().messages;
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({ chatId: 1, text: "hi" });
  });

  test("message buffer respects default MSG_BUFFER_SIZE", () => {
    const emitter = new RuntimeEmitter();
    const store = makeStore();
    connectEmitterToStore(emitter, store);
    for (let i = 0; i < MSG_BUFFER_SIZE + 10; i++) {
      emitter.emit({ type: "message", chatId: i, text: `t${i}`, timestamp: "t" });
    }
    expect(store.getState().messages).toHaveLength(MSG_BUFFER_SIZE);
  });

  test("message buffer respects custom msgBufferSize", () => {
    const emitter = new RuntimeEmitter();
    const store = makeStore();
    connectEmitterToStore(emitter, store, { msgBufferSize: 3 });
    for (let i = 0; i < 5; i++) {
      emitter.emit({ type: "message", chatId: i, text: `t${i}`, timestamp: "t" });
    }
    expect(store.getState().messages).toHaveLength(3);
    expect(store.getState().messages[2].chatId).toBe(4);
  });
});

describe("connectEmitterToStore — unsubscribe", () => {
  test("returned unsub stops receiving events", () => {
    const emitter = new RuntimeEmitter();
    const store = makeStore();
    const unsub = connectEmitterToStore(emitter, store);
    emitter.emit({ type: "commands-synced", commandCount: 5, timestamp: "t" });
    expect(store.getState().commandCount).toBe(5);
    unsub();
    emitter.emit({ type: "commands-synced", commandCount: 99, timestamp: "t" });
    expect(store.getState().commandCount).toBe(5);
  });
});

describe("connectEmitterToStore — command-response buffer", () => {
  test("commandResponses starts empty", () => {
    const store = makeStore();
    expect(store.getState().commandResponses).toEqual([]);
  });

  test("command-response appended to commandResponses", () => {
    const emitter = new RuntimeEmitter();
    const store = makeStore();
    connectEmitterToStore(emitter, store);
    emitter.emit({ type: "command-response", command: "tst_ping", text: "pong", chatId: 1, timestamp: "t" });
    const responses = store.getState().commandResponses;
    expect(responses).toHaveLength(1);
    expect(responses[0]).toMatchObject({ command: "tst_ping", text: "pong", chatId: 1 });
  });

  test("multiple command-response events accumulate in order", () => {
    const emitter = new RuntimeEmitter();
    const store = makeStore();
    connectEmitterToStore(emitter, store);
    emitter.emit({ type: "command-response", command: "a", text: "reply-a", chatId: 1, timestamp: "t1" });
    emitter.emit({ type: "command-response", command: "b", text: "reply-b", chatId: 2, timestamp: "t2" });
    const responses = store.getState().commandResponses;
    expect(responses).toHaveLength(2);
    expect(responses[0].command).toBe("a");
    expect(responses[1].command).toBe("b");
  });

  test("commandResponses buffer respects default CMD_BUFFER_SIZE", () => {
    const emitter = new RuntimeEmitter();
    const store = makeStore();
    connectEmitterToStore(emitter, store);
    for (let i = 0; i < CMD_BUFFER_SIZE + 10; i++) {
      emitter.emit({ type: "command-response", command: "x", text: `t${i}`, chatId: i, timestamp: "t" });
    }
    expect(store.getState().commandResponses).toHaveLength(CMD_BUFFER_SIZE);
  });

  test("commandResponses buffer respects custom cmdBufferSize", () => {
    const emitter = new RuntimeEmitter();
    const store = makeStore();
    connectEmitterToStore(emitter, store, { cmdBufferSize: 3 });
    for (let i = 0; i < 5; i++) {
      emitter.emit({ type: "command-response", command: "x", text: `t${i}`, chatId: i, timestamp: "t" });
    }
    expect(store.getState().commandResponses).toHaveLength(3);
    expect(store.getState().commandResponses[2].chatId).toBe(4);
  });

  test("command-executed does not change state", () => {
    const emitter = new RuntimeEmitter();
    const store = makeStore();
    connectEmitterToStore(emitter, store);
    const before = store.getState();
    emitter.emit({ type: "command-executed", command: "tst_ping", chatId: 1, userId: 42, username: "u", timestamp: "t" });
    expect(store.getState()).toBe(before);
  });
});

describe("connectEmitterToStore — extended state (generics)", () => {
  test("works with an app state that extends BaseRuntimeState", () => {
    interface AppState extends BaseRuntimeState {
      extraField: string;
    }
    const emitter = new RuntimeEmitter();
    const store = createStore<AppState>({ ...getDefaultBaseState(), extraField: "hello" });
    connectEmitterToStore(emitter, store);
    emitter.emit({ type: "commands-synced", commandCount: 3, timestamp: "t" });
    const s = store.getState();
    expect(s.commandCount).toBe(3);
    expect(s.extraField).toBe("hello");
  });
});
