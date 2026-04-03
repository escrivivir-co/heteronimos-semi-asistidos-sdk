import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  RuntimeEmitter,
  createStore,
  connectEmitterToStore,
  getDefaultBaseState,
  MemoryMessageStore,
  FileMessageStore,
  type BaseRuntimeState,
  type MessageEntry,
  type CommandResponseEntry,
} from "../src/index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStore() {
  return createStore<BaseRuntimeState>(getDefaultBaseState());
}

function msgEntry(chatId: number, text: string, timestamp = "2026-01-01T00:00:00.000Z"): MessageEntry {
  return { chatId, text, username: "alice", timestamp };
}

function cmdEntry(command: string, text: string, chatId = 1, timestamp = "2026-01-01T00:00:01.000Z"): CommandResponseEntry {
  return { command, text, chatId, timestamp };
}

// ---------------------------------------------------------------------------
// MemoryMessageStore
// ---------------------------------------------------------------------------

describe("MemoryMessageStore — basic contract", () => {
  test("load returns empty by default", () => {
    const store = new MemoryMessageStore();
    const data = store.load();
    expect(data.messages).toEqual([]);
    expect(data.commandResponses).toEqual([]);
  });

  test("save and load round-trips data", () => {
    const store = new MemoryMessageStore();
    const msgs = [msgEntry(1, "hello"), msgEntry(2, "world")];
    const cmds = [cmdEntry("rb_aleph", "Next hole!")];
    store.save({ messages: msgs, commandResponses: cmds });
    const loaded = store.load();
    expect(loaded.messages).toEqual(msgs);
    expect(loaded.commandResponses).toEqual(cmds);
  });

  test("load returns a copy — mutation does not affect store", () => {
    const store = new MemoryMessageStore();
    store.save({ messages: [msgEntry(1, "hi")], commandResponses: [] });
    const loaded = store.load();
    loaded.messages.push(msgEntry(2, "extra"));
    expect(store.load().messages).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// FileMessageStore
// ---------------------------------------------------------------------------

describe("FileMessageStore — load", () => {
  let dir: string;
  let filePath: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "fms-test-"));
    filePath = path.join(dir, ".messages.json");
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("returns empty when file does not exist", () => {
    const store = new FileMessageStore(filePath);
    const data = store.load();
    expect(data.messages).toEqual([]);
    expect(data.commandResponses).toEqual([]);
  });

  test("returns empty when file contains garbage (corrupt)", () => {
    fs.writeFileSync(filePath, "not valid json }{{{");
    const store = new FileMessageStore(filePath);
    const data = store.load();
    expect(data.messages).toEqual([]);
    expect(data.commandResponses).toEqual([]);
  });

  test("returns empty when file contains non-object JSON", () => {
    fs.writeFileSync(filePath, "42");
    const store = new FileMessageStore(filePath);
    expect(store.load().messages).toEqual([]);
  });

  test("round-trips messages and commandResponses", () => {
    const store = new FileMessageStore(filePath);
    const msgs = [msgEntry(1, "hola"), msgEntry(2, "adios")];
    const cmds = [cmdEntry("rb_join", "Welcome!")];
    store.save({ messages: msgs, commandResponses: cmds });

    const store2 = new FileMessageStore(filePath);
    const loaded = store2.load();
    expect(loaded.messages).toEqual(msgs);
    expect(loaded.commandResponses).toEqual(cmds);
  });

  test("load respects maxMessages limit — trims to last N on load", () => {
    const maxMessages = 3;
    const store = new FileMessageStore(filePath, maxMessages, 50);
    // Save raw file with more than maxMessages entries
    const many = Array.from({ length: 10 }, (_, i) => msgEntry(i, `msg ${i}`, `2026-01-01T00:00:0${i}.000Z`));
    fs.writeFileSync(filePath, JSON.stringify({ messages: many, commandResponses: [] }));

    const loaded = store.load();
    expect(loaded.messages).toHaveLength(maxMessages);
    // Should be the LAST 3
    expect(loaded.messages[0].text).toBe("msg 7");
    expect(loaded.messages[2].text).toBe("msg 9");
  });

  test("save respects maxMessages limit", () => {
    const maxMessages = 3;
    const store = new FileMessageStore(filePath, maxMessages, 50);
    const many = Array.from({ length: 10 }, (_, i) => msgEntry(i, `msg ${i}`));
    store.save({ messages: many, commandResponses: [] });

    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    expect(raw.messages).toHaveLength(maxMessages);
  });

  test("save uses atomic write (creates .tmp then renames)", () => {
    const store = new FileMessageStore(filePath);
    const tmpPath = filePath + ".tmp";

    store.save({ messages: [msgEntry(1, "test")], commandResponses: [] });

    // After successful save, no .tmp file should remain
    expect(fs.existsSync(tmpPath)).toBe(false);
    // The real file should exist
    expect(fs.existsSync(filePath)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// connectEmitterToStore — MessageStore integration
// ---------------------------------------------------------------------------

describe("connectEmitterToStore — with MemoryMessageStore — initial load", () => {
  test("messages pre-loaded from store are in state after connect", () => {
    const messageStore = new MemoryMessageStore();
    messageStore.save({
      messages: [msgEntry(42, "persisted message")],
      commandResponses: [cmdEntry("rb_aleph", "stored response", 42)],
    });

    const emitter = new RuntimeEmitter();
    const store = makeStore();
    connectEmitterToStore(emitter, store, { messageStore });

    const s = store.getState();
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0].text).toBe("persisted message");
    expect(s.commandResponses).toHaveLength(1);
    expect(s.commandResponses[0].command).toBe("rb_aleph");
  });

  test("without messageStore behaves as before — empty on start", () => {
    const emitter = new RuntimeEmitter();
    const store = makeStore();
    connectEmitterToStore(emitter, store);

    expect(store.getState().messages).toEqual([]);
    expect(store.getState().commandResponses).toEqual([]);
  });
});

describe("connectEmitterToStore — with MemoryMessageStore — save on events", () => {
  test("save is called after message event (via debounce flush)", async () => {
    const messageStore = new MemoryMessageStore();
    const saveSpy = mock(messageStore.save.bind(messageStore));
    messageStore.save = saveSpy;

    const emitter = new RuntimeEmitter();
    const store = makeStore();
    const unsub = connectEmitterToStore(emitter, store, { messageStore });

    emitter.emit({
      type: "message",
      chatId: 1,
      username: "bob",
      text: "hello",
      timestamp: "2026-01-01T00:00:00.000Z",
    });

    // Flush by calling unsub (which triggers immediate save)
    unsub();

    expect(saveSpy).toHaveBeenCalled();
    const lastCall = saveSpy.mock.calls[saveSpy.mock.calls.length - 1]![0] as { messages: MessageEntry[] };
    expect(lastCall.messages).toHaveLength(1);
    expect(lastCall.messages[0].text).toBe("hello");
  });

  test("save is called after command-response event (via flush on unsub)", () => {
    const messageStore = new MemoryMessageStore();
    const saveSpy = mock(messageStore.save.bind(messageStore));
    messageStore.save = saveSpy;

    const emitter = new RuntimeEmitter();
    const store = makeStore();
    const unsub = connectEmitterToStore(emitter, store, { messageStore });

    emitter.emit({
      type: "command-response",
      command: "rb_aleph",
      text: "Next hole!",
      chatId: 99,
      timestamp: "2026-01-01T00:00:00.000Z",
    });

    unsub();

    expect(saveSpy).toHaveBeenCalled();
    const lastCall = saveSpy.mock.calls[saveSpy.mock.calls.length - 1]![0] as { commandResponses: CommandResponseEntry[] };
    expect(lastCall.commandResponses).toHaveLength(1);
    expect(lastCall.commandResponses[0].command).toBe("rb_aleph");
  });

  test("reconnect with same store: messages accumulated across sessions", () => {
    const messageStore = new MemoryMessageStore();

    // Session 1: receive a message and flush
    const emitter1 = new RuntimeEmitter();
    const store1 = makeStore();
    const unsub1 = connectEmitterToStore(emitter1, store1, { messageStore });
    emitter1.emit({ type: "message", chatId: 1, text: "first", username: "alice", timestamp: "2026-01-01T00:00:00.000Z" });
    unsub1();

    // Session 2: connect new emitter+store with same messageStore
    const emitter2 = new RuntimeEmitter();
    const store2 = makeStore();
    connectEmitterToStore(emitter2, store2, { messageStore });

    // Old message should be pre-loaded
    const s2 = store2.getState();
    expect(s2.messages).toHaveLength(1);
    expect(s2.messages[0].text).toBe("first");
  });
});
