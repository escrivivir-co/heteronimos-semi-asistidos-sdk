import { describe, test, expect } from "bun:test";
import {
  RuntimeEmitter,
  reduceRuntime,
  DEFAULT_BOT_RUNTIME,
  type RuntimeEvent,
  type BotRuntime,
} from "../src/index";
import { Logger } from "../src/index";
import { ChatTracker, MemoryChatStore } from "../src/index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collect all synchronous emissions from an Observable into an array. */
function collect<T>(obs: import("rxjs").Observable<T>): T[] {
  const out: T[] = [];
  obs.subscribe(v => out.push(v));
  return out;
}

// ---------------------------------------------------------------------------
// RuntimeEmitter — RxJS streams
// ---------------------------------------------------------------------------

describe("RuntimeEmitter — events$", () => {
  test("emit() → events$ receives the event", () => {
    const emitter = new RuntimeEmitter();
    const received = collect(emitter.events$);

    emitter.emit({ type: "commands-synced", commandCount: 3, timestamp: "t" });
    expect(received.length).toBe(1);
    expect(received[0]).toMatchObject({ type: "commands-synced", commandCount: 3 });
  });

  test("multiple events arrive in order", () => {
    const emitter = new RuntimeEmitter();
    const types: string[] = [];
    emitter.events$.subscribe(e => types.push(e.type));

    emitter.emit({ type: "status-change", status: "running", timestamp: "t1" });
    emitter.emit({ type: "commands-synced", commandCount: 5, timestamp: "t2" });
    emitter.emit({ type: "chat-tracked", chatId: 1, total: 1, timestamp: "t3" });

    expect(types).toEqual(["status-change", "commands-synced", "chat-tracked"]);
  });

  test("complete() ends the stream", () => {
    const emitter = new RuntimeEmitter();
    let completed = false;
    emitter.events$.subscribe({ complete: () => { completed = true; } });

    emitter.complete();
    expect(completed).toBe(true);
  });
});

describe("RuntimeEmitter — logs$", () => {
  test("logs$ receives only log events", () => {
    const emitter = new RuntimeEmitter();
    const logEvents = collect(emitter.logs$);

    emitter.emit({ type: "log", level: "info", scope: "test", message: "hello", timestamp: "t" });
    emitter.emit({ type: "commands-synced", commandCount: 1, timestamp: "t" });
    emitter.emit({ type: "log", level: "error", scope: "test", message: "boom", timestamp: "t" });

    expect(logEvents.length).toBe(2);
    expect(logEvents[0].level).toBe("info");
    expect(logEvents[1].level).toBe("error");
  });

  test("logs$ is narrowed to log type — typescript type guard", () => {
    const emitter = new RuntimeEmitter();
    emitter.logs$.subscribe(e => {
      // type should be "log" — TS would fail to compile if not narrowed
      const _: "log" = e.type;
      expect(_).toBe("log");
    });
    emitter.emit({ type: "log", level: "warn", scope: "s", message: "m", timestamp: "t" });
  });
});

describe("RuntimeEmitter — messages$", () => {
  test("messages$ receives only message events", () => {
    const emitter = new RuntimeEmitter();
    const msgs = collect(emitter.messages$);

    emitter.emit({ type: "log", level: "info", scope: "s", message: "m", timestamp: "t" });
    emitter.emit({ type: "message", chatId: 42, text: "hi", timestamp: "t" });
    emitter.emit({ type: "status-change", status: "running", timestamp: "t" });
    emitter.emit({ type: "message", chatId: 99, text: "bye", timestamp: "t" });

    expect(msgs.length).toBe(2);
    expect(msgs[0].chatId).toBe(42);
    expect(msgs[1].chatId).toBe(99);
  });
});

describe("RuntimeEmitter — command-executed / command-response events", () => {
  test("command-executed flows through events$", () => {
    const emitter = new RuntimeEmitter();
    const events = collect(emitter.events$);

    emitter.emit({ type: "command-executed", command: "tst_ping", chatId: 1, userId: 42, username: "u", timestamp: "t" });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "command-executed", command: "tst_ping" });
  });

  test("command-response flows through events$", () => {
    const emitter = new RuntimeEmitter();
    const events = collect(emitter.events$);

    emitter.emit({ type: "command-response", command: "tst_ping", text: "pong", chatId: 1, timestamp: "t" });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "command-response", text: "pong" });
  });

  test("both new event types appear in correct order in events$", () => {
    const emitter = new RuntimeEmitter();
    const types: string[] = [];
    emitter.events$.subscribe(e => types.push(e.type));

    emitter.emit({ type: "command-executed", command: "x", chatId: 1, userId: 1, username: "u", timestamp: "t" });
    emitter.emit({ type: "command-response", command: "x", text: "ok", chatId: 1, timestamp: "t" });

    expect(types).toEqual(["command-executed", "command-response"]);
  });
});

describe("RuntimeEmitter — snapshot$", () => {
  test("snapshot$ accumulates state across events", () => {
    const emitter = new RuntimeEmitter();
    const snapshots: BotRuntime[] = [];
    emitter.snapshot$.subscribe(s => snapshots.push(s));

    emitter.emit({
      type: "plugins-registered",
      plugins: [{ name: "RabbitBot", pluginCode: "rb", commandCount: 4, commands: [] }],
      timestamp: "2024-01-01T00:00:00.000Z",
    });
    emitter.emit({ type: "chat-tracked", chatId: 10, total: 1, timestamp: "t" });
    emitter.emit({ type: "commands-synced", commandCount: 7, timestamp: "t" });

    const last = snapshots[snapshots.length - 1];
    expect(last.status).toBe("running");
    expect(last.plugins).toHaveLength(1);
    expect(last.plugins[0].pluginCode).toBe("rb");
    expect(last.chatCount).toBe(1);
    expect(last.commandCount).toBe(7);
  });

  test("snapshot$ replays last value for late subscribers (shareReplay)", () => {
    const emitter = new RuntimeEmitter();

    // Emit before subscribing
    emitter.emit({ type: "status-change", status: "running", timestamp: "t" });
    emitter.emit({ type: "commands-synced", commandCount: 3, timestamp: "t" });

    // Subscribe late — should still get last accumulated value
    const received: BotRuntime[] = [];
    emitter.snapshot$.subscribe(s => received.push(s));

    expect(received.length).toBe(1);
    expect(received[0].status).toBe("running");
    expect(received[0].commandCount).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// reduceRuntime — pure reducer
// ---------------------------------------------------------------------------

describe("reduceRuntime — pure reducer", () => {
  test("status-change updates status", () => {
    const next = reduceRuntime(DEFAULT_BOT_RUNTIME, {
      type: "status-change",
      status: "error",
      timestamp: "t",
    });
    expect(next.status).toBe("error");
    // other fields unchanged
    expect(next.plugins).toBe(DEFAULT_BOT_RUNTIME.plugins);
  });

  test("plugins-registered sets plugins, status=running, startedAt", () => {
    const plugins = [{ name: "X", pluginCode: "x", commandCount: 2, commands: [] }];
    const next = reduceRuntime(DEFAULT_BOT_RUNTIME, {
      type: "plugins-registered",
      plugins,
      timestamp: "2024-06-01T12:00:00.000Z",
    });
    expect(next.status).toBe("running");
    expect(next.plugins).toEqual(plugins);
    expect(next.startedAt).toBeInstanceOf(Date);
    expect(next.startedAt!.toISOString()).toBe("2024-06-01T12:00:00.000Z");
  });

  test("plugins-registered does not overwrite existing startedAt", () => {
    const existing = new Date("2024-01-01T00:00:00.000Z");
    const state: BotRuntime = { ...DEFAULT_BOT_RUNTIME, startedAt: existing };
    const next = reduceRuntime(state, {
      type: "plugins-registered",
      plugins: [],
      timestamp: "2024-06-01T00:00:00.000Z",
    });
    expect(next.startedAt).toBe(existing);
  });

  test("commands-synced updates commandCount", () => {
    const next = reduceRuntime(DEFAULT_BOT_RUNTIME, {
      type: "commands-synced",
      commandCount: 12,
      timestamp: "t",
    });
    expect(next.commandCount).toBe(12);
  });

  test("chat-tracked updates chatCount", () => {
    const next = reduceRuntime(DEFAULT_BOT_RUNTIME, {
      type: "chat-tracked",
      chatId: 1,
      total: 5,
      timestamp: "t",
    });
    expect(next.chatCount).toBe(5);
  });

  test("unrelated events (log, message, broadcast) return state unchanged", () => {
    const state: BotRuntime = { ...DEFAULT_BOT_RUNTIME, status: "running", commandCount: 3 };

    const afterLog = reduceRuntime(state, {
      type: "log", level: "info", scope: "s", message: "m", timestamp: "t",
    });
    expect(afterLog).toBe(state);

    const afterMessage = reduceRuntime(state, {
      type: "message", chatId: 1, text: "hi", timestamp: "t",
    });
    expect(afterMessage).toBe(state);

    const afterBroadcast = reduceRuntime(state, {
      type: "broadcast", chatCount: 3, message: "hello", timestamp: "t",
    });
    expect(afterBroadcast).toBe(state);

    const afterCommandExecuted = reduceRuntime(state, {
      type: "command-executed", command: "x", chatId: 1, userId: 42, username: "u", timestamp: "t",
    });
    expect(afterCommandExecuted).toBe(state);

    const afterCommandResponse = reduceRuntime(state, {
      type: "command-response", command: "x", text: "reply", chatId: 1, timestamp: "t",
    });
    expect(afterCommandResponse).toBe(state);
  });

  test("DEFAULT_BOT_RUNTIME is initial state baseline", () => {
    expect(DEFAULT_BOT_RUNTIME.status).toBe("starting");
    expect(DEFAULT_BOT_RUNTIME.startedAt).toBeNull();
    expect(DEFAULT_BOT_RUNTIME.plugins).toHaveLength(0);
    expect(DEFAULT_BOT_RUNTIME.commandCount).toBe(0);
    expect(DEFAULT_BOT_RUNTIME.chatCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// RuntimeEmitter — legacy API (on / off)
// ---------------------------------------------------------------------------

describe("RuntimeEmitter — legacy on/off API", () => {
  test("on() receives emitted event", () => {
    const emitter = new RuntimeEmitter();
    const received: RuntimeEvent[] = [];
    emitter.on(e => received.push(e));

    emitter.emit({ type: "commands-synced", commandCount: 3, timestamp: "t" });
    expect(received.length).toBe(1);
    expect(received[0]).toMatchObject({ type: "commands-synced", commandCount: 3 });
  });

  test("unsubscribe function returned by on() stops receiving events", () => {
    const emitter = new RuntimeEmitter();
    const received: RuntimeEvent[] = [];
    const unsub = emitter.on(e => received.push(e));

    emitter.emit({ type: "commands-synced", commandCount: 1, timestamp: "t" });
    unsub();
    emitter.emit({ type: "commands-synced", commandCount: 2, timestamp: "t" });

    expect(received.length).toBe(1);
  });

  test("multiple on() listeners all receive events", () => {
    const emitter = new RuntimeEmitter();
    const a: RuntimeEvent[] = [];
    const b: RuntimeEvent[] = [];
    emitter.on(e => a.push(e));
    emitter.on(e => b.push(e));

    emitter.emit({ type: "commands-synced", commandCount: 5, timestamp: "t" });
    expect(a.length).toBe(1);
    expect(b.length).toBe(1);
  });

  test("off() is a no-op and does not throw", () => {
    const emitter = new RuntimeEmitter();
    const listener = (_: RuntimeEvent) => {};
    // Should not throw even though it's a no-op
    expect(() => emitter.off(listener)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Logger + RuntimeEmitter integration (unchanged)
// ---------------------------------------------------------------------------

describe("Logger + RuntimeEmitter integration", () => {
  test("emits log event when emitter is provided", () => {
    const emitter = new RuntimeEmitter();
    const events: RuntimeEvent[] = [];
    emitter.on(e => events.push(e));

    const log = new Logger("test-scope", { emitter, transport: () => {} });
    log.info("hello world");

    expect(events.length).toBe(1);
    const e = events[0];
    expect(e.type).toBe("log");
    if (e.type === "log") {
      expect(e.level).toBe("info");
      expect(e.scope).toBe("test-scope");
      expect(e.message).toBe("hello world");
    }
  });

  test("emits log events for all levels", () => {
    const emitter = new RuntimeEmitter();
    const levels: string[] = [];
    emitter.on(e => { if (e.type === "log") levels.push(e.level); });

    const log = new Logger("lvl", { level: "debug", emitter, transport: () => {} });
    log.debug("d");
    log.info("i");
    log.warn("w");
    log.error("e");

    expect(levels).toEqual(["debug", "info", "warn", "error"]);
  });

  test("suppressed levels do not emit events", () => {
    const emitter = new RuntimeEmitter();
    const events: RuntimeEvent[] = [];
    emitter.on(e => events.push(e));

    const log = new Logger("quiet", { level: "error", emitter, transport: () => {} });
    log.info("suppressed");
    log.debug("also suppressed");

    expect(events.length).toBe(0);
  });

  test("does not emit if no emitter configured", () => {
    // Should not throw
    const log = new Logger("noemitter", { transport: () => {} });
    expect(() => log.info("fine")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// ChatTracker + RuntimeEmitter integration (unchanged)
// ---------------------------------------------------------------------------

describe("ChatTracker + RuntimeEmitter integration", () => {
  test("emits chat-tracked event on new chat", () => {
    const emitter = new RuntimeEmitter();
    const events: RuntimeEvent[] = [];
    emitter.on(e => events.push(e));

    const tracker = new ChatTracker(new MemoryChatStore(), emitter);
    tracker.track(42);

    expect(events.length).toBe(1);
    const e = events[0];
    expect(e.type).toBe("chat-tracked");
    if (e.type === "chat-tracked") {
      expect(e.chatId).toBe(42);
      expect(e.total).toBe(1);
    }
  });

  test("does not emit on duplicate track", () => {
    const emitter = new RuntimeEmitter();
    const events: RuntimeEvent[] = [];
    emitter.on(e => events.push(e));

    const tracker = new ChatTracker(new MemoryChatStore(), emitter);
    tracker.track(42);
    tracker.track(42); // duplicate

    expect(events.length).toBe(1);
  });

  test("total increments correctly across multiple tracks", () => {
    const emitter = new RuntimeEmitter();
    const totals: number[] = [];
    emitter.on(e => { if (e.type === "chat-tracked") totals.push(e.total); });

    const tracker = new ChatTracker(new MemoryChatStore(), emitter);
    tracker.track(1);
    tracker.track(2);
    tracker.track(3);

    expect(totals).toEqual([1, 2, 3]);
  });

  test("does not emit if no emitter configured", () => {
    const tracker = new ChatTracker();
    expect(() => tracker.track(99)).not.toThrow();
  });
});


describe("Logger + RuntimeEmitter integration", () => {
  test("emits log event when emitter is provided", () => {
    const emitter = new RuntimeEmitter();
    const events: RuntimeEvent[] = [];
    emitter.on(e => events.push(e));

    const log = new Logger("test-scope", { emitter, transport: () => {} });
    log.info("hello world");

    expect(events.length).toBe(1);
    const e = events[0];
    expect(e.type).toBe("log");
    if (e.type === "log") {
      expect(e.level).toBe("info");
      expect(e.scope).toBe("test-scope");
      expect(e.message).toBe("hello world");
    }
  });

  test("emits log events for all levels", () => {
    const emitter = new RuntimeEmitter();
    const levels: string[] = [];
    emitter.on(e => { if (e.type === "log") levels.push(e.level); });

    const log = new Logger("lvl", { level: "debug", emitter, transport: () => {} });
    log.debug("d");
    log.info("i");
    log.warn("w");
    log.error("e");

    expect(levels).toEqual(["debug", "info", "warn", "error"]);
  });

  test("suppressed levels do not emit events", () => {
    const emitter = new RuntimeEmitter();
    const events: RuntimeEvent[] = [];
    emitter.on(e => events.push(e));

    const log = new Logger("quiet", { level: "error", emitter, transport: () => {} });
    log.info("suppressed");
    log.debug("also suppressed");

    expect(events.length).toBe(0);
  });

  test("does not emit if no emitter configured", () => {
    // Should not throw
    const log = new Logger("noemitter", { transport: () => {} });
    expect(() => log.info("fine")).not.toThrow();
  });
});

describe("ChatTracker + RuntimeEmitter integration", () => {
  test("emits chat-tracked event on new chat", () => {
    const emitter = new RuntimeEmitter();
    const events: RuntimeEvent[] = [];
    emitter.on(e => events.push(e));

    const tracker = new ChatTracker(new MemoryChatStore(), emitter);
    tracker.track(42);

    expect(events.length).toBe(1);
    const e = events[0];
    expect(e.type).toBe("chat-tracked");
    if (e.type === "chat-tracked") {
      expect(e.chatId).toBe(42);
      expect(e.total).toBe(1);
    }
  });

  test("does not emit on duplicate track", () => {
    const emitter = new RuntimeEmitter();
    const events: RuntimeEvent[] = [];
    emitter.on(e => events.push(e));

    const tracker = new ChatTracker(new MemoryChatStore(), emitter);
    tracker.track(42);
    tracker.track(42); // duplicate

    expect(events.length).toBe(1);
  });

  test("total increments correctly across multiple tracks", () => {
    const emitter = new RuntimeEmitter();
    const totals: number[] = [];
    emitter.on(e => { if (e.type === "chat-tracked") totals.push(e.total); });

    const tracker = new ChatTracker(new MemoryChatStore(), emitter);
    tracker.track(1);
    tracker.track(2);
    tracker.track(3);

    expect(totals).toEqual([1, 2, 3]);
  });

  test("does not emit if no emitter configured", () => {
    const tracker = new ChatTracker();
    expect(() => tracker.track(99)).not.toThrow();
  });
});
