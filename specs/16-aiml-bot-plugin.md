# SDS-16 · AIML Intent Engine — Bot Plugin Pack

> **heteronimos-semi-asistidos-sdk** · Software Design Specification
> Estado: DRAFT · target: v0.5.0

---

## 1. Objetivo

Crear una capa intermedia de **plugins AIML** entre el `BotPlugin` base del SDK y las implementaciones finales de cada app. Esta capa proporciona:

1. **Un motor de extracción de intención** inspirado en AIML que clasifica input libre en intenciones tipadas (`IntentResult`).
2. **Un pipeline de procesamiento** donde AIML es el primer stage (filtro de intención), no el último (generador de texto). El engine extrae *qué quiere el usuario*, no *qué contestar*.
3. **Clases base extensibles** (`AimlBotPlugin`, `IntentEngine`) que cualquier app hereda. Las apps definen categorías (patterns → intents) y handlers (intents → acciones).

**Problema actual:** `BotPlugin` es una interfaz plana — `commands()` devuelve texto estático, `onMessage()` es un handler catch-all sin estado. Para bots que participan en protocolos inter-agente (como IACM), el consumidor debe reimplementar pattern-matching, extracción de intención, y routing a flujos de protocolo desde cero.

**Insight clave:** En AIML tradicional, el template genera la respuesta final al usuario. En nuestro caso, **AIML no es un dispensador de texto** — es una **máquina de filtrar y encauzar intención de usuario**. El template no produce texto: produce una señal de routing (`IntentResult`) que indica qué handler del pipeline debe ejecutarse con qué contexto extraído. El texto final lo produce el handler, no el engine.

**¿Por qué?** Porque el protocolo IACM tiene un álgebra conocida (REQUEST→ACK→PROCESS→REPORT, QUESTION→ANSWER, etc.). El AIML mapea input libre a transiciones de ese álgebra. El handler ejecuta la transición con el contexto completo.

```
Pipeline:
  input → IntentEngine (AIML) → IntentResult → Handler (protocolo/dominio) → respuesta
          ──────────────────     ───────────    ────────────────────────      ─────────
          "qué quiso decir"      señal tipada    "qué hacer con eso"         texto/acción
```

---

## 2. Contexto: AIML como intent classifier, no como response generator

AIML (Artificial Intelligence Markup Language) define un modelo probado:
- **Categories** = par `<pattern>` + `<template>`
- **Variables** = `<set>` / `<get>` (estado de sesión)
- **Conditions** = `<condition>` (branching por variables)
- **Topics** = agrupación de categorías por contexto activo
- **That** = condición sobre la última salida del bot
- **Srai** = redirect a otro patrón (re-clasificación)

Nosotros **reutilizamos** estos mecanismos pero con un cambio fundamental en el **propósito del template**:

```
AIML tradicional:
  pattern → template = "texto para el usuario"

Nuestra arquitectura:
  pattern → template = IntentResult { intent, entities, confidence, route }
                       ↓
                   Handler pipeline
                       ↓
                   "texto para el usuario" (o acción IACM, o side-effect)
```

Mapping de conceptos:

```
AIML XML:              Nuestro TS:
─────────              ──────────
<category>        →    AimlCategory<TVars>
<pattern>         →    string | RegExp | PatternFn
<template>        →    IntentResult | IntentFn (NO texto)
<set> / <get>     →    SessionVars (Record genérico)
<condition>       →    ConditionClause[] (refina el intent)
<topic>           →    topic: string (contexto activo)
<that>            →    that?: string | RegExp (continuidad)
<think>           →    sideEffect?: (vars, ctx) => void
<srai>            →    redirect?: string (re-clasificar)
```

---

## 3. Diseño

### 3.1 Nuevos tipos en `src/core/aiml-types.ts`

```typescript
// ─── Intent: la salida del engine (NO texto) ───

/**
 * Resultado de clasificar un input.
 * Es la señal que el engine emite y que el pipeline downstream consume.
 *
 * CLAVE: IntentResult NO ES texto para el usuario.
 * Es la respuesta a "¿qué quiso decir?" + "¿por dónde continuar?"
 */
export interface IntentResult {
  /** Nombre del intent detectado (ej: "iacm.request", "greet", "unknown") */
  intent: string;
  /** Confianza en la clasificación: 0.0–1.0 */
  confidence: number;
  /** Entidades extraídas del input (captures de wildcards/regex) */
  entities: Record<string, string>;
  /** Stars: captures posicionales (compatibilidad AIML <star/>) */
  stars: string[];
  /**
   * Ruta sugerida para el handler pipeline.
   * Puede ser un string libre ("iacm.request.new") o un enum del protocolo.
   * El handler lo interpreta; el engine solo sugiere.
   */
  route?: string;
  /** Texto original del input (para contexto downstream) */
  originalInput: string;
  /** ID de la categoría que matcheó (para tracing) */
  matchedCategoryId?: string;
}

/**
 * Intent especial: nada encajó.
 */
export const UNMATCHED_INTENT: IntentResult = {
  intent: "unmatched",
  confidence: 0,
  entities: {},
  stars: [],
  originalInput: "",
};

// ─── Pattern matching (sin cambios respecto al AIML clásico) ───

/**
 * Resultado de evaluar un pattern contra un input.
 */
export interface PatternMatch {
  matched: boolean;
  stars: string[];
}

export type PatternFn = (input: string, vars: SessionVars) => PatternMatch;

/**
 * Patrón de entrada:
 * - string: case-insensitive, soporta wildcards * _ # ^
 * - RegExp: con captura de grupos → stars
 * - PatternFn: lógica custom
 */
export type AimlPattern = string | RegExp | PatternFn;

// ─── Intent resolver: el reemplazo del "template" tradicional ───

/**
 * Función que construye el IntentResult.
 * Recibe variables de sesión + captures del pattern + contexto.
 * Es el equivalente funcional de <template>, pero produce intención, no texto.
 */
export type IntentFn<TVars extends SessionVars = SessionVars> = (
  vars: TVars,
  stars: string[],
  ctx: MessageContext,
) => IntentResult | Promise<IntentResult>;

/**
 * Resolver de intención. Puede ser:
 * - string: nombre del intent (shorthand — se expande a IntentResult con ese intent)
 * - IntentResult: literal (para intents estáticos conocidos)
 * - IntentFn: construye dinámicamente según contexto
 */
export type IntentResolver<TVars extends SessionVars = SessionVars> =
  | string
  | IntentResult
  | IntentFn<TVars>;

// ─── Condition: refina el intent según variables ───

/**
 * Cláusula condicional que puede cambiar el intent detectado.
 * Equivale a <condition> en AIML, pero produce un intent alternativo,
 * no un texto alternativo.
 */
export interface ConditionClause<TVars extends SessionVars = SessionVars> {
  /** Variable a evaluar */
  varName: keyof TVars & string;
  /** Valor esperado. Si undefined → "variable existe y no vacía" */
  value?: string;
  /** Intent alternativo si la condición se cumple */
  resolver: IntentResolver<TVars>;
}

// ─── Category: la unidad del engine ───

/**
 * Unidad del intent engine.
 * Un par pattern → intent resolver con metadata de routing.
 *
 * Nótese: NO hay campo "template" que produzca texto.
 * El campo "resolver" produce un IntentResult.
 */
export interface AimlCategory<TVars extends SessionVars = SessionVars> {
  /** ID opcional para tracing y debugging */
  id?: string;
  /** Patrón que activa esta categoría */
  pattern: AimlPattern;
  /** Resolver de intención (qué intent corresponde a este pattern) */
  resolver: IntentResolver<TVars>;
  /** Condiciones: refinan el intent según estado de sesión */
  conditions?: ConditionClause<TVars>[];
  /** Topic activo requerido */
  topic?: string;
  /** Condición sobre la última salida del bot (continuidad) */
  that?: string | RegExp;
  /** Side effect antes de emitir el intent (actualizar vars) */
  sideEffect?: (vars: TVars, stars: string[], intent: IntentResult) => void;
  /** Re-clasificar: pasar el string al engine como nuevo input */
  redirect?: string;
  /** Prioridad: 0=baja, 10=alta. Default: 5 */
  priority?: number;
}

// ─── Handler: el downstream que consume intents ───

/**
 * Handler que procesa un IntentResult y produce la respuesta final.
 * Es el segundo stage del pipeline.
 *
 * Puede producir:
 * - string: texto de respuesta para el usuario/chat
 * - undefined: el handler no sabe manejar este intent → next handler
 */
export type IntentHandler<TVars extends SessionVars = SessionVars> = (
  intent: IntentResult,
  vars: TVars,
  ctx: MessageContext,
) => string | Promise<string> | undefined | Promise<undefined>;

// ─── Session & context (sin cambios) ───

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
  /** Último intent emitido (para debugging y continuidad) */
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
  /** Máximo de turnos en historial por chat. Default: 20 */
  maxHistory?: number;
  /** Intent a emitir cuando nada encaja. Default: UNMATCHED_INTENT */
  fallbackIntent?: IntentResult;
  /** Si true, log debug de pattern matching. Default: false */
  traceMatching?: boolean;
}
```

### 3.2 Motor de intención en `src/core/intent-engine.ts`

```typescript
/**
 * Motor de extracción de intención basado en AIML.
 *
 * Primer stage del pipeline:
 *   input → IntentEngine.classify() → IntentResult
 *
 * NO produce texto. NO ejecuta acciones de protocolo.
 * Solo clasifica input y extrae entidades.
 *
 * El segundo stage (handlers) es responsabilidad del plugin.
 */
export class IntentEngine<TVars extends SessionVars = SessionVars> {
  private states: Map<string, ConversationState<TVars>>;
  private categories: AimlCategory<TVars>[];
  private options: Required<IntentEngineOptions>;

  constructor(
    categories: AimlCategory<TVars>[],
    defaultVars: TVars,
    options?: IntentEngineOptions,
  );

  /**
   * Clasifica un input → IntentResult.
   * Actualiza estado de sesión (vars, topic, history).
   * NO ejecuta handlers. Solo extrae intención.
   */
  classify(ctx: MessageContext): Promise<IntentResult>;

  /** Obtiene estado de un chat (readonly). */
  getState(chatId: string | number): ConversationState<TVars> | undefined;

  /** Setea variable para un chat. */
  setVar(chatId: string | number, name: keyof TVars & string, value: string): void;

  /** Cambia topic activo. */
  setTopic(chatId: string | number, topic: string | null): void;

  /** Resetea estado de un chat. */
  resetChat(chatId: string | number): void;

  /** Resetea todos los chats. */
  resetAll(): void;

  /** Añade categorías dinámicamente. */
  addCategories(categories: AimlCategory<TVars>[]): void;

  /**
   * Registra que un handler produjo una respuesta.
   * Actualiza lastBotResponse y history para el chat.
   * (Llamado por AimlBotPlugin después de ejecutar handlers.)
   */
  recordResponse(chatId: string | number, intent: IntentResult, output: string): void;
}
```

**Algoritmo de `classify()`:**

```
1. Obtener o crear ConversationState para chatId
2. Filtrar categorías por topic (global + topic activo)
3. Ordenar por prioridad (desc)
4. Para cada categoría:
   a. Evaluar `that` (contra lastBotResponse)
   b. Evaluar `pattern` contra input → PatternMatch
   c. Si matched:
      - Evaluar `conditions` en orden (contra vars) → primer match refina el intent
      - Si ninguna condición cumple → usar `resolver` base
      - Expandir IntentResolver:
        · string → { intent: string, confidence: 1.0, stars, entities: {}, ... }
        · IntentResult → literal
        · IntentFn → ejecutar función
      - Ejecutar `sideEffect` (puede mutar vars)
      - Si `redirect`, re-clasificar con el nuevo input
      - Retornar IntentResult
5. Si nada encaja → fallbackIntent (default: UNMATCHED_INTENT)
```

**Diferencia con el diseño anterior:** el engine NO actualiza `lastBotResponse` ni `history` por sí solo. Solo `lastIntent`. El plugin llama `recordResponse()` una vez que el handler pipeline produce la respuesta final. Esto separa clasificación de ejecución.

### 3.3 Clase base `AimlBotPlugin` en `src/core/aiml-bot-plugin.ts`

```typescript
import type { BotPlugin, CommandDefinition, MenuDefinition } from "./bot-handler.js";
import type {
  AimlCategory, SessionVars, IntentEngineOptions,
  MessageContext, IntentResult, IntentHandler,
} from "./aiml-types.js";
import { IntentEngine } from "./intent-engine.js";

/**
 * Plugin base con pipeline: intent classification → handler dispatch.
 *
 * El plugin author define:
 *   categories()   → cómo clasificar inputs en intents
 *   handlers()     → cómo procesar cada intent en una respuesta
 *   defaultVars()  → estado inicial de sesión
 *
 * El pipeline:
 *   1. onMessage recibe input
 *   2. IntentEngine.classify() → IntentResult
 *   3. handlers se evalúan en orden → primera respuesta no-undefined gana
 *   4. Si ningún handler responde → fallbackResponse()
 *   5. Se llama engine.recordResponse() para actualizar history
 */
export abstract class AimlBotPlugin<TVars extends SessionVars = SessionVars>
  implements BotPlugin
{
  abstract name: string;
  abstract pluginCode: string;

  protected engine: IntentEngine<TVars>;

  constructor(options?: IntentEngineOptions) {
    this.engine = new IntentEngine(
      this.categories(),
      this.defaultVars(),
      options,
    );
  }

  /** Categorías (pattern → intent). El author las define. */
  abstract categories(): AimlCategory<TVars>[];

  /** Variables iniciales por chat. El author las define. */
  abstract defaultVars(): TVars;

  /**
   * Handlers de intención — el segundo stage del pipeline.
   * Se evalúan en orden. El primero que devuelve string gana.
   *
   * El author los define. El SDK puede proveer handlers base en subclases
   * (ej: IacmBotPlugin añade handlers para los intents del protocolo IACM).
   *
   * Default: handler vacío (solo fallbackResponse).
   */
  handlers(): IntentHandler<TVars>[] {
    return [];
  }

  /**
   * Respuesta cuando ningún handler responde.
   * Override para customizar.
   */
  fallbackResponse(_intent: IntentResult, _ctx: MessageContext): string {
    return "";
  }

  /**
   * Comandos base.
   * El author puede override y concatenar: [...super.commands(), ...own]
   */
  commands(): CommandDefinition[] {
    return [
      {
        command: "reset",
        description: "Reset conversation state",
        buildText: (ctx) => {
          this.engine.resetChat(ctx.chat?.id ?? 0);
          return "Conversation state reset.";
        },
      },
    ];
  }

  menus(): MenuDefinition[] { return []; }

  /**
   * Pipeline completo: classify → dispatch handlers → record response.
   */
  async onMessage(ctx: any): Promise<string> {
    // 1. Normalizar contexto de plataforma
    const msgCtx: MessageContext = {
      chatId: ctx.chat?.id ?? 0,
      userId: ctx.from?.id,
      username: ctx.from?.username,
      text: ctx.message?.text ?? "",
      timestamp: new Date(),
      raw: ctx,
    };

    // 2. Clasificar: input → IntentResult
    const intent = await this.engine.classify(msgCtx);

    // 3. Dispatch: iterar handlers hasta que uno responda
    const vars = this.engine.getState(msgCtx.chatId)?.vars ?? this.defaultVars();
    let response: string | undefined;

    for (const handler of this.handlers()) {
      response = await handler(intent, vars, msgCtx);
      if (response !== undefined) break;
    }

    // 4. Fallback si ningún handler responde
    const finalResponse = response ?? this.fallbackResponse(intent, msgCtx);

    // 5. Registrar respuesta en el engine (actualiza history + lastBotResponse)
    this.engine.recordResponse(msgCtx.chatId, intent, finalResponse);

    return finalResponse;
  }
}
```

### 3.4 Pipeline: diagrama de flujo completo

```
┌──────────────────────────────────────────────────────────────────┐
│  PIPELINE DE UN AimlBotPlugin                                    │
│                                                                  │
│  Telegram msg                                                    │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────┐                                                 │
│  │ onMessage()  │  ← adapta ctx de plataforma → MessageContext   │
│  └──────┬──────┘                                                 │
│         ▼                                                        │
│  ┌─────────────────┐     categories()                            │
│  │ IntentEngine     │ ←── patterns + resolvers + conditions      │
│  │ .classify()      │     topics + that + sideEffects            │
│  │                  │                                            │
│  │ "¿qué quiso      │                                            │
│  │  decir?"         │                                            │
│  └──────┬──────────┘                                             │
│         │  IntentResult { intent, entities, stars, route }       │
│         ▼                                                        │
│  ┌──────────────────┐    handlers()                              │
│  │ Handler pipeline  │ ←── IntentHandler[] en orden              │
│  │                   │                                           │
│  │ handler[0](intent)│ → undefined (no lo maneja)                │
│  │ handler[1](intent)│ → "Texto de respuesta"  ← primera win    │
│  │ handler[N]...     │                                           │
│  └──────┬───────────┘                                            │
│         │  string (o fallbackResponse si nadie responde)         │
│         ▼                                                        │
│  ┌──────────────────┐                                            │
│  │ recordResponse()  │ ← actualiza history + lastBotResponse     │
│  └──────┬───────────┘                                            │
│         ▼                                                        │
│     return texto                                                 │
└──────────────────────────────────────────────────────────────────┘
```

### 3.5 Patrón de herencia (3 niveles)

```
┌──────────────────────────────────────────────────────────────┐
│  Nivel 1 · SDK: BotPlugin interface                          │
│  commands(), menus(), onMessage()                            │
├──────────────────────────────────────────────────────────────┤
│  Nivel 2 · SDK: AimlBotPlugin<TVars> abstract class          │
│  + IntentEngine: classify inputs → IntentResult              │
│  + Handler pipeline: IntentResult → respuesta                │
│  + categories(), handlers(), defaultVars()                   │
│  + /reset command                                            │
├──────────────────────────────────────────────────────────────┤
│  Nivel 3 · APP: MyBot extends AimlBotPlugin<MyVars>          │
│  + categories() con los patterns → intents de su dominio     │
│  + handlers() que procesan los intents                       │
│  + defaultVars(), commands(), menus() propios                │
└──────────────────────────────────────────────────────────────┘
```

**Ejemplo de uso — bot con intent pipeline:**

```typescript
import {
  AimlBotPlugin,
  type AimlCategory, type IntentHandler, type IntentResult,
} from "heteronimos-semi-asistidos-sdk";

interface GreeterVars {
  name?: string;
  language?: string;
}

class GreeterBot extends AimlBotPlugin<GreeterVars> {
  name = "greeter";
  pluginCode = "gr";

  defaultVars() { return { name: undefined, language: "es" }; }

  // Stage 1: clasificación (pattern → intent)
  categories(): AimlCategory<GreeterVars>[] {
    return [
      {
        id: "greet",
        pattern: /^(hola|hello|hi)$/i,
        resolver: "greet",  // shorthand: intent = "greet"
        conditions: [
          {
            varName: "name",
            // si ya tenemos nombre → intent diferente
            resolver: { intent: "greet.returning", confidence: 1, entities: {}, stars: [], originalInput: "" },
          },
        ],
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
        resolver: "unknown",
        priority: 0,
      },
    ];
  }

  // Stage 2: handlers (intent → respuesta)
  handlers(): IntentHandler<GreeterVars>[] {
    return [
      (intent, vars) => {
        if (intent.intent === "greet")
          return "¡Hola! ¿Cómo te llamas?";
        if (intent.intent === "greet.returning")
          return `¡Hola de nuevo, ${vars.name}!`;
        if (intent.intent === "introduce")
          return `Encantado, ${intent.entities.name}!`;
        return undefined; // no handler for this intent
      },
    ];
  }

  fallbackResponse() { return "No te he entendido. /gr_reset para empezar de nuevo."; }
}
```

### 3.6 Pattern matching: wildcards estilo AIML (sin cambios)

Para patterns de tipo string, el motor soporta:
- `*` — uno o más palabras (greedy) → capture en stars
- `_` — uno o más palabras (greedy, mayor prioridad) → capture en stars
- `#` — cero o más palabras → capture en stars
- `^` — exactamente una palabra
- Case-insensitive por defecto

Los patterns string se compilan a RegExp internamente (una sola vez al construir el engine).

Orden de prioridad: `_` > exacto > `*` (AIML standard). Esto es ortogonal al campo `priority` de la categoría.

---

## 4. Cambios por archivo

| Archivo | Cambio | Nuevo |
|---------|--------|-------|
| `src/core/aiml-types.ts` | `IntentResult`, `IntentResolver`, `IntentHandler`, `AimlCategory`, `AimlPattern`, `ConditionClause`, `SessionVars`, `MessageContext`, `ConversationState`, `ConversationTurn`, `IntentEngineOptions` | ✅ |
| `src/core/intent-engine.ts` | `IntentEngine` class — classify input → IntentResult | ✅ |
| `src/core/aiml-bot-plugin.ts` | `AimlBotPlugin` abstract class — pipeline classify → handlers → response | ✅ |
| `src/index.ts` | Exportar tipos + clases del intent engine | — |
| `tests/aiml-types.test.ts` | Tests de tipos, pattern matching utils, IntentResult shape | ✅ |
| `tests/intent-engine.test.ts` | Tests del engine: classify, conditions, vars, topics, that, redirect, IntentResult | ✅ |
| `tests/aiml-bot-plugin.test.ts` | Tests de la clase base: pipeline, handlers, fallback, registerPlugins acepta | ✅ |

**No se tocan:** `bot-handler.ts`, `command-handler.ts`, `menu-handler.ts`, `runtime-emitter.ts`, `boot.ts`, dashboard, console-app.

---

## 5. Criterios de aceptación

1. Un plugin author crea un bot heredando de `AimlBotPlugin<MisVars>` e implementando `categories()`, `handlers()` y `defaultVars()`.
2. `categories()` definen pattern → IntentResolver (no texto). Cada categoría produce un `IntentResult`.
3. `handlers()` definen IntentHandler[] que consumen `IntentResult` y producen texto (o `undefined` → next handler).
4. El `IntentEngine.classify()` resuelve patterns string, RegExp y funciones → retorna `IntentResult`.
5. `IntentResult` contiene `intent`, `confidence`, `entities`, `stars`, `route?`, `originalInput`, `matchedCategoryId?`.
6. Las variables de sesión se mantienen por chat. Las condiciones refinan el intent, no el texto.
7. El `topic` filtra qué categorías están activas.
8. El `that` permite continuidad (condición sobre última respuesta del bot).
9. El `redirect` (srai) re-clasifica un nuevo input, no re-ejecuta handlers.
10. Los wildcards `*`, `_`, `#` capturan en `stars[]`.
11. `AimlBotPlugin` es un `BotPlugin` válido — `registerPlugins` la acepta sin cambios.
12. `AimlBotPlugin.onMessage` ejecuta el pipeline completo: classify → handlers → recordResponse → string.
13. Si ningún handler responde, se usa `fallbackResponse(intent, ctx)`.
14. El pipeline es extensible: subclases (ej: `IacmBotPlugin`) pueden añadir handlers pre-built para intents del protocolo.
15. Full test suite verde.

---

## 6. Tests

| Suite | Tests |
|-------|-------|
| `aiml-types.test.ts` | Pattern compilation (string→regex), wildcard captures, PatternFn, IntentResult shape validation, UNMATCHED_INTENT constant |
| `intent-engine.test.ts` | classify() básico, prioridad de patterns, conditions refina intent, topic filter, that continuity, redirect re-classify, sideEffect ejecuta, fallbackIntent, history + lastIntent tracking, resetChat, addCategories, IntentResolver shorthand expansion |
| `aiml-bot-plugin.test.ts` | Pipeline completo (classify → handler → response), handler chain (first non-undefined wins), fallbackResponse cuando nadie responde, reset command, commands() concatena con super, menus() default vacío, registerPlugins acepta AimlBotPlugin, handlers vacío por defecto |
| `barrel.test.ts` | Nuevos exports: `IntentResult`, `IntentEngine`, `AimlBotPlugin`, `IntentHandler`, `UNMATCHED_INTENT`, `AimlCategory`, `AimlPattern`, `IntentResolver`, `MessageContext` |

---

## 7. Notas de diseño

### ¿Por qué IntentResult y no texto?

**El punto clave de este diseño.** En AIML tradicional, `<template>` produce texto para el usuario. Aquí, el resolver produce un `IntentResult` — una señal tipada que dice *qué quiso decir* el usuario, no *qué decirle*.

Esto permite:
1. **Separación de concerns**: clasificar ≠ responder. El engine clasifica; los handlers responden.
2. **Composición de pipelines**: un handler puede ser genérico (ej: protocolo IACM) y reutilizarse en múltiples plugins.
3. **Testing granular**: testear clasificación sin testear respuestas. Testear handlers con IntentResults mock.
4. **Routing**: el campo `route` de IntentResult permite que subclases (IacmBotPlugin) dirijan intents a state machines de protocolo.
5. **Observabilidad**: `IntentResult` es serializable → se emite por RuntimeEmitter para tracing.

### ¿Por qué no AIML XML nativo?

1. **TypeScript-first**: los tipos genéricos (`AimlCategory<TVars>`) dan type-safety que XML no puede.
2. **Composabilidad**: las categorías son objetos JS — se pueden generar, filtrar, combinar dinámicamente.
3. **Funciones como resolvers**: `IntentFn` permite lógica arbitraria; XML requeriría extensiones custom.
4. **Zero dependencies**: no necesitamos parser XML.

### ¿Por qué sí la semántica AIML?

1. **Modelo probado**: AIML lleva 25+ años. Pattern, topic, that, star — cubren el 90% de la clasificación.
2. **Declarativo**: el plugin author define *qué* (patterns → intents), no *cómo* (el engine clasifica).
3. **Coordina con IACM**: las AimlCategories mapean intents a transiciones del protocolo (ver SDS-17). El engine es el primer stage; el protocolo es el segundo.
4. **Portable**: si migramos de Telegram, los categories no cambian — solo cambia `MessageContext.raw`.

### Pipeline de 2 stages vs monolítico

```
MONOLÍTICO (AIML clásico):     PIPELINE (este diseño):
input → match → texto           input → classify → IntentResult → handler → texto
                                       ╰── stage 1 ──╯           ╰── stage 2 ──╯
```

El stage 1 (AIML) es **determinista y testeable**: pattern matching puro.
El stage 2 (handlers) puede ser **arbitrariamente complejo**: state machines, llamadas a APIs, protocol routing.

La separación permite que **SDS-17 (IACM)** añada handlers de protocolo sin tocar el engine de clasificación.

### Sobre `MessageContext` vs `Context` de grammY

`MessageContext` es la **abstracción de plataforma**. Hoy `raw` es el Context de grammY. Si mañana migramos a Discord/Matrix/custom, `MessageContext` no cambia — solo el adapter que lo construye. La clase `AimlBotPlugin.onMessage()` hace ese mapping.
