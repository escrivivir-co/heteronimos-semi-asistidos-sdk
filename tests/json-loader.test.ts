/**
 * tests/json-loader.test.ts — Tests unitarios de loadJsonCategories().
 *
 * Verifica que `JsonCategoryDef[]` → `AimlCategory[]` sea correcto para:
 * - Tipos de patrón: regex, exact, wildcard
 * - entityMapping: $N → stars[N-1]
 * - Resolver string vs JsonResolverDef
 * - Valores por defecto (priority, id)
 * - Propiedades opcionales: topic, that
 * - Manejo de errores: regex inválido
 */

import { describe, test, expect } from "bun:test";
import { loadJsonCategories } from "../src/core/aiml-json-loader";
import type { JsonCategoryDef, JsonResolverDef } from "../src/core/aiml-json-loader";

// Helper: invoca el resolver como IntentFn con args mínimos
function callResolver(
  resolver: unknown,
  stars: string[] = [],
  text = "test input",
) {
  if (typeof resolver === "function") {
    return resolver({} as any, stars, { text });
  }
  return resolver;
}

// ─── patternType: regex (default) ─────────────────────────────────────────────

describe("patternType: regex (default)", () => {
  test("compiles raw regex string to RegExp", () => {
    const [cat] = loadJsonCategories<any>([
      { pattern: "hola|hi", resolver: "greet" },
    ]);
    expect(cat.pattern).toBeInstanceOf(RegExp);
    expect((cat.pattern as RegExp).test("hola")).toBe(true);
    expect((cat.pattern as RegExp).test("hi")).toBe(true);
    expect((cat.pattern as RegExp).test("bye")).toBe(false);
  });

  test("is case-insensitive by default", () => {
    const [cat] = loadJsonCategories<any>([
      { pattern: "hola", resolver: "greet" },
    ]);
    expect((cat.pattern as RegExp).test("HOLA")).toBe(true);
    expect((cat.pattern as RegExp).test("Hola")).toBe(true);
  });

  test("captures groups become stars", () => {
    const [cat] = loadJsonCategories<any>([
      {
        pattern: "tiempo en (.+)",
        resolver: "weather.city",
        entityMapping: { city: "$1" },
      },
    ]);
    const match = "tiempo en Madrid".match(cat.pattern as RegExp);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("Madrid");
  });

  test("throws descriptive error on invalid regex", () => {
    expect(() =>
      loadJsonCategories<any>([
        { id: "bad-regex", pattern: "[unclosed", resolver: "x" },
      ]),
    ).toThrow("bad-regex");
  });
});

// ─── patternType: exact ───────────────────────────────────────────────────────

describe("patternType: exact", () => {
  test("matches the whole string case-insensitively", () => {
    const [cat] = loadJsonCategories<any>([
      { pattern: "acepto", patternType: "exact", resolver: "accept" },
    ]);
    const re = cat.pattern as RegExp;
    expect(re.test("acepto")).toBe(true);
    expect(re.test("ACEPTO")).toBe(true);
    expect(re.test("acepto todo")).toBe(false); // no partial
  });

  test("escapes regex special chars in pattern", () => {
    const [cat] = loadJsonCategories<any>([
      { pattern: "¿ok?", patternType: "exact", resolver: "ok" },
    ]);
    const re = cat.pattern as RegExp;
    expect(re.test("¿ok?")).toBe(true);
    expect(re.test("¿okX")).toBe(false);
  });
});

// ─── patternType: wildcard ────────────────────────────────────────────────────

describe("patternType: wildcard", () => {
  test("single * becomes (.+) — requires at least one char", () => {
    const [cat] = loadJsonCategories<any>([
      { pattern: "tiempo en *", patternType: "wildcard", resolver: "weather.city" },
    ]);
    const re = cat.pattern as RegExp;
    expect(re.test("tiempo en Madrid")).toBe(true);
    expect(re.test("tiempo en ")).toBe(false); // (.+) requires ≥1 char
    expect(re.test("tiempo en")).toBe(false);
  });

  test("double ** becomes (.*) — zero or more chars", () => {
    const [cat] = loadJsonCategories<any>([
      { pattern: "**", patternType: "wildcard", resolver: "catch-all" },
    ]);
    const re = cat.pattern as RegExp;
    expect(re.test("")).toBe(true);
    expect(re.test("any thing")).toBe(true);
  });

  test("captures from * are accessible as stars", () => {
    const [cat] = loadJsonCategories<any>([
      {
        pattern: "hora en *",
        patternType: "wildcard",
        resolver: "time.tz",
        entityMapping: { timezone: "$1" },
      },
    ]);
    const match = "hora en Europe/Madrid".match(cat.pattern as RegExp);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("Europe/Madrid");
  });
});

// ─── entityMapping ────────────────────────────────────────────────────────────

describe("entityMapping", () => {
  test("$1 maps to stars[0]", () => {
    const [cat] = loadJsonCategories<any>([
      {
        pattern: "clima en (.+)",
        resolver: "weather",
        entityMapping: { city: "$1" },
      },
    ]);
    const result = callResolver(cat.resolver, ["Barcelona"], "clima en Barcelona") as any;
    expect(result.entities.city).toBe("Barcelona");
  });

  test("$2 maps to stars[1]", () => {
    const [cat] = loadJsonCategories<any>([
      {
        pattern: "(.+) en (.+)",
        resolver: "generic",
        entityMapping: { action: "$1", location: "$2" },
      },
    ]);
    const result = callResolver(cat.resolver, ["tiempo", "Madrid"], "tiempo en Madrid") as any;
    expect(result.entities.action).toBe("tiempo");
    expect(result.entities.location).toBe("Madrid");
  });

  test("literal value (not $N) is copied as-is", () => {
    const [cat] = loadJsonCategories<any>([
      {
        pattern: "ok",
        resolver: "confirm",
        entityMapping: { source: "json-loader" },
      },
    ]);
    const result = callResolver(cat.resolver, [], "ok") as any;
    expect(result.entities.source).toBe("json-loader");
  });

  test("missing capture group yields empty string", () => {
    const [cat] = loadJsonCategories<any>([
      {
        pattern: "ping",
        resolver: "pong",
        entityMapping: { ghost: "$9" },
      },
    ]);
    const result = callResolver(cat.resolver, [], "ping") as any;
    expect(result.entities.ghost).toBe("");
  });
});

// ─── Resolver: string shorthand ───────────────────────────────────────────────

describe("resolver: string shorthand", () => {
  test("returns the string directly when no entityMapping", () => {
    const [cat] = loadJsonCategories<any>([
      { pattern: "hola", resolver: "greet.hello" },
    ]);
    expect(cat.resolver).toBe("greet.hello");
  });

  test("resolver is wrapped in fn when entityMapping is present", () => {
    const [cat] = loadJsonCategories<any>([
      {
        pattern: "hola (.*)",
        resolver: "greet.hello",
        entityMapping: { name: "$1" },
      },
    ]);
    expect(typeof cat.resolver).toBe("function");
    const result = callResolver(cat.resolver, ["Mundo"], "hola Mundo") as any;
    expect(result.intent).toBe("greet.hello");
    expect(result.confidence).toBe(1.0);
    expect(result.entities.name).toBe("Mundo");
  });
});

// ─── Resolver: JsonResolverDef ────────────────────────────────────────────────

describe("resolver: JsonResolverDef", () => {
  test("uses intent field from JsonResolverDef", () => {
    const resolverDef: JsonResolverDef = { intent: "iacm.request.received", confidence: 0.9 };
    const [cat] = loadJsonCategories<any>([
      { pattern: "solicito", resolver: resolverDef },
    ]);
    const result = callResolver(cat.resolver, [], "solicito") as any;
    expect(result.intent).toBe("iacm.request.received");
  });

  test("uses custom confidence from JsonResolverDef", () => {
    const [cat] = loadJsonCategories<any>([
      { pattern: "quizás", resolver: { intent: "uncertain", confidence: 0.5 } },
    ]);
    const result = callResolver(cat.resolver, [], "quizás") as any;
    expect(result.confidence).toBe(0.5);
  });

  test("merges static entities from JsonResolverDef", () => {
    const [cat] = loadJsonCategories<any>([
      {
        pattern: "apistatus",
        resolver: { intent: "api.status", entities: { service: "weather" } },
      },
    ]);
    const result = callResolver(cat.resolver, [], "apistatus") as any;
    expect(result.entities.service).toBe("weather");
  });

  test("entityMapping override takes precedence over static entities", () => {
    const [cat] = loadJsonCategories<any>([
      {
        pattern: "(.+)",
        resolver: { intent: "dynamic", entities: { city: "default" } },
        entityMapping: { city: "$1" },
      },
    ]);
    const result = callResolver(cat.resolver, ["París"], "París") as any;
    // entityMapping sets city from $1, overriding the static "default"
    expect(result.entities.city).toBe("París");
  });

  test("confidence defaults to 1.0 when omitted", () => {
    const [cat] = loadJsonCategories<any>([
      { pattern: "x", resolver: { intent: "ex" } },
    ]);
    const result = callResolver(cat.resolver, [], "x") as any;
    expect(result.confidence).toBe(1.0);
  });
});

// ─── priority & id & optional fields ─────────────────────────────────────────

describe("default values and optional fields", () => {
  test("priority defaults to 5", () => {
    const [cat] = loadJsonCategories<any>([
      { pattern: "x", resolver: "x" },
    ]);
    expect(cat.priority).toBe(5);
  });

  test("custom priority is preserved", () => {
    const [cat] = loadJsonCategories<any>([
      { pattern: "urgent.*", resolver: "urgent", priority: 10 },
    ]);
    expect(cat.priority).toBe(10);
  });

  test("id is generated when omitted", () => {
    const [cat] = loadJsonCategories<any>([
      { pattern: "x", resolver: "x" },
    ]);
    expect(cat.id).toMatch(/json-cat-\d+/);
  });

  test("explicit id is preserved", () => {
    const [cat] = loadJsonCategories<any>([
      { id: "my-cat", pattern: "x", resolver: "x" },
    ]);
    expect(cat.id).toBe("my-cat");
  });

  test("topic is set when provided", () => {
    const [cat] = loadJsonCategories<any>([
      { pattern: "x", resolver: "x", topic: "weather" },
    ]);
    expect(cat.topic).toBe("weather");
  });

  test("topic is absent when not provided", () => {
    const [cat] = loadJsonCategories<any>([
      { pattern: "x", resolver: "x" },
    ]);
    expect(cat.topic).toBeUndefined();
  });

  test("that is set when provided", () => {
    const [cat] = loadJsonCategories<any>([
      { pattern: "yes", resolver: "confirm", that: "Are you sure" },
    ]);
    expect(cat.that).toBe("Are you sure");
  });

  test("that is absent when not provided", () => {
    const [cat] = loadJsonCategories<any>([
      { pattern: "x", resolver: "x" },
    ]);
    expect(cat.that).toBeUndefined();
  });
});

// ─── Multiple categories ───────────────────────────────────────────────────────

describe("multiple categories", () => {
  test("loads an array and preserves order", () => {
    const defs: JsonCategoryDef[] = [
      { id: "first", pattern: "a", resolver: "intent-a" },
      { id: "second", pattern: "b", resolver: "intent-b" },
      { id: "third", pattern: "c", resolver: "intent-c" },
    ];
    const cats = loadJsonCategories<any>(defs);
    expect(cats).toHaveLength(3);
    expect(cats[0].id).toBe("first");
    expect(cats[1].id).toBe("second");
    expect(cats[2].id).toBe("third");
  });

  test("returns empty array for empty input", () => {
    expect(loadJsonCategories<any>([])).toHaveLength(0);
  });
});
