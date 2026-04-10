/**
 * Tests for the aleph broadcast feature.
 *
 * Verifies that the rb_aleph command reads userdata/broadcast.md
 * and broadcasts its content to all registered chats.
 */
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  MockTelegramBot,
  registerPlugins,
  ChatTracker,
  MemoryChatStore,
  RuntimeEmitter,
} from "../src/index";
import { RabbitBot } from "../examples/dashboard/rabbit-bot";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupBot(appDir: string) {
  const emitter = new RuntimeEmitter();
  const store = new MemoryChatStore();
  const tracker = new ChatTracker(store, emitter);
  const rabbit = new RabbitBot(undefined, appDir);
  const mockBot = new MockTelegramBot({ emitter });

  registerPlugins(mockBot as any, [rabbit], tracker, emitter);
  rabbit.setBroadcast((msg: string) => tracker.broadcast(mockBot as any, msg));

  return { rabbit, mockBot, tracker, emitter };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("aleph broadcast — file reading", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aleph-broadcast-"));
    fs.mkdirSync(path.join(tmpDir, "userdata"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns warning when broadcast.md does not exist", async () => {
    const { mockBot } = setupBot(tmpDir);
    const msgs = await mockBot.simulateCommand("rb_aleph");
    expect(msgs).toHaveLength(1);
    expect(msgs[0].text).toContain("No broadcast file found");
  });

  test("returns warning when broadcast.md is empty", async () => {
    fs.writeFileSync(path.join(tmpDir, "userdata", "broadcast.md"), "   \n  ");
    const { mockBot } = setupBot(tmpDir);
    const msgs = await mockBot.simulateCommand("rb_aleph");
    expect(msgs).toHaveLength(1);
    expect(msgs[0].text).toContain("No broadcast file found");
  });

  test("reads broadcast.md and broadcasts content", async () => {
    const content = "Hello from aleph broadcast!";
    fs.writeFileSync(path.join(tmpDir, "userdata", "broadcast.md"), content);
    const { mockBot } = setupBot(tmpDir);
    const msgs = await mockBot.simulateCommand("rb_aleph");
    const reply = msgs.find((m) => m.text.includes("Broadcast sent"));
    expect(reply).toBeDefined();
    expect(reply!.text).toContain("1 message(s)");
    expect(reply!.text).toContain("archived as");
  });

  test("splits by --- into multiple messages", async () => {
    const content = "Part one\n---\nPart two\n---\nPart three";
    fs.writeFileSync(path.join(tmpDir, "userdata", "broadcast.md"), content);
    const { mockBot } = setupBot(tmpDir);
    const msgs = await mockBot.simulateCommand("rb_aleph");
    const reply = msgs.find((m) => m.text.includes("Broadcast sent"));
    expect(reply).toBeDefined();
    expect(reply!.text).toContain("3 message(s)");
    expect(reply!.text).toContain("archived as");
    // Each chunk sent to the auto-tracked chat (100001)
    const all = mockBot.getSentMessages();
    expect(all.some((m) => m.text === "Part one")).toBe(true);
    expect(all.some((m) => m.text === "Part two")).toBe(true);
    expect(all.some((m) => m.text === "Part three")).toBe(true);
  });
});

describe("aleph broadcast — sends to all tracked chats", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aleph-broadcast-"));
    fs.mkdirSync(path.join(tmpDir, "userdata"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("broadcast sends each chunk to all registered chats", async () => {
    const content = "Chunk A\n---\nChunk B";
    fs.writeFileSync(path.join(tmpDir, "userdata", "broadcast.md"), content);

    const { mockBot, tracker } = setupBot(tmpDir);

    tracker.track(1001, "Chat A", "group");
    tracker.track(1002, "Chat B", "group");

    await mockBot.simulateCommand("rb_aleph");

    // Auto-tracked 100001 + 1001 + 1002 = 3 chats × 2 chunks = 6 broadcast msgs
    const all = mockBot.getSentMessages();
    const chunkA = all.filter((m) => m.text === "Chunk A");
    const chunkB = all.filter((m) => m.text === "Chunk B");
    expect(chunkA).toHaveLength(3);
    expect(chunkB).toHaveLength(3);
    expect(chunkA.map((m) => m.chatId).sort((a, b) => a - b)).toEqual([1001, 1002, 100001]);
  });

  test("broadcast with zero explicit chats still succeeds (auto-tracked sender)", async () => {
    const content = "No one to send to";
    fs.writeFileSync(path.join(tmpDir, "userdata", "broadcast.md"), content);

    const { mockBot } = setupBot(tmpDir);
    const msgs = await mockBot.simulateCommand("rb_aleph");
    const reply = msgs.find((m) => m.text.includes("Broadcast sent"));
    expect(reply).toBeDefined();
    expect(reply!.text).toContain("1 message(s)");
  });
});

describe("aleph broadcast — without broadcastFn", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aleph-broadcast-"));
    fs.mkdirSync(path.join(tmpDir, "userdata"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("shows file content but warns about broadcast unavailable", async () => {
    const content = "Message without broadcast";
    fs.writeFileSync(path.join(tmpDir, "userdata", "broadcast.md"), content);

    const emitter = new RuntimeEmitter();
    const rabbit = new RabbitBot(undefined, tmpDir);
    const mockBot = new MockTelegramBot({ emitter });
    registerPlugins(mockBot as any, [rabbit], undefined, emitter);
    // Do NOT call setBroadcast — broadcastFn stays null

    const msgs = await mockBot.simulateCommand("rb_aleph");
    expect(msgs).toHaveLength(1);
    expect(msgs[0].text).toContain("1 part(s)");
    expect(msgs[0].text).toContain("Broadcast not available");
  });
});

describe("aleph broadcast — archive on send", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aleph-broadcast-"));
    fs.mkdirSync(path.join(tmpDir, "userdata"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("archives broadcast.md to history/ after successful send", async () => {
    const content = "Message to archive";
    fs.writeFileSync(path.join(tmpDir, "userdata", "broadcast.md"), content);

    const { mockBot } = setupBot(tmpDir);
    await mockBot.simulateCommand("rb_aleph");

    // History dir should exist with one archived file
    const historyDir = path.join(tmpDir, "userdata", "history");
    expect(fs.existsSync(historyDir)).toBe(true);
    const files = fs.readdirSync(historyDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^broadcast-\d{4}-\d{2}-\d{2}T.*\.md$/);

    // Archived file has the original content
    const archived = fs.readFileSync(path.join(historyDir, files[0]), "utf-8");
    expect(archived.trim()).toBe("Message to archive");
  });

  test("broadcast.md is replaced with template after send", async () => {
    fs.writeFileSync(path.join(tmpDir, "userdata", "broadcast.md"), "Real message");

    const { mockBot } = setupBot(tmpDir);
    await mockBot.simulateCommand("rb_aleph");

    const after = fs.readFileSync(path.join(tmpDir, "userdata", "broadcast.md"), "utf-8");
    expect(after).toContain("<!-- BROADCAST TEMPLATE -->");
    expect(after).toContain("## Arquitectura activa");
    expect(after).toContain("## Capa nueva: Scriptorium");
    expect(after).toContain("bot-hub-sdk como plugin del Scriptorium");
  });

  test("second rb_aleph after send returns warning (template detected)", async () => {
    fs.writeFileSync(path.join(tmpDir, "userdata", "broadcast.md"), "One-shot message");

    const { mockBot } = setupBot(tmpDir);
    // First send
    const first = await mockBot.simulateCommand("rb_aleph");
    expect(first.some((m) => m.text.includes("Broadcast sent"))).toBe(true);

    // Second send should detect template
    const second = await mockBot.simulateCommand("rb_aleph");
    expect(second.some((m) => m.text.includes("No broadcast file found"))).toBe(true);
  });

  test("confirmation message includes archived filename", async () => {
    fs.writeFileSync(path.join(tmpDir, "userdata", "broadcast.md"), "Track this");

    const { mockBot } = setupBot(tmpDir);
    const msgs = await mockBot.simulateCommand("rb_aleph");
    const reply = msgs.find((m) => m.text.includes("Broadcast sent"));
    expect(reply).toBeDefined();
    expect(reply!.text).toContain("archived as broadcast-");
  });
});

describe("aleph broadcast — emitter events", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aleph-broadcast-"));
    fs.mkdirSync(path.join(tmpDir, "userdata"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("broadcast emits one event per chunk", async () => {
    const content = "Chunk 1\n---\nChunk 2";
    fs.writeFileSync(path.join(tmpDir, "userdata", "broadcast.md"), content);

    const { mockBot, tracker, emitter } = setupBot(tmpDir);
    tracker.track(2001, "TestChat", "group");

    const events: any[] = [];
    emitter.on((e) => { if (e.type === "broadcast") events.push(e); });

    await mockBot.simulateCommand("rb_aleph");

    // 2 chunks → 2 broadcast events
    expect(events).toHaveLength(2);
    expect(events[0].message).toBe("Chunk 1");
    expect(events[1].message).toBe("Chunk 2");
    // Each event reports 2 chats (auto-tracked 100001 + manual 2001)
    expect(events[0].chatCount).toBe(2);
  });
});
