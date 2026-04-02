import { describe, test, expect } from "bun:test";
import { RabbitBot } from "../examples/console-app/rabbit-bot";

describe("RabbitBot", () => {
  const bot = new RabbitBot("SOL_TEST_ADDRESS");

  test("implements BotPlugin interface", () => {
    expect(bot.name).toBe("rabbit");
    expect(bot.pluginCode).toBe("rb");
    expect(typeof bot.commands).toBe("function");
    expect(typeof bot.menus).toBe("function");
    expect(typeof bot.onMessage).toBe("function");
  });

  test("commands returns non-empty array", () => {
    const cmds = bot.commands();
    expect(cmds.length).toBeGreaterThan(0);
  });

  test("each command has required fields", () => {
    for (const cmd of bot.commands()) {
      expect(cmd.command).toBeTruthy();
      expect(cmd.description).toBeTruthy();
      expect(typeof cmd.buildText).toBe("function");
    }
  });

  test("commands include aleph, join, quit, alephs", () => {
    const names = bot.commands().map(c => c.command);
    expect(names).toContain("aleph");
    expect(names).toContain("join");
    expect(names).toContain("quit");
    expect(names).toContain("alephs");
  });

  test("menus returns at least one menu", () => {
    const menus = bot.menus();
    expect(menus.length).toBeGreaterThan(0);
  });

  test("menu has entryPage and pages", () => {
    const menu = bot.menus()[0];
    expect(menu.command).toBe("menu");
    expect(menu.entryPage).toBeTruthy();
    expect(menu.pages.length).toBeGreaterThanOrEqual(2);
  });

  test("onMessage returns string", () => {
    const result = bot.onMessage();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  test("formatDuration handles days", () => {
    const ms = 2 * 24 * 60 * 60 * 1000; // 2 days
    const result = bot.formatDuration(ms);
    expect(result).toContain("2 d");
  });

  test("formatDuration handles sub-day", () => {
    const ms = 3661000; // 1h 1m 1s
    const result = bot.formatDuration(ms);
    expect(result).toContain("1:1:1");
  });

  test("getNextFibonacciDates returns 23 dates", () => {
    const dates = bot.getNextFibonacciDates(new Date(), 2);
    expect(dates.length).toBe(23);
  });
});
