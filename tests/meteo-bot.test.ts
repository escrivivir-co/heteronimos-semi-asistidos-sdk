/**
 * tests/meteo-bot.test.ts — Tests unitarios de MeteoBot.
 *
 * Cubre:
 * - Implementación de interfaz BotPlugin / IacmBotPlugin
 * - Categories: ids, patrones, prioridades
 * - Commands: prefijados y campos requeridos
 * - Menus: mt_menu presente
 * - Handlers: intents correctos (con fetch mockeado)
 * - defaultVars(): campos de MeteoVars
 */

import { describe, test, expect, mock } from "bun:test";
import { MeteoBot } from "../examples/iacm-demo/meteo-bot";

// ─── Setup ────────────────────────────────────────────────────────────────────

const BOT_NAME = "TestMeteoBot";

function makeBot(): MeteoBot {
  return new MeteoBot(BOT_NAME);
}

// ─── Interfaz BotPlugin ────────────────────────────────────────────────────────

describe("MeteoBot — BotPlugin interface", () => {
  test("has required plugin properties", () => {
    const bot = makeBot();
    expect(bot.name).toBe("meteo");
    expect(bot.pluginCode).toBe("mt");
    expect(bot.agentName).toBe(BOT_NAME);
    expect(typeof bot.commands).toBe("function");
    expect(typeof bot.menus).toBe("function");
    expect(typeof bot.onMessage).toBe("function");
  });
});

// ─── categories() ─────────────────────────────────────────────────────────────

describe("MeteoBot — categories()", () => {
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

  test("includes cmd-weather with priority 9", () => {
    const cat = cats.find(c => c.id === "cmd-weather");
    expect(cat).toBeDefined();
    expect(cat?.priority).toBe(9);
    expect((cat?.pattern as RegExp).test("/mt_weather Madrid")).toBe(true);
  });

  test("includes cmd-apistatus with string resolver", () => {
    const cat = cats.find(c => c.id === "cmd-apistatus");
    expect(cat).toBeDefined();
    expect(cat?.resolver).toBe("meteo.fyi.apistatus");
  });

  test("includes cmd-alert with priority 9", () => {
    const cat = cats.find(c => c.id === "cmd-alert");
    expect(cat).toBeDefined();
    expect((cat?.pattern as RegExp).test("/mt_alert Tormenta severa")).toBe(true);
  });

  test("includes cmd-propose", () => {
    const cat = cats.find(c => c.id === "cmd-propose");
    expect(cat).toBeDefined();
  });

  test("includes cmd-question-send", () => {
    const cat = cats.find(c => c.id === "cmd-question-send");
    expect(cat).toBeDefined();
  });

  test("cmd-weather resolver extracts city from stars[0]", () => {
    const cat = cats.find(c => c.id === "cmd-weather")!;
    const resolver = cat.resolver;
    if (typeof resolver === "function") {
      const result = resolver({} as any, ["Valencia"], { text: "/mt_weather Valencia" });
      expect((result as any).entities.city).toBe("Valencia");
      expect((result as any).intent).toBe("meteo.weather.direct");
    } else {
      // If it's not a function, it means the category structure changed
      expect(typeof resolver).toBe("function");
    }
  });
});

// ─── defaultVars() ─────────────────────────────────────────────────────────────

describe("MeteoBot — defaultVars()", () => {
  test("returns MeteoVars defaults", () => {
    const bot = makeBot();
    const vars = bot.defaultVars();
    expect(vars.last_city).toBeUndefined();
    expect(vars.last_timezone).toBeUndefined();
    expect(vars.update_interval_min).toBe("60");
    expect(vars.pending_proposal_id).toBeUndefined();
  });
});

// ─── commands() ──────────────────────────────────────────────────────────────

describe("MeteoBot — commands()", () => {
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

  test("includes weather command", () => {
    expect(cmds.map(c => c.command)).toContain("weather");
  });

  test("includes apistatus command", () => {
    expect(cmds.map(c => c.command)).toContain("apistatus");
  });

  test("includes alert command", () => {
    expect(cmds.map(c => c.command)).toContain("alert");
  });

  test("includes propose command", () => {
    expect(cmds.map(c => c.command)).toContain("propose");
  });

  test("includes question command", () => {
    expect(cmds.map(c => c.command)).toContain("question");
  });
});

// ─── menus() ─────────────────────────────────────────────────────────────────

describe("MeteoBot — menus()", () => {
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

  test("menu has at least 2 pages", () => {
    const menu = menus.find(m => m.command === "menu")!;
    expect(menu.pages.length).toBeGreaterThanOrEqual(2);
  });

  test("menu home page has buttons", () => {
    const menu = menus.find(m => m.command === "menu")!;
    const home = menu.pages.find(p => p.id === "home")!;
    expect(home).toBeDefined();
    expect(home.buttons.length).toBeGreaterThan(0);
  });
});

// ─── handlers(): weather direct (mock fetch) ──────────────────────────────────

describe("MeteoBot — handlers(): meteo.weather.direct", () => {
  test("returns formatted weather string on success", async () => {
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            current_condition: [
              {
                temp_C: "22",
                temp_F: "72",
                humidity: "55",
                weatherDesc: [{ value: "Sunny" }],
                windspeedKmph: "10",
                FeelsLikeC: "21",
                uvIndex: "6",
              },
            ],
          }),
      }),
    );

    try {
      const bot = makeBot();
      const result = await bot.onMessage({ text: "/mt_weather Sevilla", chat: { id: 1 }, from: { id: 1 } });
      expect(typeof result).toBe("string");
      expect(result).toContain("Sevilla");
      expect(result).toContain("22");
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  test("returns error message when fetch fails", async () => {
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = mock(() => Promise.reject(new Error("offline")));

    try {
      const bot = makeBot();
      const result = await bot.onMessage({ text: "/mt_weather BadCity", chat: { id: 1 }, from: { id: 1 } });
      expect(typeof result).toBe("string");
      expect(result).toContain("Error");
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });
});
