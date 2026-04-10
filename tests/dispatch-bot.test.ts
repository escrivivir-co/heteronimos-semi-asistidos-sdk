/**
 * tests/dispatch-bot.test.ts — Tests unitarios de DispatchBot.
 *
 * Cubre:
 * - Implementación de interfaz BotPlugin / IacmBotPlugin
 * - Categories: ids, patrones, resolvers
 * - Commands: prefijados y campos requeridos
 * - Menus: dp_menu presente con páginas
 * - Handlers: lógica de flow state e intents
 * - defaultVars(): campos de DispatchVars
 */

import { describe, test, expect } from "bun:test";
import { DispatchBot } from "../examples/iacm-demo/dispatch-bot";

// ─── Setup ────────────────────────────────────────────────────────────────────

const BOT_NAME = "TestDispatchBot";

function makeBot(): DispatchBot {
  return new DispatchBot(BOT_NAME);
}

// ─── Interfaz BotPlugin ────────────────────────────────────────────────────────

describe("DispatchBot — BotPlugin interface", () => {
  test("has required plugin properties", () => {
    const bot = makeBot();
    expect(bot.name).toBe("dispatch");
    expect(bot.pluginCode).toBe("dp");
    expect(bot.agentName).toBe(BOT_NAME);
    expect(typeof bot.commands).toBe("function");
    expect(typeof bot.menus).toBe("function");
    expect(typeof bot.onMessage).toBe("function");
  });
});

// ─── categories() ─────────────────────────────────────────────────────────────

describe("DispatchBot — categories()", () => {
  const bot = makeBot();
  const cats = bot.categories();

  test("returns a non-empty array", () => {
    expect(cats.length).toBeGreaterThan(0);
  });

  test("each category has id, pattern, and resolver", () => {
    for (const cat of cats) {
      expect(cat.id).toBeTruthy();
      expect(cat.pattern).toBeDefined();
      expect(cat.resolver).toBeDefined();
    }
  });

  test("cmd-weather-req pattern matches /dp_weather command", () => {
    const cat = cats.find(c => c.id === "cmd-weather-req");
    expect(cat).toBeDefined();
    expect((cat?.pattern as RegExp).test("/dp_weather Madrid")).toBe(true);
    expect((cat?.pattern as RegExp).test("/mt_weather Madrid")).toBe(true); // prefix agnostic
  });

  test("cmd-weather-req resolver extracts city from stars[0]", () => {
    const cat = cats.find(c => c.id === "cmd-weather-req")!;
    if (typeof cat.resolver === "function") {
      const result = cat.resolver({} as any, ["Bilbao"], { text: "/dp_weather Bilbao" }) as any;
      expect(result.intent).toBe("dispatch.send.weather_request");
      expect(result.entities.city).toBe("Bilbao");
    } else {
      expect(typeof cat.resolver).toBe("function");
    }
  });

  test("cmd-time-q resolver extracts timezone from stars[0]", () => {
    const cat = cats.find(c => c.id === "cmd-time-q")!;
    if (typeof cat.resolver === "function") {
      const result = cat.resolver({} as any, ["America/New_York"], { text: "/dp_time America/New_York" }) as any;
      expect(result.intent).toBe("dispatch.send.time_question");
      expect(result.entities.timezone).toBe("America/New_York");
    } else {
      expect(typeof cat.resolver).toBe("function");
    }
  });

  test("cmd-accept uses string resolver", () => {
    const cat = cats.find(c => c.id === "cmd-accept");
    expect(cat).toBeDefined();
    expect(cat?.resolver).toBe("dispatch.send.accept");
  });

  test("cmd-reject resolver extracts rationale", () => {
    const cat = cats.find(c => c.id === "cmd-reject")!;
    if (typeof cat.resolver === "function") {
      const result = cat.resolver({} as any, ["Demasiado caro"], { text: "/dp_reject Demasiado caro" }) as any;
      expect(result.intent).toBe("dispatch.send.reject");
      expect(result.entities.rationale).toBe("Demasiado caro");
    } else {
      expect(typeof cat.resolver).toBe("function");
    }
  });

  test("cmd-defer resolver extracts reason", () => {
    const cat = cats.find(c => c.id === "cmd-defer")!;
    if (typeof cat.resolver === "function") {
      const result = cat.resolver({} as any, ["Necesito consultar"], { text: "/dp_defer Necesito consultar" }) as any;
      expect(result.intent).toBe("dispatch.send.defer");
      expect(result.entities.reason).toBe("Necesito consultar");
    } else {
      expect(typeof cat.resolver).toBe("function");
    }
  });

  test("cmd-demo has priority 10", () => {
    const cat = cats.find(c => c.id === "cmd-demo");
    expect(cat?.priority).toBe(10);
  });
});

// ─── defaultVars() ─────────────────────────────────────────────────────────────

describe("DispatchBot — defaultVars()", () => {
  test("returns DispatchVars defaults", () => {
    const bot = makeBot();
    const vars = bot.defaultVars();
    expect(vars.target_agent).toBe("MeteoBot");
    expect(vars.pending_proposal_id).toBeUndefined();
    expect(vars.last_report_summary).toBeUndefined();
    expect(vars.last_answer).toBeUndefined();
    expect(vars.demo_step).toBeUndefined();
  });
});

// ─── commands() ──────────────────────────────────────────────────────────────

describe("DispatchBot — commands()", () => {
  const bot = makeBot();
  const cmds = bot.commands();

  test("returns non-empty array", () => {
    expect(cmds.length).toBeGreaterThan(0);
  });

  test("each command has required fields", () => {
    for (const cmd of cmds) {
      expect(cmd.command).toBeTruthy();
      expect(cmd.description).toBeTruthy();
      expect(typeof cmd.buildText).toBe("function");
    }
  });

  test("includes weather, time, accept, reject, defer, demo", () => {
    const names = cmds.map(c => c.command);
    expect(names).toContain("weather");
    expect(names).toContain("time");
    expect(names).toContain("accept");
    expect(names).toContain("reject");
    expect(names).toContain("defer");
    expect(names).toContain("demo");
  });
});

// ─── menus() ─────────────────────────────────────────────────────────────────

describe("DispatchBot — menus()", () => {
  const bot = makeBot();
  const menus = bot.menus();

  test("returns non-empty array", () => {
    expect(menus.length).toBeGreaterThan(0);
  });

  test("includes menu", () => {
    const menu = menus.find(m => m.command === "menu");
    expect(menu).toBeDefined();
    expect(menu?.entryPage).toBe("home");
  });

  test("menu has home, request, manage, demo pages", () => {
    const menu = menus.find(m => m.command === "menu")!;
    const pageIds = menu.pages.map(p => p.id);
    expect(pageIds).toContain("home");
    expect(pageIds).toContain("request");
    expect(pageIds).toContain("manage");
    expect(pageIds).toContain("demo");
  });
});

// ─── handlers(): flow state ───────────────────────────────────────────────────
// State is managed internally by the engine (keyed by chatId).
// We use (bot as any).engine_ to seed and inspect state for tests that need it.

describe("DispatchBot — handlers(): flow state", () => {
  test("dispatch.send.weather_request returns IACM REQUEST string", async () => {
    const bot = makeBot();
    const result = await bot.onMessage({ text: "/dp_weather Barcelona", chat: { id: 10 }, from: { id: 1 } });
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    // flow_state should be awaiting_response after the handler runs
    const vars = (bot as any).engine_.getState(10)?.vars;
    expect(vars?.flow_state).toBe("awaiting_response");
  });

  test("dispatch.send.time_question returns IACM QUESTION string", async () => {
    const bot = makeBot();
    const result = await bot.onMessage({ text: "/dp_time Europe/Madrid", chat: { id: 11 }, from: { id: 1 } });
    expect(typeof result).toBe("string");
    const vars = (bot as any).engine_.getState(11)?.vars;
    expect(vars?.flow_state).toBe("awaiting_response");
  });

  test("dispatch.send.accept returns warning when no pending_proposal_id", async () => {
    const bot = makeBot();
    // No state seeded → pending_proposal_id is undefined → expect warning
    const result = await bot.onMessage({ text: "/dp_accept", chat: { id: 12 }, from: { id: 1 } });
    expect(typeof result).toBe("string");
    expect(result).toContain("⚠️");
  });

  test("dispatch.send.accept clears pending_proposal_id on success", async () => {
    const bot = makeBot();
    // Seed engine state with a pending proposal
    (bot as any).engine_.setVar(13, "pending_proposal_id", "prop-123");
    const result = await bot.onMessage({ text: "/dp_accept", chat: { id: 13 }, from: { id: 1 } });
    expect(typeof result).toBe("string");
    expect(result).not.toContain("⚠️");
    const vars = (bot as any).engine_.getState(13)?.vars;
    expect(vars?.pending_proposal_id).toBeUndefined();
    expect(vars?.flow_state).toBe("idle");
  });

  test("dispatch.send.reject returns warning when no pending_proposal_id", async () => {
    const bot = makeBot();
    const result = await bot.onMessage({ text: "/dp_reject Sin razón", chat: { id: 14 }, from: { id: 1 } });
    expect(result).toContain("⚠️");
  });

  test("dispatch.send.reject clears pending_proposal_id on success", async () => {
    const bot = makeBot();
    (bot as any).engine_.setVar(15, "pending_proposal_id", "prop-456");
    const result = await bot.onMessage({ text: "/dp_reject Precio muy alto", chat: { id: 15 }, from: { id: 1 } });
    expect(typeof result).toBe("string");
    expect(result).not.toContain("⚠️");
    const vars = (bot as any).engine_.getState(15)?.vars;
    expect(vars?.pending_proposal_id).toBeUndefined();
    expect(vars?.flow_state).toBe("idle");
  });

  test("dispatch.send.defer uses pending_proposal_id from engine state", async () => {
    const bot = makeBot();
    (bot as any).engine_.setVar(16, "pending_proposal_id", "prop-789");
    const result = await bot.onMessage({ text: "/dp_defer Necesito información adicional", chat: { id: 16 }, from: { id: 1 } });
    expect(typeof result).toBe("string");
    expect(result).not.toContain("⚠️");
    const vars = (bot as any).engine_.getState(16)?.vars;
    expect(vars?.flow_state).toBe("idle");
    expect(vars?.pending_proposal_id).toBeUndefined();
  });

  test("dispatch.demo sets flow_state to awaiting_response and demo_step", async () => {
    const bot = makeBot();
    const result = await bot.onMessage({ text: "/dp_demo Madrid", chat: { id: 17 }, from: { id: 1 } });
    expect(result).toContain("DEMO");
    const vars = (bot as any).engine_.getState(17)?.vars;
    expect(vars?.demo_step).toBe("weather_requested");
    expect(vars?.flow_state).toBe("awaiting_response");
  });
});
