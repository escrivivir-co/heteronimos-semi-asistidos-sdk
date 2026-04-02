import { describe, expect, test } from "bun:test";
import * as SDK from "../src/index";

describe("SDK barrel", () => {
  test("exports the public API surface", () => {
    expect(SDK.Bot).toBeDefined();
    expect(SDK.ChatTracker).toBeDefined();
    expect(SDK.Logger).toBeDefined();
    expect(SDK.registerPlugins).toBeDefined();
    expect(SDK.syncCommands).toBeDefined();
    expect(SDK.collectPluginFatherSettings).toBeDefined();
    expect(SDK.registerCommands).toBeDefined();
    expect(SDK.handleCommand).toBeDefined();
    expect(SDK.toBotFatherFormat).toBeDefined();
    expect(SDK.toBotCommands).toBeDefined();
    expect(SDK.commandsMatch).toBeDefined();
    expect(SDK.syncCommandsWithTelegram).toBeDefined();
    expect(SDK.registerMenu).toBeDefined();
  });
});