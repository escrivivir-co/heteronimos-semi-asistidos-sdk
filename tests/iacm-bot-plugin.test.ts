import { describe, test, expect } from "bun:test";
import { IacmBotPlugin } from "../src/core/iacm/iacm-bot-plugin";
import type { IacmBotVars } from "../src/core/iacm/iacm-bot-plugin";
import type { AimlCategory, IntentHandler } from "../src/core/aiml/aiml-types";
import { IACM_INTENTS } from "../src/core/iacm/iacm-categories";
import { buildRequest, formatIacmForChat } from "../src/core/iacm/iacm-templates";
import { registerPlugins } from "../src/core/bot-handler";
import { MockTelegramBot } from "../src/core/mock-telegram";

// ─── Concrete test subclass ───────────────────────────────────────────────────

class TestIacmBot extends IacmBotPlugin<IacmBotVars> {
  name = "test-iacm-bot";
  pluginCode = "tib";
  agentName = "tib";

  domainCategories(): AimlCategory<IacmBotVars>[] {
    return [
      {
        id: "greet",
        pattern: /^(hello|hi)$/i,
        resolver: "greet",
        priority: 10,
      },
    ];
  }

  domainHandlers(): IntentHandler<IacmBotVars>[] {
    return [
      (intent) => {
        if (intent.intent === "greet") return "Hello from IacmBot!";
        return undefined;
      },
    ];
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Construction + defaults
// ──────────────────────────────────────────────────────────────────────────────

describe("IacmBotPlugin — construction", () => {
  test("creates with correct name and code", () => {
    const bot = new TestIacmBot();
    expect(bot.name).toBe("test-iacm-bot");
    expect(bot.pluginCode).toBe("tib");
    expect(bot.agentName).toBe("tib");
  });

  test("defaultVars includes IACM fields", () => {
    const bot = new TestIacmBot();
    const vars = bot.defaultVars();
    expect(vars.agent_role).toBe("tib");
    expect(vars.flow_state).toBe("idle");
    expect(vars.interlocutor).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Categories
// ──────────────────────────────────────────────────────────────────────────────

describe("IacmBotPlugin — categories", () => {
  test("includes both IACM and domain categories", () => {
    const bot = new TestIacmBot();
    const cats = bot.categories();
    const ids = cats.map(c => c.id);
    // Should have IACM chat categories
    expect(ids).toContain("iacm.recv.request");
    expect(ids).toContain("iacm.recv.urgent");
    // Should have domain category
    expect(ids).toContain("greet");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Handlers pipeline
// ──────────────────────────────────────────────────────────────────────────────

describe("IacmBotPlugin — message pipeline", () => {
  test("handles domain message (greet)", async () => {
    const bot = new TestIacmBot();
    const reply = await bot.onMessage({ chat: { id: 1 }, from: { id: 99, is_bot: false }, message: { text: "hello" } });
    expect(reply).toBe("Hello from IacmBot!");
  });

  test("receives REQUEST message and returns ACK", async () => {
    const bot = new TestIacmBot();
    const msg = buildRequest("meteo", "tib", { task: "Do something" }, "please do it");
    const text = formatIacmForChat(msg);
    const reply = await bot.onMessage({ chat: { id: 1 }, from: { id: 99, is_bot: false }, message: { text } });
    // Protocol handler should auto-ACK
    expect(reply).toContain("[ACKNOWLEDGE]");
  });

  test("RECEIVED_REQUEST updates flow_state to processing", async () => {
    const bot = new TestIacmBot();
    const msg = buildRequest("meteo", "tib", { task: "Weather" }, "give weather");
    const text = formatIacmForChat(msg);
    await bot.onMessage({ chat: { id: 42 }, from: { id: 99, is_bot: false }, message: { text } });
    const state = (bot as any).engine_.getState(42);
    expect(state?.vars.flow_state).toBe("processing");
    expect(state?.vars.interlocutor).toBe("meteo");
  });

  test("silently ignores REQUEST for other agent", async () => {
    const bot = new TestIacmBot();
    const msg = buildRequest("meteo", "OTHER_BOT", { task: "Not for me" }, "n");
    const text = formatIacmForChat(msg);
    const reply = await bot.onMessage({ chat: { id: 1 }, from: { id: 99, is_bot: false }, message: { text } });
    expect(reply).toBe(""); // no response (protocol handler skipped, fallback returns "")
  });

  test("self-message filter: ignores messages from own bot id", async () => {
    const bot = new TestIacmBot();
    const reply = await bot.onMessage({
      chat: { id: 1 },
      from: { id: 5000, is_bot: true },
      me: { id: 5000 },
      message: { text: "hello" },
    });
    expect(reply).toBe("");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Commands
// ──────────────────────────────────────────────────────────────────────────────

describe("IacmBotPlugin — commands", () => {
  test("includes /reset from AimlBotPlugin base", () => {
    const bot = new TestIacmBot();
    const cmds = bot.commands();
    expect(cmds.some(c => c.command === "reset")).toBe(true);
  });

  test("includes IACM outbound commands with plugin prefix", () => {
    const bot = new TestIacmBot();
    const cmds = bot.commands();
    const cmdNames = cmds.map(c => c.command);
    expect(cmdNames).toContain("tib_request");
    expect(cmdNames).toContain("tib_question");
    expect(cmdNames).toContain("tib_urgent");
    expect(cmdNames).toContain("tib_status");
    expect(cmdNames).toContain("tib_iacm");
  });

  test("status command returns status page", () => {
    const bot = new TestIacmBot();
    const cmds = bot.commands();
    const statusCmd = cmds.find(c => c.command === "tib_status");
    expect(statusCmd).toBeDefined();
    const text = statusCmd!.buildText({ chat: { id: 1 } });
    expect(text).toContain("tib");
    expect(text).toContain("IACM/1.0");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Menus
// ──────────────────────────────────────────────────────────────────────────────

describe("IacmBotPlugin — menus", () => {
  test("includes IACM help menu", () => {
    const bot = new TestIacmBot();
    const menus = bot.menus();
    expect(menus.length).toBeGreaterThan(0);
    expect(menus[0].command).toBe("tib_iacm");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Integration: registerPlugins
// ──────────────────────────────────────────────────────────────────────────────

describe("IacmBotPlugin — registerPlugins integration", () => {
  test("can be registered as a BotPlugin", () => {
    const bot = new TestIacmBot();
    const mock = new MockTelegramBot();
    expect(() => registerPlugins(mock as any, [bot])).not.toThrow();
  });
});
