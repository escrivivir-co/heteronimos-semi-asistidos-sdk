import { describe, test, expect } from "bun:test";
import {
  handleCommand,
  toBotFatherFormat,
  toBotCommands,
  commandsMatch,
  syncCommandsWithTelegram,
  type CommandDefinition,
  type BotCommand,
  type BotCommandScope,
} from "../src/index";
import { MockTelegramBot } from "../src/core/mock-telegram";

// ── toBotFatherFormat ──

describe("toBotFatherFormat", () => {
  test("formats single command", () => {
    const cmds: CommandDefinition[] = [
      { command: "hello", description: "Say hello", buildText: () => "" },
    ];
    expect(toBotFatherFormat(cmds)).toBe("hello - Say hello");
  });

  test("formats multiple commands", () => {
    const cmds: CommandDefinition[] = [
      { command: "a", description: "Alpha", buildText: () => "" },
      { command: "b", description: "Beta", buildText: () => "" },
    ];
    expect(toBotFatherFormat(cmds)).toBe("a - Alpha\nb - Beta");
  });

  test("handles empty array", () => {
    expect(toBotFatherFormat([])).toBe("");
  });
});

// ── toBotCommands ──

describe("toBotCommands", () => {
  test("strips buildText from definitions", () => {
    const cmds: CommandDefinition[] = [
      { command: "test", description: "Test cmd", buildText: () => "reply" },
    ];
    const result = toBotCommands(cmds);
    expect(result).toEqual([{ command: "test", description: "Test cmd" }]);
    expect(result[0]).not.toHaveProperty("buildText");
  });
});

// ── commandsMatch ──

describe("commandsMatch", () => {
  const a: BotCommand[] = [
    { command: "x", description: "X" },
    { command: "y", description: "Y" },
  ];

  test("returns true for identical arrays", () => {
    expect(commandsMatch(a, [...a])).toBe(true);
  });

  test("returns true regardless of order", () => {
    const reversed = [...a].reverse();
    expect(commandsMatch(a, reversed)).toBe(true);
  });

  test("returns false when description differs", () => {
    const modified = [{ command: "x", description: "Changed" }, { command: "y", description: "Y" }];
    expect(commandsMatch(a, modified)).toBe(false);
  });

  test("returns false when command is missing", () => {
    expect(commandsMatch(a, [a[0]])).toBe(false);
  });

  test("returns true for two empty arrays", () => {
    expect(commandsMatch([], [])).toBe(true);
  });
});

describe("syncCommandsWithTelegram", () => {
  const commands: CommandDefinition[] = [
    { command: "hello", description: "Say hello", buildText: () => "hi" },
  ];

  test("throws a clear error when Telegram rejects the token", async () => {
    const bot = {
      api: {
        getMyCommands: async () => {
          throw { error_code: 404, description: "Not Found" };
        },
      },
    } as any;

    await expect(syncCommandsWithTelegram(bot, commands, { autoConfirm: true })).rejects.toThrow(
      "Telegram rejected the bot token while trying to sync commands with Telegram.",
    );
  });

  test("throws a clear error when Telegram API is unavailable", async () => {
    const bot = {
      api: {
        getMyCommands: async () => {
          throw new Error("network timeout");
        },
      },
    } as any;

    await expect(syncCommandsWithTelegram(bot, commands, { autoConfirm: true })).rejects.toThrow(
      "Could not sync commands with Telegram because Telegram API is unavailable: network timeout",
    );
  });
});

describe("handleCommand", () => {
  test("swallows reply failures so polling can continue", async () => {
    const handler = handleCommand(async () => "hi");
    const ctx = {
      from: { first_name: "Aleph" },
      chat: { id: -12345 },
      message: { entities: [] },
      reply: async () => {
        throw { error_code: 403, description: "Forbidden: bot was kicked from the group chat" };
      },
    } as any;

    await expect(handler(ctx)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// syncCommandsWithTelegram con MockTelegramBot
// ---------------------------------------------------------------------------

describe("syncCommandsWithTelegram — mock bot", () => {
  const localCmds: CommandDefinition[] = [
    { command: "a", description: "Alpha", buildText: () => "" },
    { command: "b", description: "Beta",  buildText: () => "" },
  ];

  test("updates commands when mock is empty", async () => {
    const bot = new MockTelegramBot();
    const updated = await syncCommandsWithTelegram(bot as any, localCmds, { autoConfirm: true });
    expect(updated).toBe(true);
    const stored = await bot.api.getMyCommands();
    expect(stored.map((c: BotCommand) => c.command)).toEqual(["a", "b"]);
  });

  test("no-op when single scope already in sync", async () => {
    const bot = new MockTelegramBot();
    await bot.api.setMyCommands(
      [{ command: "a", description: "Alpha" }, { command: "b", description: "Beta" }],
      { scope: { type: "default" } },
    );
    // With a single scope that already matches, no update needed
    const updated = await syncCommandsWithTelegram(bot as any, localCmds, {
      autoConfirm: true,
      scopes: [{ type: "default" }],
    });
    expect(updated).toBe(false);
  });

  test("respects autoConfirm: false (does not update)", async () => {
    const bot = new MockTelegramBot();
    const updated = await syncCommandsWithTelegram(bot as any, localCmds, {
      autoConfirm: false,
      confirmFn: async () => false,
    });
    expect(updated).toBe(false);
    expect(await bot.api.getMyCommands()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// syncCommandsWithTelegram — multi-scope
// ---------------------------------------------------------------------------

describe("syncCommandsWithTelegram — multi-scope", () => {
  const localCmds: CommandDefinition[] = [
    { command: "start", description: "Start", buildText: () => "" },
  ];

  test("registers commands in both default and all_group_chats scopes", async () => {
    const bot = new MockTelegramBot();
    const updated = await syncCommandsWithTelegram(bot as any, localCmds, { autoConfirm: true });
    expect(updated).toBe(true);

    const defaultCmds = await bot.api.getMyCommands({ scope: { type: "default" } });
    const groupCmds   = await bot.api.getMyCommands({ scope: { type: "all_group_chats" } });

    expect(defaultCmds).toEqual([{ command: "start", description: "Start" }]);
    expect(groupCmds).toEqual([{ command: "start", description: "Start" }]);
  });

  test("always writes to all scopes even when default already matches", async () => {
    const synced = [{ command: "start", description: "Start" }];
    const bot = new MockTelegramBot();
    // Pre-load both scopes — still returns true because multi-scope always writes
    await bot.api.setMyCommands(synced, { scope: { type: "default" } });
    await bot.api.setMyCommands(synced, { scope: { type: "all_group_chats" } });

    const updated = await syncCommandsWithTelegram(bot as any, localCmds, { autoConfirm: true });
    expect(updated).toBe(true);

    const groupCmds = await bot.api.getMyCommands({ scope: { type: "all_group_chats" } });
    expect(groupCmds).toEqual(synced);
  });

  test("single-scope no-op when already in sync", async () => {
    const synced = [{ command: "start", description: "Start" }];
    const bot = new MockTelegramBot();
    await bot.api.setMyCommands(synced, { scope: { type: "default" } });

    const updated = await syncCommandsWithTelegram(bot as any, localCmds, {
      autoConfirm: true,
      scopes: [{ type: "default" }],
    });
    expect(updated).toBe(false);
  });

  test("custom scopes override default behavior", async () => {
    const bot = new MockTelegramBot();
    const scopes: BotCommandScope[] = [{ type: "default" }];
    await syncCommandsWithTelegram(bot as any, localCmds, { autoConfirm: true, scopes });

    const defaultCmds = await bot.api.getMyCommands({ scope: { type: "default" } });
    const groupCmds   = await bot.api.getMyCommands({ scope: { type: "all_group_chats" } });

    expect(defaultCmds).toEqual([{ command: "start", description: "Start" }]);
    // group not touched when only default scope passed
    expect(groupCmds).toEqual([]);
  });

  test("confirmation is requested only once regardless of number of scopes", async () => {
    const bot = new MockTelegramBot();
    let confirmCalls = 0;
    await syncCommandsWithTelegram(bot as any, localCmds, {
      autoConfirm: false,
      confirmFn: async () => { confirmCalls++; return true; },
    });
    expect(confirmCalls).toBe(1);
  });
});
