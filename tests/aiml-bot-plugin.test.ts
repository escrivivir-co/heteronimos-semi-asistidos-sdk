import { describe, test, expect } from "bun:test";
import {
  AimlBotPlugin,
  type AimlCategory,
  type IntentHandler,
  type IntentResult,
  registerPlugins,
} from "../src/index";
import { MockTelegramBot } from "../src/core/mock-telegram";

// ─── Minimal concrete plugin ──────────────────────────────────────────────────

interface TestVars {
  name?: string;
  seen?: string;
}

class GreeterBot extends AimlBotPlugin<TestVars> {
  name = "greeter";
  pluginCode = "gr";

  defaultVars(): TestVars {
    return {};
  }

  categories(): AimlCategory<TestVars>[] {
    return [
      {
        id: "greet",
        pattern: /^(hola|hello|hi)$/i,
        resolver: "greet",
      },
      {
        id: "introduce",
        pattern: /^me llamo (.+)$/i,
        resolver: (vars, stars) => ({
          intent: "introduce",
          confidence: 1,
          entities: { name: stars[0] },
          stars,
          originalInput: "",
        }),
        sideEffect: (vars, stars) => { vars.name = stars[0]; },
      },
      {
        id: "catchall",
        pattern: "*",
        resolver: "unmatched",
        priority: 0,
      },
    ];
  }

  handlers(): IntentHandler<TestVars>[] {
    return [
      (intent, vars) => {
        if (intent.intent === "greet") {
          if (vars.name) return `¡Hola de nuevo, ${vars.name}!`;
          return "¡Hola! ¿Cómo te llamas?";
        }
        if (intent.intent === "introduce") {
          return `Encantado, ${intent.entities.name}!`;
        }
        return undefined;
      },
    ];
  }

  fallbackResponse(): string {
    return "No te entendí.";
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AimlBotPlugin — pipeline", () => {
  test("classify + handler produces text response", async () => {
    const bot = new GreeterBot();
    const reply = await bot.onMessage({ chat: { id: 1 }, from: { id: 99, is_bot: false }, message: { text: "hola" } });
    expect(reply).toBe("¡Hola! ¿Cómo te llamas?");
  });

  test("handler with vars uses session state", async () => {
    const bot = new GreeterBot();
    // First: introduce
    await bot.onMessage({ chat: { id: 1 }, from: { id: 99, is_bot: false }, message: { text: "me llamo Alice" } });
    // Second: greet → should use name
    const reply = await bot.onMessage({ chat: { id: 1 }, from: { id: 99, is_bot: false }, message: { text: "hola" } });
    expect(reply).toBe("¡Hola de nuevo, Alice!");
  });

  test("fallbackResponse when no handler matches", async () => {
    const bot = new GreeterBot();
    const reply = await bot.onMessage({ chat: { id: 1 }, from: { id: 99, is_bot: false }, message: { text: "xyz unknown" } });
    expect(reply).toBe("No te entendí.");
  });

  test("handler chain: first non-undefined wins", async () => {
    class ChainBot extends AimlBotPlugin<Record<string, never>> {
      name = "chain";
      pluginCode = "ch";
      defaultVars() { return {}; }
      categories() { return [{ pattern: /.*/, resolver: "any" }]; }
      handlers(): IntentHandler<Record<string, never>>[] {
        return [
          () => undefined,
          () => "second wins",
          () => "third (should not reach)",
        ];
      }
    }
    const bot = new ChainBot();
    const reply = await bot.onMessage({ chat: { id: 1 }, from: { id: 1, is_bot: false }, message: { text: "test" } });
    expect(reply).toBe("second wins");
  });

  test("self-message filter: bot ignores its own messages", async () => {
    const bot = new GreeterBot();
    // Simulate ctx where from.id === me.id and is_bot = true
    const selfCtx = { chat: { id: 1 }, from: { id: 999, is_bot: true }, me: { id: 999 }, message: { text: "hola" } };
    const reply = await bot.onMessage(selfCtx);
    expect(reply).toBe("");
  });

  test("history is recorded after onMessage", async () => {
    const bot = new GreeterBot();
    await bot.onMessage({ chat: { id: 1 }, from: { id: 1, is_bot: false }, message: { text: "hola" } });
    const state = bot["engine_"].getState(1);
    expect(state?.history.length).toBe(1);
    expect(state?.history[0].input).toBe("hola");
    expect(state?.history[0].output).toBeTruthy();
  });
});

describe("AimlBotPlugin — commands", () => {
  test("commands() includes /reset", () => {
    const bot = new GreeterBot();
    const cmds = bot.commands();
    const names = cmds.map(c => c.command);
    expect(names).toContain("reset");
  });

  test("reset command clears session state", () => {
    const bot = new GreeterBot();
    bot["engine_"].setVar(1, "name", "Test");
    const resetCmd = bot.commands().find(c => c.command === "reset")!;
    resetCmd.buildText({ chat: { id: 1 } });
    const state = bot["engine_"].getState(1);
    expect(state).toBeUndefined();
  });

  test("menus() empty by default", () => {
    const bot = new GreeterBot();
    expect(bot.menus()).toEqual([]);
  });
});

describe("AimlBotPlugin — registerPlugins accepts it", () => {
  test("AimlBotPlugin is a valid BotPlugin for registerPlugins", async () => {
    const bot = new GreeterBot();
    const mock = new MockTelegramBot();
    registerPlugins(mock as any, [bot], undefined, undefined, { quiet: true });
    // gr_reset is the prefixed command (pluginCode_command)
    const msgs = await mock.simulateCommand("gr_reset");
    expect(msgs).toBeDefined();
  });
});

describe("AimlBotPlugin — subclass extension", () => {
  test("subclass can extend commands() and handlers()", async () => {
    class ExtBot extends GreeterBot {
      categories() {
        return [
          ...super.categories(),
          { id: "bye", pattern: /^bye$/i, resolver: "goodbye" },
        ];
      }
      handlers() {
        return [
          ...super.handlers(),
          (intent: IntentResult) => {
            if (intent.intent === "goodbye") return "Adiós!";
            return undefined;
          },
        ];
      }
    }
    const bot = new ExtBot();
    const r1 = await bot.onMessage({ chat: { id: 1 }, from: { id: 1, is_bot: false }, message: { text: "bye" } });
    expect(r1).toBe("Adiós!");
    // Parent handler still works
    const r2 = await bot.onMessage({ chat: { id: 1 }, from: { id: 1, is_bot: false }, message: { text: "hola" } });
    expect(r2).toBe("¡Hola! ¿Cómo te llamas?");
  });
});
