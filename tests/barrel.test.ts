import { afterEach, describe, expect, test } from "bun:test";

const ORIGINAL_BOT_TOKEN = process.env.BOT_TOKEN;

afterEach(() => {
  if (ORIGINAL_BOT_TOKEN === undefined) {
    delete process.env.BOT_TOKEN;
    return;
  }
  process.env.BOT_TOKEN = ORIGINAL_BOT_TOKEN;
});

describe("SDK barrel", () => {
  test("exports the public API surface without env side effects", async () => {
    delete process.env.BOT_TOKEN;
    const SDK = await import("../src/index");

    expect(SDK.Bot).toBeDefined();
    expect(SDK.ChatTracker).toBeDefined();
    expect(SDK.FileChatStore).toBeDefined();
    expect(SDK.MemoryChatStore).toBeDefined();
    expect(SDK.Logger).toBeDefined();
    expect(SDK.registerPlugins).toBeDefined();
    expect(SDK.syncCommands).toBeDefined();
    expect(SDK.collectPluginFatherSettings).toBeDefined();
    expect(SDK.collectPluginHelpEntries).toBeDefined();
    expect(SDK.buildPluginHelpText).toBeDefined();
    expect(SDK.registerCommands).toBeDefined();
    expect(SDK.handleCommand).toBeDefined();
    expect(SDK.toBotFatherFormat).toBeDefined();
    expect(SDK.toBotCommands).toBeDefined();
    expect(SDK.commandsMatch).toBeDefined();
    expect(SDK.syncCommandsWithTelegram).toBeDefined();
    expect(SDK.registerMenu).toBeDefined();
    // Store + UI bridge
    expect(SDK.createStore).toBeDefined();
    expect(SDK.LOG_BUFFER_SIZE).toBeDefined();
    expect(SDK.MSG_BUFFER_SIZE).toBeDefined();
    expect(SDK.CMD_BUFFER_SIZE).toBeDefined();
    expect(SDK.getDefaultBaseState).toBeDefined();
    expect(SDK.connectEmitterToStore).toBeDefined();
    // Mock utilities
    expect(SDK.MockTelegramBot).toBeDefined();
    // AIML Intent Engine (SDS-16)
    expect(SDK.UNMATCHED_INTENT).toBeDefined();
    expect(SDK.IntentEngine).toBeDefined();
    expect(SDK.AimlBotPlugin).toBeDefined();
  });
});