import { describe, test, expect } from "bun:test";
import { collectPluginFatherSettings, registerPlugins, type BotPlugin, type CommandDefinition } from "../src/index";
import { MockTelegramBot } from "../src/core/mock-telegram";

function makePlugin(code: string, cmds: string[]): BotPlugin {
  return {
    name: `plugin-${code}`,
    pluginCode: code,
    commands: () => cmds.map(c => ({
      command: c,
      description: `${c} desc`,
      buildText: () => "",
    })),
  };
}

describe("collectPluginFatherSettings", () => {
  test("prefixes commands with pluginCode", () => {
    const plugins = [makePlugin("ab", ["foo", "bar"])];
    const { commands } = collectPluginFatherSettings(plugins);
    expect(commands.map(c => c.command)).toEqual(["ab_foo", "ab_bar"]);
  });

  test("collects from multiple plugins", () => {
    const plugins = [
      makePlugin("a", ["x"]),
      makePlugin("b", ["y"]),
    ];
    const { commands } = collectPluginFatherSettings(plugins);
    expect(commands.map(c => c.command)).toEqual(["a_x", "b_y"]);
  });

  test("includes menu commands in command list", () => {
    const plugin: BotPlugin = {
      name: "with-menu",
      pluginCode: "wm",
      commands: () => [{ command: "hello", description: "hi", buildText: () => "" }],
      menus: () => [{ command: "menu", description: "Open menu", entryPage: "start", pages: [{ id: "start", text: "Start", buttons: [] }] }],
    };
    const { commands, menus } = collectPluginFatherSettings([plugin]);
    const names = commands.map(c => c.command);
    expect(names).toContain("wm_hello");
    expect(names).toContain("wm_menu");
    expect(menus.length).toBe(1);
  });

  test("returns empty arrays for no plugins", () => {
    const { commands, menus } = collectPluginFatherSettings([]);
    expect(commands).toEqual([]);
    expect(menus).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// registerPlugins con MockTelegramBot
// ---------------------------------------------------------------------------

describe("registerPlugins — mock bot", () => {
  test("prefixed commands are registered on the bot", () => {
    const bot = new MockTelegramBot();
    const plugin = makePlugin("xx", ["cmd1", "cmd2"]);
    registerPlugins(bot as any, [plugin]);
    expect(bot.getRegisteredCommands()).toContain("xx_cmd1");
    expect(bot.getRegisteredCommands()).toContain("xx_cmd2");
  });

  test("multiple plugins each register their commands", () => {
    const bot = new MockTelegramBot();
    registerPlugins(bot as any, [
      makePlugin("a", ["go"]),
      makePlugin("b", ["run"]),
    ]);
    expect(bot.getRegisteredCommands()).toContain("a_go");
    expect(bot.getRegisteredCommands()).toContain("b_run");
  });

  test("dispatches reply from buildText when command is simulated", async () => {
    const bot = new MockTelegramBot();
    const plugin: BotPlugin = {
      name: "echo-bot",
      pluginCode: "ec",
      commands: (): CommandDefinition[] => [
        { command: "hello", description: "Say hi", buildText: () => "Hi!" },
      ],
    };
    registerPlugins(bot as any, [plugin]);
    await bot.simulateCommand("ec_hello");
    expect(bot.getSentMessages()[0]?.text).toBe("Hi!");
  });
});
