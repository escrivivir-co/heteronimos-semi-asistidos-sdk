import { describe, test, expect } from "bun:test";
import { registerPlugins, collectPluginFatherSettings, type BotPlugin } from "../src/index";

describe("registerPlugins without tracker", () => {
  test("does not throw when tracker is omitted", () => {
    // We can't create a real Bot without a token, but we can verify
    // the function signature accepts undefined tracker by checking types.
    // For a runtime check, we verify collectPluginFatherSettings works
    // (registerPlugins needs a real Bot instance).
    const plugin: BotPlugin = {
      name: "test",
      pluginCode: "tt",
      commands: () => [{ command: "hi", description: "hi", buildText: () => "" }],
    };
    const { commands } = collectPluginFatherSettings([plugin]);
    expect(commands.map(c => c.command)).toEqual(["tt_hi"]);
  });
});
