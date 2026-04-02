import { describe, test, expect } from "bun:test";
import { ChatTracker, MemoryChatStore, FileChatStore } from "../src/index";
import { MockTelegramBot, MOCK_FIXTURES } from "../src/core/mock-telegram";

describe("MemoryChatStore", () => {
  test("starts empty", () => {
    const store = new MemoryChatStore();
    expect(store.load()).toEqual([]);
  });

  test("persists in memory after save", () => {
    const store = new MemoryChatStore();
    store.save([1, 2, 3]);
    expect(store.load()).toEqual([1, 2, 3]);
  });
});

describe("ChatTracker with MemoryChatStore", () => {
  test("constructs without arguments (defaults to memory)", () => {
    const tracker = new ChatTracker();
    expect(tracker.getAll()).toEqual([]);
  });

  test("tracks chat IDs in memory", () => {
    const tracker = new ChatTracker();
    tracker.track(100);
    tracker.track(200);
    tracker.track(100); // duplicate
    expect(tracker.getAll()).toEqual([100, 200]);
  });

  test("accepts explicit MemoryChatStore", () => {
    const store = new MemoryChatStore();
    store.save([10, 20]);
    const tracker = new ChatTracker(store);
    expect(tracker.getAll()).toEqual([10, 20]);
  });
});

// ---------------------------------------------------------------------------
// ChatTracker con MockTelegramBot
// ---------------------------------------------------------------------------

describe("ChatTracker — register() con MockTelegramBot", () => {
  test("trackea chatId desde middleware al simular mensaje", async () => {
    const bot = new MockTelegramBot();
    const tracker = new ChatTracker();
    tracker.register(bot as any);
    await bot.simulateMessage("hola");
    expect(tracker.getAll()).toContain(MOCK_FIXTURES.chatId);
  });

  test("no duplica chatIds al recibir múltiples mensajes del mismo chat", async () => {
    const bot = new MockTelegramBot();
    const tracker = new ChatTracker();
    tracker.register(bot as any);
    await bot.simulateMessage("uno");
    await bot.simulateMessage("dos");
    expect(tracker.getAll().filter(id => id === MOCK_FIXTURES.chatId)).toHaveLength(1);
  });
});

describe("ChatTracker — broadcast() con MockTelegramBot", () => {
  test("envía a todos los chats trackeados", async () => {
    const bot = new MockTelegramBot();
    const tracker = new ChatTracker();
    tracker.register(bot as any);
    await bot.simulateMessage("msg", { chatId: 201 });
    await bot.simulateMessage("msg", { chatId: 202 });
    await tracker.broadcast(bot as any, "anuncio");
    const sent = bot.getSentMessages().filter(m => m.text === "anuncio");
    expect(sent.map(m => m.chatId).sort()).toEqual([201, 202]);
  });

  test("no envía nada si no hay chats trackeados", async () => {
    const bot = new MockTelegramBot();
    const tracker = new ChatTracker();
    await tracker.broadcast(bot as any, "nadie");
    expect(bot.getSentMessages()).toEqual([]);
  });
});
