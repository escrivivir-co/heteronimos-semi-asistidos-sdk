/**
 * aiml-types.ts — Tipos del motor de extracción de intención (AIML-inspired).
 *
 * CLAVE: El engine NO produce texto. Produce IntentResult.
 * El texto lo produce el handler pipeline downstream.
 *
 * Pipeline:
 *   input → IntentEngine.classify() → IntentResult → Handler[] → string
 */

// ─── Intent: la salida del engine (NO texto) ──────────────────────────────────

/**
 * Resultado de clasificar un input.
 * Es la señal que el engine emite y que el pipeline downstream consume.
 */
export interface IntentResult {
  /** Nombre del intent detectado (ej: "iacm.request.received", "greet", "unknown") */
  intent: string;
  /** Confianza 0.0–1.0 */
  confidence: number;
  /** Entidades extraídas (captures nombrados o de entityMapping) */
  entities: Record<string, string>;
  /** Stars: captures posicionales (compatibilidad AIML <star/>) */
  stars: string[];
  /** Ruta sugerida para el handler pipeline */
  route?: string;
  /** Texto original del input (contexto downstream) */
  originalInput: string;
  /** ID de la categoría que matcheó (tracing) */
  matchedCategoryId?: string;
}

/** Intent especial: nada encajó. */
export const UNMATCHED_INTENT: IntentResult = {
  intent: "unmatched",
  confidence: 0,
  entities: {},
  stars: [],
  originalInput: "",
};

// ─── Pattern matching ─────────────────────────────────────────────────────────

export interface PatternMatch {
  matched: boolean;
  stars: string[];
}

export type PatternFn = (input: string, vars: SessionVars) => PatternMatch;

/**
 * Patrón de entrada:
 * - string: case-insensitive, soporta wildcards * _ # ^
 * - RegExp: grupos de captura → stars[]
 * - PatternFn: lógica custom
 */
export type AimlPattern = string | RegExp | PatternFn;

// ─── Intent resolver: reemplaza el "template" de AIML clásico ────────────────

/**
 * Función que construye el IntentResult.
 * Equivale a <template> en AIML, pero produce intención, no texto.
 */
export type IntentFn<TVars extends SessionVars = SessionVars> = (
  vars: TVars,
  stars: string[],
  ctx: MessageContext,
) => IntentResult | Promise<IntentResult>;

/**
 * Resolver de intención:
 * - string: nombre del intent (shorthand)
 * - IntentResult: literal estático
 * - IntentFn: construye dinámicamente
 */
export type IntentResolver<TVars extends SessionVars = SessionVars> =
  | string
  | IntentResult
  | IntentFn<TVars>;

// ─── Condition ────────────────────────────────────────────────────────────────

/**
 * Cláusula condicional que refina el intent según variables de sesión.
 * Equivale a <condition> en AIML.
 */
export interface ConditionClause<TVars extends SessionVars = SessionVars> {
  varName: keyof TVars & string;
  /** Valor esperado. Si undefined → "variable existe y no es vacía" */
  value?: string;
  resolver: IntentResolver<TVars>;
}

// ─── Category: unidad del engine ─────────────────────────────────────────────

/**
 * Par pattern → intent resolver.
 * NOT produce texto. El field `resolver` produce IntentResult.
 */
export interface AimlCategory<TVars extends SessionVars = SessionVars> {
  /** ID para tracing */
  id?: string;
  /** Patrón activador */
  pattern: AimlPattern;
  /** Resolver de intención */
  resolver: IntentResolver<TVars>;
  /** Condiciones que refinan el intent */
  conditions?: ConditionClause<TVars>[];
  /** Topic activo requerido */
  topic?: string;
  /** Condición sobre la última respuesta del bot */
  that?: string | RegExp;
  /** Side effect: actualiza vars antes de emitir el intent */
  sideEffect?: (vars: TVars, stars: string[], intent: IntentResult) => void;
  /** Re-clasificar: pasar nuevo string al engine como input */
  redirect?: string;
  /** Prioridad 0–10. Default: 5 */
  priority?: number;
}

// ─── Handler: segundo stage del pipeline ──────────────────────────────────────

/**
 * Handler que procesa un IntentResult y produce la respuesta final.
 * - string: respuesta para el usuario
 * - undefined: no sabe manejar este intent → siguiente handler
 */
export type IntentHandler<TVars extends SessionVars = SessionVars> = (
  intent: IntentResult,
  vars: TVars,
  ctx: MessageContext,
) => string | Promise<string> | undefined | Promise<undefined>;

// ─── Session & context ────────────────────────────────────────────────────────

export type SessionVars = Record<string, string | undefined>;

export interface MessageContext {
  chatId: number | string;
  userId?: number | string;
  username?: string;
  text: string;
  timestamp: Date;
  raw?: unknown;
}

export interface ConversationState<TVars extends SessionVars = SessionVars> {
  vars: TVars;
  topic: string | null;
  lastBotResponse: string | null;
  lastIntent: IntentResult | null;
  history: ConversationTurn[];
}

export interface ConversationTurn {
  input: string;
  intent: IntentResult;
  output: string;
  timestamp: Date;
}

export interface IntentEngineOptions {
  /** Máximo turnos en historial por chat. Default: 20 */
  maxHistory?: number;
  /** Intent cuando nada encaja. Default: UNMATCHED_INTENT */
  fallbackIntent?: IntentResult;
  /** Log debug de pattern matching. Default: false */
  traceMatching?: boolean;
}
