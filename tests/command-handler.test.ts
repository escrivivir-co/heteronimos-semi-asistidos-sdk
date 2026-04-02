import { describe, test, expect } from "bun:test";
import {
  toBotFatherFormat,
  toBotCommands,
  commandsMatch,
  type CommandDefinition,
  type BotCommand,
} from "../src/index";

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
