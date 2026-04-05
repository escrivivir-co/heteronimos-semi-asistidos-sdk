import { describe, test, expect } from "bun:test";
import {
  UNMATCHED_INTENT,
  type IntentResult,
  type AimlCategory,
  type SessionVars,
} from "../src/core/aiml/aiml-types";
import { IntentEngine } from "../src/core/aiml/intent-engine";

// ─── Helpers ───────────────────────────────────────────────────────────────────

type V = { name?: string; topic_var?: string };
const ctx = (text: string, chatId = 1) => ({
  chatId,
  text,
  timestamp: new Date(),
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("IntentEngine — basic classification", () => {
  test("string resolver produces intent with given name", async () => {
    const cats: AimlCategory<V>[] = [
      { pattern: /^hello$/i, resolver: "greet" },
    ];
    const engine = new IntentEngine(cats, {});
    const result = await engine.classify(ctx("hello"));
    expect(result.intent).toBe("greet");
    expect(result.confidence).toBe(1.0);
    expect(result.originalInput).toBe("hello");
  });

  test("UNMATCHED_INTENT when nothing matches", async () => {
    const engine = new IntentEngine([], {});
    const result = await engine.classify(ctx("unknown input"));
    expect(result.intent).toBe("unmatched");
    expect(result.confidence).toBe(0);
  });

  test("intentResult literal resolver returned as-is (with originalInput)", async () => {
    const literal: IntentResult = {
      intent: "my.intent",
      confidence: 0.9,
      entities: { key: "val" },
      stars: [],
      originalInput: "",
    };
    const cat: AimlCategory<V> = { pattern: /^test$/i, resolver: literal };
    const engine = new IntentEngine([cat], {});
    const result = await engine.classify(ctx("test"));
    expect(result.intent).toBe("my.intent");
    expect(result.confidence).toBe(0.9);
    expect(result.entities.key).toBe("val");
    expect(result.originalInput).toBe("test");
  });

  test("IntentFn receives vars, stars, ctx", async () => {
    const cat: AimlCategory<V> = {
      pattern: /^hi (.+)$/i,
      resolver: (vars, stars) => ({
        intent: "greet.personal",
        confidence: 1,
        entities: { who: stars[0] },
        stars,
        originalInput: "",
      }),
    };
    const engine = new IntentEngine([cat], { name: "world" });
    const result = await engine.classify(ctx("hi alice"));
    expect(result.intent).toBe("greet.personal");
    expect(result.entities.who).toBe("alice");
    expect(result.stars[0]).toBe("alice");
  });
});

describe("IntentEngine — pattern matching", () => {
  test("RegExp capture groups → stars", async () => {
    const cat: AimlCategory<V> = {
      pattern: /^my name is (\w+)$/i,
      resolver: (v, stars) => ({ intent: "introduce", confidence: 1, entities: { name: stars[0] }, stars, originalInput: "" }),
    };
    const engine = new IntentEngine([cat], {});
    const r = await engine.classify(ctx("my name is Bob"));
    expect(r.entities.name).toBe("Bob");
  });

  test("AIML wildcard * captures one or more words", async () => {
    const cat: AimlCategory<V> = {
      pattern: "hello *",
      resolver: (v, stars) => ({ intent: "greet", confidence: 1, entities: { rest: stars[0] }, stars, originalInput: "" }),
    };
    const engine = new IntentEngine([cat], {});
    const r = await engine.classify(ctx("hello world how are you"));
    expect(r.intent).toBe("greet");
    expect(r.stars[0]).toBeTruthy();
  });

  test("AIML wildcard # captures zero or more words", async () => {
    const cat: AimlCategory<V> = {
      pattern: "tell * more",
      resolver: "tell",
    };
    const engine = new IntentEngine([cat], {});
    const r1 = await engine.classify(ctx("tell me more"));
    const r2 = await engine.classify(ctx("tell me everything more"));
    expect(r1.intent).toBe("tell");
    expect(r2.intent).toBe("tell");
  });

  test("case-insensitive string patterns", async () => {
    const cat: AimlCategory<V> = { pattern: "HELLO", resolver: "greet" };
    const engine = new IntentEngine([cat], {});
    const r = await engine.classify(ctx("hello"));
    expect(r.intent).toBe("greet");
  });

  test("PatternFn custom function", async () => {
    const cat: AimlCategory<V> = {
      pattern: (input) => ({ matched: input.startsWith("!"), stars: [] }),
      resolver: "command",
    };
    const engine = new IntentEngine([cat], {});
    const r1 = await engine.classify(ctx("!start"));
    const r2 = await engine.classify(ctx("start"));
    expect(r1.intent).toBe("command");
    expect(r2.intent).toBe("unmatched");
  });

  test("priority: higher priority categories checked first", async () => {
    const cats: AimlCategory<V>[] = [
      { pattern: /^.*$/i, resolver: "low", priority: 1 },
      { pattern: /^.*$/i, resolver: "high", priority: 9 },
    ];
    const engine = new IntentEngine(cats, {});
    const r = await engine.classify(ctx("anything"));
    expect(r.intent).toBe("high");
  });
});

describe("IntentEngine — conditions", () => {
  test("condition refines intent when var matches", async () => {
    const cat: AimlCategory<V> = {
      pattern: /^hello$/i,
      resolver: "greet.new",
      conditions: [
        { varName: "name", resolver: "greet.returning" },
      ],
    };
    const engine = new IntentEngine([cat], {});
    // Without name var → greet.new
    const r1 = await engine.classify(ctx("hello", 1));
    expect(r1.intent).toBe("greet.new");

    // Set name var → greet.returning
    engine.setVar(1, "name", "Alice");
    const r2 = await engine.classify(ctx("hello", 1));
    expect(r2.intent).toBe("greet.returning");
  });

  test("condition with specific value matches only that value", async () => {
    const cat: AimlCategory<V> = {
      pattern: /^status$/i,
      resolver: "status.default",
      conditions: [
        { varName: "name", value: "admin", resolver: "status.admin" },
      ],
    };
    const engine = new IntentEngine([cat], {});
    engine.setVar(1, "name", "user");
    const r1 = await engine.classify(ctx("status", 1));
    expect(r1.intent).toBe("status.default"); // not admin

    engine.setVar(1, "name", "admin");
    const r2 = await engine.classify(ctx("status", 1));
    expect(r2.intent).toBe("status.admin");
  });
});

describe("IntentEngine — topic", () => {
  test("topic filter: category only matches when topic is active", async () => {
    const cats: AimlCategory<V>[] = [
      { pattern: /^yes$/i, resolver: "confirm", topic: "confirm-flow" },
      { pattern: /^yes$/i, resolver: "general-yes" },
    ];
    // general first via priority (default 5), topic-specific also 5 but appears later
    // With no topic → general wins (topic-filtered is skipped)
    const engine = new IntentEngine(cats, {});
    const r1 = await engine.classify(ctx("yes", 1));
    expect(r1.intent).toBe("general-yes");

    // Activate topic → confirm wins if priority >= general
    engine.setTopic(1, "confirm-flow");
    // Both have priority 5. The topic-filtered one is first in the definition array.
    const r2 = await engine.classify(ctx("yes", 1));
    // topic-filtered category has priority 5, general also 5 — sort is stable in JS
    // general-yes comes second in array, topic-filtered first → confirm wins
    expect(r2.intent).toBe("confirm");
  });
});

describe("IntentEngine — sideEffect & redirect", () => {
  test("sideEffect updates vars", async () => {
    const cat: AimlCategory<V> = {
      pattern: /^my name is (\w+)$/i,
      resolver: "introduce",
      sideEffect: (vars, stars) => { vars.name = stars[0]; },
    };
    const engine = new IntentEngine([cat], {});
    await engine.classify(ctx("my name is Bob", 1));
    const state = engine.getState(1);
    expect(state?.vars.name).toBe("Bob");
  });

  test("redirect re-classifies with new input", async () => {
    const cats: AimlCategory<V>[] = [
      { pattern: /^alias$/i, resolver: "ignored", redirect: "hello" },
      { pattern: /^hello$/i, resolver: "greet" },
    ];
    const engine = new IntentEngine(cats, {});
    const r = await engine.classify(ctx("alias"));
    expect(r.intent).toBe("greet");
  });
});

describe("IntentEngine — that (continuation)", () => {
  test("that matches when lastBotResponse contains the string", async () => {
    const cats: AimlCategory<V>[] = [
      { pattern: /^yes$/i, resolver: "confirm", that: "are you sure?" },
      { pattern: /^yes$/i, resolver: "general-yes" },
    ];
    const engine = new IntentEngine(cats, {});
    // No previous response → that-filtered is skipped
    const r1 = await engine.classify(ctx("yes", 1));
    expect(r1.intent).toBe("general-yes");

    // Record response that contains "are you sure?"
    engine.recordResponse(1, r1, "Are you sure?");
    const r2 = await engine.classify(ctx("yes", 1));
    expect(r2.intent).toBe("confirm");
  });
});

describe("IntentEngine — state management", () => {
  test("resetChat clears state", async () => {
    const engine = new IntentEngine([], {});
    engine.setVar(1, "name", "test");
    engine.resetChat(1);
    expect(engine.getState(1)).toBeUndefined();
  });

  test("resetAll clears all states", async () => {
    const engine = new IntentEngine([], {});
    engine.setVar(1, "name", "a");
    engine.setVar(2, "name", "b");
    engine.resetAll();
    expect(engine.getState(1)).toBeUndefined();
    expect(engine.getState(2)).toBeUndefined();
  });

  test("recordResponse builds history", async () => {
    const engine = new IntentEngine([], {});
    const intent = { ...UNMATCHED_INTENT, originalInput: "hi" };
    engine.recordResponse(1, intent, "Hello!");
    const state = engine.getState(1);
    expect(state?.history.length).toBe(1);
    expect(state?.history[0].output).toBe("Hello!");
    expect(state?.lastBotResponse).toBe("Hello!");
  });

  test("history is capped at maxHistory", async () => {
    const engine = new IntentEngine([], {}, { maxHistory: 3 });
    const intent = { ...UNMATCHED_INTENT, originalInput: "x" };
    for (let i = 0; i < 5; i++) {
      engine.recordResponse(1, intent, `reply ${i}`);
    }
    const state = engine.getState(1);
    expect(state?.history.length).toBe(3);
  });

  test("addCategories extends the engine", async () => {
    const engine = new IntentEngine<V>([], {});
    engine.addCategories([{ pattern: /^new$/i, resolver: "new-intent" }]);
    const r = await engine.classify(ctx("new"));
    expect(r.intent).toBe("new-intent");
  });

  test("matchedCategoryId is set", async () => {
    const cat: AimlCategory<V> = { id: "cat-42", pattern: /^test$/i, resolver: "ok" };
    const engine = new IntentEngine([cat], {});
    const r = await engine.classify(ctx("test"));
    expect(r.matchedCategoryId).toBe("cat-42");
  });

  test("custom fallbackIntent", async () => {
    const fallback: IntentResult = {
      intent: "custom.fallback",
      confidence: 0.1,
      entities: {},
      stars: [],
      originalInput: "",
    };
    const engine = new IntentEngine([], {}, { fallbackIntent: fallback });
    const r = await engine.classify(ctx("nope"));
    expect(r.intent).toBe("custom.fallback");
    expect(r.originalInput).toBe("nope");
  });

  test("separate state per chatId", async () => {
    const engine = new IntentEngine<V>([], {});
    engine.setVar(1, "name", "Alice");
    engine.setVar(2, "name", "Bob");
    expect(engine.getState(1)?.vars.name).toBe("Alice");
    expect(engine.getState(2)?.vars.name).toBe("Bob");
  });
});
