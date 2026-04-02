import { describe, test, expect } from "bun:test";
import {
  toBotFatherFormat,
  toBotCommands,
  commandsMatch,
  syncCommandsWithTelegram,
  type CommandDefinition,
  type BotCommand,
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

  test("no-op when already in sync", async () => {
    const bot = new MockTelegramBot({
      initialCommands: [
        { command: "a", description: "Alpha" },
        { command: "b", description: "Beta" },
      ],
    });
    const updated = await syncCommandsWithTelegram(bot as any, localCmds, { autoConfirm: true });
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
