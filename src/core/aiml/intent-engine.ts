/**
 * intent-engine.ts — Motor de extracción de intención (stage 1 del pipeline).
 *
 * Clasifica input libre en IntentResult.
 * NO produce texto. NO ejecuta acciones de protocolo.
 * Solo clasifica input y extrae entidades.
 *
 * Stage 2 (handlers) es responsabilidad de AimlBotPlugin y sus subclases.
 */

import type {
  AimlCategory,
  AimlPattern,
  ConversationState,
  ConversationTurn,
  IntentEngineOptions,
  IntentFn,
  IntentResolver,
  IntentResult,
  MessageContext,
  PatternFn,
  PatternMatch,
  SessionVars,
} from "./aiml-types.js";
import { UNMATCHED_INTENT } from "./aiml-types.js";

// ─── Pattern compilation ───────────────────────────────────────────────────────

/**
 * Compila un AimlPattern a una función de matching normalizada.
 * Strings con wildcards se convierten a RegExp una sola vez.
 */
function compilePattern(pattern: AimlPattern): PatternFn {
  if (typeof pattern === "function") {
    return pattern;
  }
  if (pattern instanceof RegExp) {
    return (input: string): PatternMatch => {
      const m = pattern.exec(input);
      if (!m) return { matched: false, stars: [] };
      // Grupos de captura (omitir el grupo 0 = match completo)
      const stars = m.slice(1).filter((s): s is string => s !== undefined);
      return { matched: true, stars };
    };
  }
  // String con wildcards AIML: * _ # ^
  // Separar el string por los wildcards manteniendo los delimitadores.
  // Esto evita el problema de escaping de * como cuantificador regex.
  const rawParts = pattern.split(/(\*|_|#|\^)/);
  const regexParts = rawParts.map((part) => {
    switch (part) {
      case "*": return "(.+?)";  // uno o más palabras (greedy lazy)
      case "_": return "(.+?)";  // uno o más (mayor prioridad que *)
      case "#": return "(\\S.*?|)"; // cero o más palabras (puede ser vacío)
      case "^": return "(\\S+)"; // exactamente una palabra
      default:
        // Escapar chars especiales de regex en las partes literales
        return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  });

  const re = new RegExp(`^${regexParts.join("")}$`, "i");

  return (input: string): PatternMatch => {
    const m = re.exec(input.trim());
    if (!m) return { matched: false, stars: [] };
    const stars = m.slice(1).filter((s): s is string => s !== undefined);
    return { matched: true, stars };
  };
}

// ─── IntentResolver expansion ─────────────────────────────────────────────────

async function expandResolver<TVars extends SessionVars>(
  resolver: IntentResolver<TVars>,
  vars: TVars,
  stars: string[],
  ctx: MessageContext,
): Promise<IntentResult> {
  if (typeof resolver === "string") {
    return {
      intent: resolver,
      confidence: 1.0,
      entities: {},
      stars,
      originalInput: ctx.text,
    };
  }
  if (typeof resolver === "function") {
    return resolver(vars, stars, ctx);
  }
  // IntentResult literal — enriquecer con stars y originalInput
  return { ...resolver, stars, originalInput: ctx.text };
}

// ─── Compiled category ────────────────────────────────────────────────────────

interface CompiledCategory<TVars extends SessionVars> {
  cat: AimlCategory<TVars>;
  matchFn: PatternFn;
  priority: number;
}

function compileCategories<TVars extends SessionVars>(
  categories: AimlCategory<TVars>[],
): CompiledCategory<TVars>[] {
  return categories
    .map((cat) => ({
      cat,
      matchFn: compilePattern(cat.pattern),
      priority: cat.priority ?? 5,
    }))
    .sort((a, b) => b.priority - a.priority); // higher priority first
}

// ─── IntentEngine ─────────────────────────────────────────────────────────────

export class IntentEngine<TVars extends SessionVars = SessionVars> {
  private compiled: CompiledCategory<TVars>[];
  private states: Map<string, ConversationState<TVars>>;
  private defaultVars: TVars;
  private options: Required<IntentEngineOptions>;

  constructor(
    categories: AimlCategory<TVars>[],
    defaultVars: TVars,
    options?: IntentEngineOptions,
  ) {
    this.compiled = compileCategories(categories);
    this.defaultVars = defaultVars;
    this.states = new Map();
    this.options = {
      maxHistory: options?.maxHistory ?? 20,
      fallbackIntent: options?.fallbackIntent ?? UNMATCHED_INTENT,
      traceMatching: options?.traceMatching ?? false,
    };
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Clasifica un input → IntentResult.
   * Actualiza lastIntent en el estado de sesión.
   * NO ejecuta handlers. NO actualiza lastBotResponse.
   */
  async classify(ctx: MessageContext): Promise<IntentResult> {
    const state = this.getOrCreateState(String(ctx.chatId));
    const input = ctx.text.trim();

    // Filtrar por topic
    const applicable = this.compiled.filter(({ cat }) => {
      if (cat.topic && cat.topic !== state.topic) return false;
      return true;
    });

    for (const { cat, matchFn } of applicable) {
      // Evaluar `that` (condición sobre última respuesta)
      if (cat.that !== undefined && state.lastBotResponse !== null) {
        const thatOk = this.evalThat(cat.that, state.lastBotResponse);
        if (!thatOk) {
          if (this.options.traceMatching) {
            console.debug(`[IntentEngine] skip ${cat.id ?? "?"}: that mismatch`);
          }
          continue;
        }
      } else if (cat.that !== undefined && state.lastBotResponse === null) {
        // that specified but no previous response → skip
        continue;
      }

      const match = matchFn(input, state.vars);
      if (this.options.traceMatching) {
        console.debug(
          `[IntentEngine] cat=${cat.id ?? "?"} matched=${match.matched} input="${input}"`,
        );
      }
      if (!match.matched) continue;

      // Resolver intent base
      let intent = await expandResolver(cat.resolver, state.vars, match.stars, ctx);
      intent.matchedCategoryId = cat.id;

      // Evaluar conditions (refina el intent si alguna aplica)
      if (cat.conditions?.length) {
        for (const cond of cat.conditions) {
          const varVal = String(state.vars[cond.varName] ?? "");
          const condMet =
            cond.value === undefined
              ? varVal !== "" && varVal !== "undefined"
              : varVal === cond.value;
          if (condMet) {
            intent = await expandResolver(cond.resolver, state.vars, match.stars, ctx);
            intent.matchedCategoryId = cat.id;
            break;
          }
        }
      }

      // Side effect
      if (cat.sideEffect) {
        cat.sideEffect(state.vars, match.stars, intent);
      }

      // Redirect (srai): re-clasificar con nuevo input
      if (cat.redirect) {
        const redirectCtx: MessageContext = { ...ctx, text: cat.redirect };
        return this.classify(redirectCtx);
      }

      state.lastIntent = intent;
      return intent;
    }

    // Nada encajó
    const fallback: IntentResult = {
      ...this.options.fallbackIntent,
      originalInput: input,
    };
    state.lastIntent = fallback;
    return fallback;
  }

  /**
   * Registra que el handler pipeline produjo una respuesta.
   * Actualiza lastBotResponse y history para el chat.
   * Llamado por AimlBotPlugin después de ejecutar handlers.
   */
  recordResponse(chatId: string | number, intent: IntentResult, output: string): void {
    const state = this.getOrCreateState(String(chatId));
    state.lastBotResponse = output;

    const turn: ConversationTurn = {
      input: intent.originalInput,
      intent,
      output,
      timestamp: new Date(),
    };
    state.history.push(turn);
    if (state.history.length > this.options.maxHistory) {
      state.history.shift();
    }
  }

  getState(chatId: string | number): ConversationState<TVars> | undefined {
    return this.states.get(String(chatId));
  }

  setVar(chatId: string | number, name: keyof TVars & string, value: string): void {
    const state = this.getOrCreateState(String(chatId));
    (state.vars as Record<string, string | undefined>)[name] = value;
  }

  setTopic(chatId: string | number, topic: string | null): void {
    const state = this.getOrCreateState(String(chatId));
    state.topic = topic;
  }

  resetChat(chatId: string | number): void {
    this.states.delete(String(chatId));
  }

  resetAll(): void {
    this.states.clear();
  }

  /** Añade categorías dinámicamente. */
  addCategories(categories: AimlCategory<TVars>[]): void {
    const newCompiled = compileCategories(categories);
    this.compiled = [...this.compiled, ...newCompiled].sort(
      (a, b) => b.priority - a.priority,
    );
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private getOrCreateState(chatId: string): ConversationState<TVars> {
    let state = this.states.get(chatId);
    if (!state) {
      state = {
        vars: { ...this.defaultVars },
        topic: null,
        lastBotResponse: null,
        lastIntent: null,
        history: [],
      };
      this.states.set(chatId, state);
    }
    return state;
  }

  private evalThat(that: string | RegExp, lastResponse: string): boolean {
    if (that instanceof RegExp) return that.test(lastResponse);
    return lastResponse.toLowerCase().includes(that.toLowerCase());
  }
}
