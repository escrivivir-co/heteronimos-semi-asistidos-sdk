import { describe, test, expect } from "bun:test";
import { ChatTracker, MemoryChatStore, FileChatStore } from "../src/index";

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
