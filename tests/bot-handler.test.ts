import { describe, test, expect } from "bun:test";
import { collectPluginFatherSettings, type BotPlugin } from "../src/core/bot-handler";
import type { CommandDefinition } from "../src/core/command-handler";

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
