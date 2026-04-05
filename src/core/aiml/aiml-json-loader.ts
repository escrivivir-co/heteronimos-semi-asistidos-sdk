/**
 * aiml-json-loader.ts — Cargador de categorías AIML desde JSON (Approach 2).
 *
 * Convierte arrays de `JsonCategoryDef` en `AimlCategory<TVars>[]` que el
 * `IntentEngine` puede procesar directamente.
 *
 * Permite definir patrones sin código TypeScript, lo que facilita:
 * - Diseño de flujos por no-developers
 * - Configuración dinámica / hot-reload
 * - Generación automática de categorías desde bases de datos
 *
 * Uso típico:
 *
 *   import categoriesJson from "./categories/meteo-categories.json";
 *   import { loadJsonCategories } from "heteronimos-semi-asistidos-sdk";
 *
 *   class MyBot extends AimlBotPlugin<MyVars> {
 *     categories() {
 *       return [
 *         ...super.categories(),
 *         ...loadJsonCategories<MyVars>(categoriesJson),
 *       ];
 *     }
 *   }
 */

import type { AimlCategory, IntentResult, SessionVars } from "./aiml-types.js";

// ─── Tipos públicos ───────────────────────────────────────────────────────────

/**
 * Definición de una categoría en formato JSON.
 * Corresponde a `AimlCategory` sin las partes que requieren TypeScript.
 */
export interface JsonCategoryDef {
  /** Identificador único. Se genera automáticamente si se omite. */
  id?: string;

  /**
   * Patrón de entrada.
   *
   * Si `patternType === "regex"` (default): se compila con `new RegExp(pattern, "i")`.
   * Si `patternType === "exact"`: match exacto case-insensitive.
   * Si `patternType === "wildcard"`: `*` se convierte en `(.+)` (greedy).
   */
  pattern: string;
  patternType?: "regex" | "exact" | "wildcard";

  /**
   * Resolver:
   * - `string` → shorthand intent name (ej: `"meteo.greet"`)
   * - `JsonResolverDef` → intent + confidence + entities extra
   */
  resolver: string | JsonResolverDef;

  /**
   * Mapa de entidades desde grupos de captura del regex.
   * Key: nombre de la entidad. Value: `"$N"` (1-based capture group) o literal.
   *
   * Ejemplo: `{ "city": "$2" }` → entities.city = stars[1]
   */
  entityMapping?: Record<string, string>;

  /** Prioridad para el engine (mayor → evaluado antes). Default: 5. */
  priority?: number;

  /**
   * Topic requerido: solo activa si `vars.topic === topic`.
   */
  topic?: string;

  /**
   * Condición sobre la última respuesta del bot.
   * Si se especifica, solo activa si la última respuesta contiene este string
   * (case-insensitive).
   */
  that?: string;
}

/** Resolver explícito con campos opcionales de configuración. */
export interface JsonResolverDef {
  intent: string;
  confidence?: number;
  /** Entidades extra estáticas (no capturas). */
  entities?: Record<string, string>;
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Convierte un array de `JsonCategoryDef` en `AimlCategory<TVars>[]`.
 *
 * @param json   Array JSON (se puede importar directamente: `import cats from "./cats.json"`)
 * @returns      Array listo para incluir en `categories()` de un `AimlBotPlugin`
 */
export function loadJsonCategories<TVars extends SessionVars>(
  json: JsonCategoryDef[],
): AimlCategory<TVars>[] {
  return json.map((def, index) => {
    const id = def.id ?? `json-cat-${index}`;
    const priority = def.priority ?? 5;
    const pattern = buildPattern(def);
    const resolver = buildResolver<TVars>(def);

    const category: AimlCategory<TVars> = { id, pattern, resolver, priority };

    if (def.topic !== undefined) category.topic = def.topic;
    if (def.that !== undefined) category.that = def.that;

    return category;
  });
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function buildPattern(def: JsonCategoryDef): RegExp {
  const { pattern, patternType = "regex" } = def;

  if (patternType === "exact") {
    return new RegExp(`^${escapeRegex(pattern)}$`, "i");
  }

  if (patternType === "wildcard") {
    // "*" → (.+) ; "**" → (.*)
    const escaped = escapeRegex(pattern).replace(/\\\*\\\*/g, "(.*)").replace(/\\\*/g, "(.+)");
    return new RegExp(`^${escaped}$`, "i");
  }

  // Default: raw regex string
  try {
    return new RegExp(pattern, "i");
  } catch (err) {
    throw new Error(
      `[loadJsonCategories] Invalid regex "${pattern}" in category "${def.id ?? "?"}": ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

function buildResolver<TVars extends SessionVars>(
  def: JsonCategoryDef,
): AimlCategory<TVars>["resolver"] {
  const { resolver, entityMapping } = def;

  const hasEntityMapping = entityMapping && Object.keys(entityMapping).length > 0;

  if (!hasEntityMapping && typeof resolver === "string") {
    // Shorthand string — no transformation needed
    return resolver;
  }

  // All other cases: return an IntentFn
  return (_vars: TVars, stars: string[], ctx: { text: string }): IntentResult => {
    const intentStr = typeof resolver === "string"
      ? resolver
      : (resolver as JsonResolverDef).intent;

    const confidence = typeof resolver === "string"
      ? 1.0
      : ((resolver as JsonResolverDef).confidence ?? 1.0);

    const baseEntities: Record<string, string> =
      typeof resolver === "object" && (resolver as JsonResolverDef).entities
        ? { ...(resolver as JsonResolverDef).entities! }
        : {};

    if (hasEntityMapping) {
      for (const [key, value] of Object.entries(entityMapping!)) {
        const dollarMatch = value.match(/^\$(\d+)$/);
        if (dollarMatch) {
          const idx = Number(dollarMatch[1]) - 1; // $1 → index 0
          baseEntities[key] = stars[idx] ?? "";
        } else {
          baseEntities[key] = value; // Literal value
        }
      }
    }

    return {
      intent: intentStr,
      confidence,
      entities: baseEntities,
      stars,
      originalInput: ctx.text,
    };
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
