# SDS-17 · IACM Protocol Integration

> **heteronimos-semi-asistidos-sdk** · Software Design Specification
> Estado: DRAFT · target: v0.5.0
> Dependencia: SDS-16 (AIML Bot Plugin Pack)

---

## 1. Objetivo

Incorporar el protocolo **IACM (Inter-Agent Communication Message)** al SDK como la **álgebra de transiciones** que consume los intents extraídos por el motor AIML (SDS-16). Esto implica:

1. **Mover la spec IACM** a una carpeta `protocols/` del repo y crear una página GH Pages que enlace a ella (DRY — no duplicar contenido).
2. **Pack de tipos TypeScript** que codifican los 11 message types, la estructura `meta`, y las reglas de validación como tipos del SDK.
3. **Plugin base `IacmBotPlugin`** que extiende `AimlBotPlugin` (SDS-16) y proporciona **handlers de protocolo** pre-built: el pipeline AIML clasifica el input → `IntentResult` con intent IACM (ej: `iacm.request.received`) → el handler de protocolo ejecuta la transición correcta (ACK automático, cambio de estado, respuesta estructurada).
4. **Categorías AIML pre-configuradas** que mapean mensajes IACM entrantes a **intents tipados** (`iacm.*`), no a respuestas textuales.
5. **State machine de protocolo** que implementa los flujos conocidos de IACM (REQUEST→ACK→PROCESS→REPORT, QUESTION→ANSWER, etc.) como handlers que consumen `IntentResult`.

**Pipeline completo:**

```
input → IntentEngine (categories IACM)
      → IntentResult { intent: "iacm.request.received", ... }
      → IacmProtocolHandler (state machine)
      → transición de estado + respuesta formateada
```

**Resultado:** un bot que herede de `IacmBotPlugin` participa en conversaciones inter-agente sin reimplementar el protocolo. El AIML clasifica; el protocolo ejecuta.

---

## 2. Contexto

### 2.1 ¿Qué es IACM?

IACM v1.0 define 11 tipos de mensaje para comunicación entre agentes:

| Categoría | Tipos |
|-----------|-------|
| Directivos | `REQUEST`, `QUESTION` |
| Informativos | `REPORT`, `FYI`, `ANSWER` |
| Compromisivos | `PROPOSAL`, `ACCEPT`, `DEFER` |
| Cierre | `ACKNOWLEDGE`, `REJECT` |
| Escalación | `URGENT` |

Cada mensaje tiene 4 secciones: `meta` (routing), `<tipo>` (datos estructurados), `narrative` (texto libre), `statistics` (métricas opcionales).

### 2.2 ¿Por qué integrarlo en el SDK?

Los bots de este SDK van a hablar entre ellos en grupos. Sin protocolo, cada bot formatea sus mensajes de forma ad-hoc → parsing frágil, sin threading, sin trazabilidad. IACM resuelve esto con un formato estandarizado.

Pero IACM como spec es un documento pasivo. La integración lo convierte en **código ejecutable**: tipos que el compilador valida, plantillas que el bot genera automáticamente, y un motor AIML que sabe interpretar mensajes entrantes y responder según el protocolo.

### 2.3 Relación con SDS-16

```
SDS-16: AimlBotPlugin<TVars>   →  Pipeline: classify → handlers → response
        IntentEngine            →  Stage 1: input → IntentResult

SDS-17: IacmBotPlugin           →  Stage 2 especializado para protocolo IACM
        Categorías IACM         →  Patterns que producen intents iacm.*
        Protocol handlers       →  Handlers que consumen intents → state machine → respuesta
```

**Clave:** Las categorías IACM no producen texto — producen `IntentResult` con intents como `iacm.request.received`, `iacm.question.pending`, `iacm.proposal.new`. Los **handlers de protocolo** (stage 2) son los que ejecutan las transiciones y generan las respuestas.

```
┌─────────────────── IacmBotPlugin ───────────────────┐
│                                                      │
│  categories() = IACM categories + domain categories  │
│         │                                            │
│         ▼                                            │
│  IntentEngine.classify()                             │
│         │                                            │
│         ▼  IntentResult { intent: "iacm.request.*" } │
│                                                      │
│  handlers() = [iacmProtocolHandler, ...domainHandlers]│
│         │                                            │
│         ▼                                            │
│  State machine: transiciones del protocolo           │
│         │                                            │
│         ▼                                            │
│  Respuesta formateada (texto o IACM message)         │
└──────────────────────────────────────────────────────┘
```

---

## 3. Diseño

### 3.1 Organización de archivos del protocolo

```
protocols/                                    ← NUEVA carpeta raíz
└── IACM_FORMAT_SPECIFICATION.md              ← movido desde templates/

docs/
├── protocols.html                            ← NUEVA página GH Pages
└── poster-template/fanzine.css               ← sin cambios

src/core/
├── iacm-types.ts                             ← NUEVO: tipos TS del protocolo
├── iacm-templates.ts                         ← NUEVO: builders de mensajes IACM
├── iacm-parser.ts                            ← NUEVO: parser de mensajes IACM
├── iacm-categories.ts                        ← NUEVO: categorías AIML para IACM
└── iacm-bot-plugin.ts                        ← NUEVO: plugin base IACM

tests/
├── iacm-types.test.ts                        ← NUEVO
├── iacm-templates.test.ts                    ← NUEVO
├── iacm-parser.test.ts                       ← NUEVO
├── iacm-categories.test.ts                   ← NUEVO
└── iacm-bot-plugin.test.ts                   ← NUEVO
```

### 3.2 Página GH Pages: `docs/protocols.html`

Página aséptica y funcional. No duplica contenido — enlaza al archivo `.md` del repo.

```html
<!-- Estructura conceptual — implementación sigue poster-template/template.html -->
<header>
  <h1>Protocols</h1>
  <div class="sub">Inter-Agent Communication Standards</div>
</header>

<!-- Card para cada protocolo -->
<div class="poster-card">
  <h2>IACM v1.0 — Inter-Agent Communication Message</h2>
  <div class="meta">YAML-based structured messages · 11 message types · threading · validation</div>

  <!-- Enlace al .md en el repo — DRY, no copiar contenido -->
  <a class="main-link" href="https://github.com/escrivivir-co/heteronimos-semi-asistidos-sdk/blob/main/protocols/IACM_FORMAT_SPECIFICATION.md">
    ☞ FULL SPECIFICATION (GitHub)
  </a>

  <!-- Resumen ejecutivo en la propia página -->
  <table class="tbl">
    <tr><th>Message Types</th><td>REQUEST · REPORT · QUESTION · ANSWER · PROPOSAL · ACKNOWLEDGE · ACCEPT · REJECT · DEFER · FYI · URGENT</td></tr>
    <tr><th>Format</th><td>YAML · 4 sections: meta + type-specific + narrative + statistics</td></tr>
    <tr><th>Threading</th><td>thread_id + reply_to</td></tr>
    <tr><th>SDK Types</th><td><code>IacmMessage&lt;T&gt;</code> · <code>IacmMeta</code> · per-type data interfaces</td></tr>
    <tr><th>SDK Plugin</th><td><code>IacmBotPlugin</code> — extends AimlBotPlugin with IACM flows</td></tr>
  </table>

  <!-- Quick reference de cada tipo -->
  <details>
    <summary>Message Type Quick Reference</summary>
    <!-- Tabla compacta con los 11 tipos: nombre, categoría, campos required -->
  </details>
</div>

<!-- Espacio para futuros protocolos -->
<div class="cutout" style="text-align:center;font-size:0.7rem;opacity:0.5;">
  More protocols will be added as the ecosystem grows.
</div>
```

### 3.3 Tipos TypeScript en `src/core/iacm-types.ts`

```typescript
// ─── Meta (común a todos los mensajes) ───

export const IACM_VERSION = "IACM/1.0" as const;

export type IacmMessageType =
  | "REQUEST" | "REPORT" | "QUESTION" | "ANSWER"
  | "PROPOSAL" | "ACKNOWLEDGE" | "ACCEPT" | "REJECT"
  | "DEFER" | "FYI" | "URGENT";

export type IacmPriority = "critical" | "high" | "medium" | "low";

export interface IacmMeta {
  format_version: typeof IACM_VERSION;
  message_type: IacmMessageType;
  from_agent: string;
  to_agent: string;
  timestamp: string; // ISO8601 UTC
  message_id: string;
  thread_id?: string;
  reply_to?: string;
}

// ─── Type-specific data ───

export interface IacmRequestData {
  task: string;
  context?: string;
  priority?: IacmPriority;
  deadline?: string;
  deliverables?: Array<{ deliverable: string; format?: string; location?: string }>;
  files_affected?: string[];
  estimated_effort_min?: number;
}

export interface IacmReportData {
  subject: string;
  report_type?: "completion" | "status" | "findings" | "analysis" | "incident";
  summary: string;
  findings?: string[];
  status?: "completed" | "in_progress" | "blocked" | "deferred" | "cancelled";
  deliverables_completed?: Array<{ deliverable: string; location?: string }>;
  next_steps?: Array<{ action: string; assignee?: string; priority?: IacmPriority }>;
}

export interface IacmQuestionData {
  question: string;
  context?: string;
  question_type?: "clarification" | "decision" | "information" | "validation" | "opinion";
  urgency?: IacmPriority;
  options?: Array<{ option: string; rationale?: string }>;
  deadline?: string;
  blocking?: boolean;
}

export interface IacmAnswerData {
  question_id: string;
  answer: string;
  answer_type?: "definitive" | "conditional" | "deferred" | "partial";
  confidence?: number;
  sources?: Array<{ source: string; type?: string; location?: string }>;
  recommendations?: string[];
}

export interface IacmProposalData {
  title: string;
  proposal_type?: "architecture" | "feature" | "process" | "policy" | "technical";
  summary: string;
  rationale: string;
  alternatives?: Array<{ option: string; pros?: string[]; cons?: string[] }>;
  decision_needed_by?: string;
  risks?: Array<{ risk: string; severity?: IacmPriority; mitigation?: string }>;
}

export interface IacmAcknowledgeData {
  acknowledged_message_id: string;
  confirmation: string;
  understood?: boolean;
  next_steps?: Array<{ step: string; eta?: string }>;
}

export interface IacmAcceptData {
  proposal_id: string;
  acceptance_type?: "unconditional" | "conditional" | "provisional";
  conditions?: string[];
  commitment: string;
  timeline?: { start_date?: string; target_completion?: string };
}

export interface IacmRejectData {
  proposal_id: string;
  rationale: string;
  concerns?: Array<{ concern: string; severity?: IacmPriority }>;
  alternative_suggested?: string;
  reconsideration_conditions?: string[];
}

export interface IacmDeferData {
  deferred_message_id: string;
  reason: string;
  missing_information?: Array<{ information: string; source?: string }>;
  revisit_date?: string;
}

export interface IacmFyiData {
  subject: string;
  information: string;
  relevance?: string;
  information_type?: "update" | "announcement" | "observation" | "insight" | "warning";
  action_required?: boolean;
  expiry_date?: string;
}

export interface IacmUrgentData {
  issue: string;
  severity: "critical" | "high" | "medium";
  urgency_reason: string;
  action_needed: string;
  action_needed_by: string;
  escalation_to?: string;
  blocking?: Array<{ blocked_entity: string; impact?: string }>;
}

// ─── Mapa de tipo → data shape ───

export interface IacmDataMap {
  REQUEST: IacmRequestData;
  REPORT: IacmReportData;
  QUESTION: IacmQuestionData;
  ANSWER: IacmAnswerData;
  PROPOSAL: IacmProposalData;
  ACKNOWLEDGE: IacmAcknowledgeData;
  ACCEPT: IacmAcceptData;
  REJECT: IacmRejectData;
  DEFER: IacmDeferData;
  FYI: IacmFyiData;
  URGENT: IacmUrgentData;
}

// ─── Mensaje completo (genérico sobre tipo) ───

export interface IacmMessage<T extends IacmMessageType = IacmMessageType> {
  meta: IacmMeta & { message_type: T };
  data: IacmDataMap[T];
  narrative: string;
  statistics?: Record<string, string | number>;
}

// ─── Utilidad: unión discriminada de todos los mensajes ───

export type AnyIacmMessage = {
  [K in IacmMessageType]: IacmMessage<K>;
}[IacmMessageType];

// ─── Variables IACM para el session state del motor AIML ───

export interface IacmSessionVars {
  /** Rol del agente en la conversación */
  agent_role?: string;
  /** Thread activo */
  active_thread_id?: string;
  /** Último message_id enviado */
  last_sent_message_id?: string;
  /** Último message_id recibido */
  last_received_message_id?: string;
  /** Estado del flujo activo */
  flow_state?: "idle" | "awaiting_response" | "awaiting_confirmation" | "processing";
  /** Tipo del último mensaje recibido */
  last_received_type?: IacmMessageType;
  /** Agente interlocutor */
  interlocutor?: string;
}
```

### 3.4 Builders de mensajes en `src/core/iacm-templates.ts`

```typescript
/**
 * Genera un message_id siguiendo la convención IACM.
 * Format: <type-prefix>-<slug>-<timestamp>
 */
export function generateMessageId(type: IacmMessageType, slug?: string): string;

/**
 * Genera un timestamp ISO8601 UTC.
 */
export function iacmTimestamp(): string;

/**
 * Builder genérico: construye un IacmMessage completo.
 */
export function buildIacmMessage<T extends IacmMessageType>(
  type: T,
  from: string,
  to: string,
  data: IacmDataMap[T],
  narrative: string,
  options?: {
    thread_id?: string;
    reply_to?: string;
    statistics?: Record<string, string | number>;
  },
): IacmMessage<T>;

/**
 * Builders específicos por tipo (syntactic sugar).
 * Cada uno valida los campos required del tipo.
 */
export function buildRequest(from: string, to: string, data: IacmRequestData, narrative: string, opts?: BuildOptions): IacmMessage<"REQUEST">;
export function buildReport(from: string, to: string, data: IacmReportData, narrative: string, opts?: BuildOptions): IacmMessage<"REPORT">;
export function buildQuestion(from: string, to: string, data: IacmQuestionData, narrative: string, opts?: BuildOptions): IacmMessage<"QUESTION">;
export function buildAnswer(from: string, to: string, data: IacmAnswerData, narrative: string, opts?: BuildOptions): IacmMessage<"ANSWER">;
export function buildProposal(from: string, to: string, data: IacmProposalData, narrative: string, opts?: BuildOptions): IacmMessage<"PROPOSAL">;
export function buildAcknowledge(from: string, to: string, data: IacmAcknowledgeData, narrative: string, opts?: BuildOptions): IacmMessage<"ACKNOWLEDGE">;
export function buildAccept(from: string, to: string, data: IacmAcceptData, narrative: string, opts?: BuildOptions): IacmMessage<"ACCEPT">;
export function buildReject(from: string, to: string, data: IacmRejectData, narrative: string, opts?: BuildOptions): IacmMessage<"REJECT">;
export function buildDefer(from: string, to: string, data: IacmDeferData, narrative: string, opts?: BuildOptions): IacmMessage<"DEFER">;
export function buildFyi(from: string, to: string, data: IacmFyiData, narrative: string, opts?: BuildOptions): IacmMessage<"FYI">;
export function buildUrgent(from: string, to: string, data: IacmUrgentData, narrative: string, opts?: BuildOptions): IacmMessage<"URGENT">;

type BuildOptions = {
  thread_id?: string;
  reply_to?: string;
  statistics?: Record<string, string | number>;
};

/**
 * Serializa un IacmMessage a texto legible para enviar al grupo.
 * Formato compacto: [TYPE] from → to | narrative
 * El JSON estructurado va como attachment invisible (o metadata).
 */
export function formatIacmForChat<T extends IacmMessageType>(msg: IacmMessage<T>): string;

/**
 * Serializa a YAML (formato canónico IACM).
 */
export function toIacmYaml<T extends IacmMessageType>(msg: IacmMessage<T>): string;
```

### 3.5 Parser en `src/core/iacm-parser.ts`

```typescript
/**
 * Resultado de parsear un mensaje entrante.
 */
export interface ParseResult<T extends IacmMessageType = IacmMessageType> {
  success: boolean;
  message?: IacmMessage<T>;
  errors?: string[];
}

/**
 * Intenta parsear un string (YAML o formato chat) como IacmMessage.
 * Modo lenient: acepta mensajes con campos opcionales faltantes.
 * Modo strict: rechaza si faltan campos required.
 */
export function parseIacmMessage(
  input: string,
  mode?: "strict" | "lenient",
): ParseResult;

/**
 * Valida un IacmMessage ya construido contra las reglas del schema.
 * Retorna array vacío si válido, o lista de errores.
 */
export function validateIacmMessage(msg: AnyIacmMessage): string[];

/**
 * Detecta si un texto contiene un mensaje IACM embebido.
 * Útil para el motor AIML: si alguien envía un mensaje IACM al chat,
 * el bot puede detectarlo y procesarlo como protocolo en vez de texto libre.
 */
export function detectsIacmMessage(text: string): boolean;
```

### 3.6 Categorías AIML para IACM en `src/core/iacm-categories.ts`

Aquí es donde AIML y IACM se coordinan. Las categorías clasifican mensajes IACM entrantes como **intents tipados** (`iacm.*`). **No producen texto** — producen `IntentResult` que los handlers de protocolo (§3.7) consumen.

```typescript
import type { AimlCategory, IntentResult } from "./aiml-types.js";
import type { IacmSessionVars } from "./iacm-types.js";

// ─── Intents IACM: nombres estandarizados ───

export const IACM_INTENTS = {
  // Directivos entrantes
  REQUEST_RECEIVED: "iacm.request.received",
  QUESTION_RECEIVED: "iacm.question.received",
  // Informativos entrantes
  REPORT_RECEIVED: "iacm.report.received",
  ANSWER_RECEIVED: "iacm.answer.received",
  FYI_RECEIVED: "iacm.fyi.received",
  // Compromisivos entrantes
  PROPOSAL_RECEIVED: "iacm.proposal.received",
  ACCEPT_RECEIVED: "iacm.accept.received",
  REJECT_RECEIVED: "iacm.reject.received",
  DEFER_RECEIVED: "iacm.defer.received",
  // Cierre
  ACK_RECEIVED: "iacm.acknowledge.received",
  // Escalación
  URGENT_RECEIVED: "iacm.urgent.received",
  // Comandos salientes
  SEND_REQUEST: "iacm.send.request",
  SEND_QUESTION: "iacm.send.question",
  SEND_REPORT: "iacm.send.report",
  SEND_FYI: "iacm.send.fyi",
  SEND_URGENT: "iacm.send.urgent",
} as const;

/**
 * Categorías de recepción: detectan mensajes IACM entrantes → IntentResult.
 * NO producen texto — solo clasifican.
 */
export function getIacmCategories(): AimlCategory<IacmSessionVars>[];

/**
 * Categorías de comando: detectan /xx_request, /xx_question, etc. → IntentResult.
 * El handler downstream construye el mensaje IACM saliente.
 */
export function getIacmCommandCategories(): AimlCategory<IacmSessionVars>[];

/**
 * Todas las categorías IACM (recibir + enviar).
 */
export function getAllIacmCategories(): AimlCategory<IacmSessionVars>[];
```

**Detalle de las categorías clave — nótese: resolver produce IntentResult, NO texto:**

```typescript
// Ejemplo: detectar REQUEST entrante → intent iacm.request.received
{
  id: "iacm-request-in",
  pattern: /^\[REQUEST\]\s+(\S+)\s*→\s*(\S+)/i,
  resolver: (vars, stars, ctx) => ({
    intent: IACM_INTENTS.REQUEST_RECEIVED,
    confidence: 1.0,
    entities: { from_agent: stars[0], to_agent: stars[1] },
    stars,
    originalInput: ctx.text,
    route: "iacm.flow.request",  // sugiere al handler qué state machine activar
  }),
  sideEffect: (vars, stars) => {
    vars.last_received_type = "REQUEST";
    vars.interlocutor = stars[0];
  },
  priority: 8, // Alta — protocolo tiene prioridad sobre chat libre
}

// Ejemplo: detectar QUESTION con opciones → intent iacm.question.received
{
  id: "iacm-question-in",
  pattern: /^\[QUESTION\].*options?:/i,
  resolver: (vars, stars, ctx) => ({
    intent: IACM_INTENTS.QUESTION_RECEIVED,
    confidence: 1.0,
    entities: {},
    stars,
    originalInput: ctx.text,
    route: "iacm.flow.question",
  }),
  sideEffect: (vars) => { vars.flow_state = "awaiting_response"; },
  priority: 8,
}

// Ejemplo: comando /xx_request → intent iacm.send.request
{
  id: "iacm-cmd-request",
  pattern: /^\/\w+_request\s+(.+)/i,
  resolver: (vars, stars, ctx) => ({
    intent: IACM_INTENTS.SEND_REQUEST,
    confidence: 1.0,
    entities: { task: stars[0] },
    stars,
    originalInput: ctx.text,
  }),
  priority: 9,
}
```

### 3.7 Handlers de protocolo en `src/core/iacm-protocol-handlers.ts`

**Nuevo archivo.** Contiene los `IntentHandler[]` que consumen los intents `iacm.*` y ejecutan las transiciones del protocolo.

```typescript
import type { IntentHandler, IntentResult } from "./aiml-types.js";
import type { IacmSessionVars, IacmMessageType } from "./iacm-types.js";
import { buildRequest, buildAcknowledge, formatIacmForChat } from "./iacm-templates.js";
import { parseIacmMessage } from "./iacm-parser.js";
import { IACM_INTENTS } from "./iacm-categories.js";

/**
 * Álgebra de flujos IACM conocidos.
 * Cada flujo define qué transiciones son válidas:
 *
 *   REQUEST → ACK → PROCESS → REPORT
 *   QUESTION → ANSWER
 *   PROPOSAL → ACCEPT | REJECT | DEFER
 *   URGENT → ACK (inmediato) + escalación
 *   FYI → (opcional) ACK
 *   REPORT → ACK
 *
 * Los handlers implementan estas transiciones.
 */

/**
 * Handler principal de protocolo IACM.
 * Consume intents iacm.* y ejecuta la transición correcta.
 * Retorna el texto de respuesta (o undefined si no es un intent IACM).
 */
export function iacmProtocolHandler(): IntentHandler<IacmSessionVars> {
  return (intent, vars, ctx) => {
    // Solo maneja intents iacm.*
    if (!intent.intent.startsWith("iacm.")) return undefined;

    switch (intent.intent) {
      // ─── Recepción ───
      case IACM_INTENTS.REQUEST_RECEIVED:
        return handleRequestReceived(intent, vars);
      case IACM_INTENTS.QUESTION_RECEIVED:
        return handleQuestionReceived(intent, vars);
      case IACM_INTENTS.URGENT_RECEIVED:
        return handleUrgentReceived(intent, vars);
      case IACM_INTENTS.PROPOSAL_RECEIVED:
        return handleProposalReceived(intent, vars);
      case IACM_INTENTS.REPORT_RECEIVED:
      case IACM_INTENTS.FYI_RECEIVED:
      case IACM_INTENTS.ANSWER_RECEIVED:
        return handleInfoReceived(intent, vars);
      case IACM_INTENTS.ACK_RECEIVED:
      case IACM_INTENTS.ACCEPT_RECEIVED:
      case IACM_INTENTS.REJECT_RECEIVED:
      case IACM_INTENTS.DEFER_RECEIVED:
        return handleClosureReceived(intent, vars);

      // ─── Envío (comandos) ───
      case IACM_INTENTS.SEND_REQUEST:
        return handleSendRequest(intent, vars);
      case IACM_INTENTS.SEND_QUESTION:
        return handleSendQuestion(intent, vars);
      case IACM_INTENTS.SEND_REPORT:
        return handleSendReport(intent, vars);
      case IACM_INTENTS.SEND_FYI:
        return handleSendFyi(intent, vars);
      case IACM_INTENTS.SEND_URGENT:
        return handleSendUrgent(intent, vars);

      default:
        return undefined; // intent iacm.* desconocido → next handler
    }
  };
}

// ─── Handlers de recepción (implementan las transiciones) ───

function handleRequestReceived(
  intent: IntentResult,
  vars: IacmSessionVars,
): string {
  vars.flow_state = "processing";
  const from = intent.entities.from_agent ?? "unknown";
  // Transición: REQUEST → ACK automático
  const ack = buildAcknowledge(
    vars.agent_role ?? "bot",
    from,
    { acknowledged_message_id: intent.matchedCategoryId ?? "", confirmation: "Received" },
    `Acknowledged request from ${from}.`,
  );
  return `📋 REQUEST de ${from} recibido.\n${formatIacmForChat(ack)}\n\n⏳ Procesando...`;
}

function handleQuestionReceived(
  intent: IntentResult,
  vars: IacmSessionVars,
): string {
  vars.flow_state = "awaiting_response";
  return "📝 Pregunta recibida. Evaluando opciones...";
}

function handleUrgentReceived(
  intent: IntentResult,
  vars: IacmSessionVars,
): string {
  // Transición: URGENT → ACK inmediato
  vars.flow_state = "processing";
  return "🚨 URGENTE recibido. ACK enviado. Escalando...";
}

function handleProposalReceived(
  intent: IntentResult,
  vars: IacmSessionVars,
): string {
  vars.flow_state = "awaiting_confirmation";
  return "🤝 Propuesta recibida. Pendiente: ACCEPT / REJECT / DEFER.";
}

function handleInfoReceived(
  intent: IntentResult,
  vars: IacmSessionVars,
): string {
  // REPORT, FYI, ANSWER → registro, no cambian flow_state
  return `📊 ${intent.intent.split(".")[1].toUpperCase()} recibido y registrado.`;
}

function handleClosureReceived(
  intent: IntentResult,
  vars: IacmSessionVars,
): string {
  // ACK, ACCEPT, REJECT, DEFER → cierre de flujo
  vars.flow_state = "idle";
  const type = intent.intent.split(".")[1].toUpperCase();
  return `✅ ${type} recibido. Flujo cerrado.`;
}

// ─── Handlers de envío (construyen mensajes IACM salientes) ───

function handleSendRequest(
  intent: IntentResult,
  vars: IacmSessionVars,
): string {
  const msg = buildRequest(
    vars.agent_role ?? "bot",
    vars.interlocutor ?? "all",
    { task: intent.entities.task ?? intent.originalInput, priority: "medium" },
    intent.entities.task ?? intent.originalInput,
  );
  vars.flow_state = "awaiting_response";
  return formatIacmForChat(msg);
}

// handleSendQuestion, handleSendReport, etc. siguen el mismo patrón
```

**El handler es un plugin de handlers, no de categories.** Las categories (§3.6) clasifican; el handler (§3.7) ejecuta.

### 3.8 Plugin base `IacmBotPlugin` en `src/core/iacm-bot-plugin.ts`

```typescript
import { AimlBotPlugin } from "./aiml-bot-plugin.js";
import type { AimlCategory, IntentEngineOptions, IntentHandler, IntentResult, MessageContext } from "./aiml-types.js";
import type { IacmSessionVars, IacmMessageType } from "./iacm-types.js";
import { getAllIacmCategories } from "./iacm-categories.js";
import { iacmProtocolHandler } from "./iacm-protocol-handlers.js";
import type { CommandDefinition, MenuDefinition } from "./bot-handler.js";

/**
 * Plugin base para bots que participan en comunicación inter-agente IACM.
 *
 * Extiende AimlBotPlugin con:
 * - Categorías AIML que clasifican mensajes IACM → intents iacm.*
 * - Handlers de protocolo que consumen intents → transiciones de estado → respuesta
 * - Comandos para enviar cada tipo de mensaje
 * - Menú con los tipos de mensaje disponibles
 *
 * Pipeline completo:
 *   input → categories IACM → IntentResult { iacm.* }
 *         → iacmProtocolHandler → state machine → respuesta
 *         → domain handlers del developer (si no es intent IACM)
 *
 * El developer hereda y puede:
 * - Añadir categories + handlers de dominio (se ejecutan después del protocol handler)
 * - Override de comandos/menus para customizar
 * - Extender IacmSessionVars con variables propias
 */
export abstract class IacmBotPlugin<
  TVars extends IacmSessionVars = IacmSessionVars,
> extends AimlBotPlugin<TVars> {

  constructor(options?: IntentEngineOptions) {
    super(options);
  }

  /**
   * Categorías: IACM base (patterns → intents iacm.*) + las del developer.
   * Override en subclase para añadir categorías de dominio:
   *
   *   categories() {
   *     return [...super.categories(), ...misCategoriasCustom];
   *   }
   */
  categories(): AimlCategory<TVars>[] {
    return getAllIacmCategories() as AimlCategory<TVars>[];
  }

  /**
   * Handlers: protocol handler IACM PRIMERO + los del developer.
   *
   * El protocol handler consume intents iacm.* y ejecuta transiciones.
   * Los handlers del developer se ejecutan para intents no-IACM
   * (o si el protocol handler retorna undefined para un intent que no reconoce).
   *
   * Override en subclase para añadir handlers de dominio:
   *
   *   handlers() {
   *     return [...super.handlers(), ...misDomainHandlers];
   *   }
   */
  handlers(): IntentHandler<TVars>[] {
    return [
      iacmProtocolHandler() as IntentHandler<TVars>,
    ];
  }

  /**
   * Variables de sesión IACM por defecto.
   * Override para añadir variables de dominio:
   *
   *   defaultVars() {
   *     return { ...super.defaultVars(), myCustomVar: "value" };
   *   }
   */
  defaultVars(): TVars {
    return {
      agent_role: this.name,
      flow_state: "idle",
    } as TVars;
  }

  /**
   * Respuesta si ni el protocol handler ni los domain handlers responden.
   */
  fallbackResponse(intent: IntentResult, _ctx: MessageContext): string {
    if (intent.intent === "unmatched") return "";
    return `⚠️ Intent ${intent.intent} sin handler.`;
  }

  /**
   * Comandos IACM: enviar cada tipo de mensaje + reset + status.
   * Override para añadir comandos de dominio.
   */
  commands(): CommandDefinition[] {
    return [
      ...super.commands(), // /reset de AimlBotPlugin

      // ─── Comandos para enviar mensajes IACM ───
      {
        command: "request",
        description: "Send a REQUEST message",
        buildText: (ctx) => this.delegateToOnMessage("REQUEST", ctx),
      },
      {
        command: "report",
        description: "Send a REPORT message",
        buildText: (ctx) => this.delegateToOnMessage("REPORT", ctx),
      },
      {
        command: "question",
        description: "Send a QUESTION message",
        buildText: (ctx) => this.delegateToOnMessage("QUESTION", ctx),
      },
      {
        command: "answer",
        description: "Send an ANSWER message",
        buildText: (ctx) => this.delegateToOnMessage("ANSWER", ctx),
      },
      {
        command: "fyi",
        description: "Send an FYI message",
        buildText: (ctx) => this.delegateToOnMessage("FYI", ctx),
      },
      {
        command: "urgent",
        description: "Send an URGENT message",
        buildText: (ctx) => this.delegateToOnMessage("URGENT", ctx),
      },

      // ─── Info ───
      {
        command: "protocol",
        description: "Show IACM protocol summary",
        buildText: () => this.protocolSummary(),
      },
      {
        command: "status",
        description: "Show current conversation state",
        buildText: (ctx) => this.conversationStatus(ctx),
      },
    ];
  }

  /**
   * Menú con tipos de mensaje IACM.
   */
  menus(): MenuDefinition[] {
    return [
      {
        command: "iacm",
        description: "IACM Protocol Menu",
        entryPage: "types",
        pages: [
          {
            id: "types",
            text: "<b>IACM Message Types</b>\n\nSelect a category:",
            buttons: [
              { label: "📋 Directives", goTo: "directives" },
              { label: "📊 Informative", goTo: "informative" },
              { label: "🤝 Commitments", goTo: "commitments" },
            ],
          },
          {
            id: "directives",
            text: "<b>Directive Messages</b>\n\n<code>/request</code> — Request action\n<code>/question</code> — Ask for info",
            buttons: [{ label: "< Back", goTo: "types" }],
          },
          {
            id: "informative",
            text: "<b>Informative Messages</b>\n\n<code>/report</code> — Status report\n<code>/answer</code> — Reply to question\n<code>/fyi</code> — For your info",
            buttons: [{ label: "< Back", goTo: "types" }],
          },
          {
            id: "commitments",
            text: "<b>Commitment Messages</b>\n\n<i>PROPOSAL, ACCEPT, REJECT, DEFER — triggered via conversation flow</i>",
            buttons: [{ label: "< Back", goTo: "types" }],
          },
        ],
      },
    ];
  }

  // ─── Métodos protegidos (overrideable) ───

  /** Delega un comando IACM al pipeline (para que el engine lo clasifique). */
  protected delegateToOnMessage(_type: IacmMessageType, ctx: any): string | Promise<string> {
    const text = ctx.message?.text ?? "";
    const args = text.split(/\s+/).slice(1).join(" ");
    if (!args) return `Usage: /${this.pluginCode}_${_type.toLowerCase()} <message>`;
    return this.onMessage(ctx);
  }

  protected protocolSummary(): string {
    return [
      "📡 <b>IACM v1.0 Protocol</b>",
      "",
      "Directives: REQUEST · QUESTION",
      "Informative: REPORT · ANSWER · FYI",
      "Commitments: PROPOSAL · ACCEPT · REJECT · DEFER",
      "Closure: ACKNOWLEDGE",
      "Escalation: URGENT",
      "",
      "Pipeline: input → classify (AIML) → IntentResult → protocol handler → response",
      "",
      `Use <code>/${this.pluginCode}_protocol</code> for this summary.`,
      `Use <code>/${this.pluginCode}_iacm</code> for the interactive menu.`,
    ].join("\n");
  }

  protected conversationStatus(ctx: any): string {
    const chatId = ctx.chat?.id ?? 0;
    const state = this.engine.getState(chatId);
    if (!state) return "No active conversation state.";
    return [
      "📊 <b>Conversation State</b>",
      `Agent role: ${state.vars.agent_role ?? "—"}`,
      `Flow: ${state.vars.flow_state ?? "idle"}`,
      `Topic: ${state.topic ?? "global"}`,
      `Thread: ${state.vars.active_thread_id ?? "—"}`,
      `Interlocutor: ${state.vars.interlocutor ?? "—"}`,
      `Last intent: ${state.lastIntent?.intent ?? "—"}`,
      `History: ${state.history.length} turns`,
    ].join("\n");
  }
}
```
```

### 3.9 Patrón de herencia completo (4 niveles)

```
┌──────────────────────────────────────────────────────────────────┐
│  Nivel 1 · SDK: BotPlugin interface                              │
│  commands(), menus(), onMessage()                                │
├──────────────────────────────────────────────────────────────────┤
│  Nivel 2 · SDK: AimlBotPlugin<TVars>              ← SDS-16      │
│  + IntentEngine: classify input → IntentResult                   │
│  + Handler pipeline: IntentResult → respuesta                    │
│  + categories(), handlers(), defaultVars()                       │
├──────────────────────────────────────────────────────────────────┤
│  Nivel 3 · SDK: IacmBotPlugin<TVars>              ← SDS-17      │
│  + IACM categories (patterns → intents iacm.*)                   │
│  + Protocol handler (iacm.* intents → state machine → response)  │
│  + IACM commands, IACM menu                                      │
│  + builders + formatters de mensajes salientes                   │
├──────────────────────────────────────────────────────────────────┤
│  Nivel 4 · APP: MyBot extends IacmBotPlugin<MyVars>              │
│  + categories() de dominio (concatenadas con IACM)               │
│  + handlers() de dominio (ejecutados después del protocol handler)│
│  + defaultVars() extendidas                                      │
│  + commands() / menus() adicionales                              │
└──────────────────────────────────────────────────────────────────┘
```

### 3.10 Ejemplo: app extends IacmBotPlugin

```typescript
// examples/console-app/coordinator-bot.ts
import {
  IacmBotPlugin,
  type AimlCategory, type IntentHandler, type CommandDefinition,
} from "heteronimos-semi-asistidos-sdk";

interface CoordinatorVars {
  // Hereda todo de IacmSessionVars +
  team_name?: string;
  sprint_active?: string;
}

export class CoordinatorBot extends IacmBotPlugin<CoordinatorVars> {
  name = "coordinator";
  pluginCode = "co";

  defaultVars(): CoordinatorVars {
    return {
      ...super.defaultVars(),
      team_name: undefined,
      sprint_active: "false",
    };
  }

  // Stage 1: domain categories (se añaden a las IACM)
  categories(): AimlCategory<CoordinatorVars>[] {
    return [
      ...super.categories(), // Todas las IACM categories

      // Categoría custom: "sprint start" → intent domain
      {
        id: "sprint-start",
        pattern: /^sprint start$/i,
        resolver: (vars, stars, ctx) => ({
          intent: "domain.sprint.start",
          confidence: 1,
          entities: { team: vars.team_name ?? "unnamed" },
          stars: [],
          originalInput: ctx.text,
        }),
        sideEffect: (vars) => { vars.sprint_active = "true"; },
      },
    ];
  }

  // Stage 2: domain handlers (se ejecutan después del protocol handler)
  handlers(): IntentHandler<CoordinatorVars>[] {
    return [
      ...super.handlers(), // Protocol handler IACM primero

      // Domain handler: sprint intents
      (intent, vars) => {
        if (intent.intent === "domain.sprint.start")
          return `🏃 Sprint started for team ${vars.team_name ?? "unnamed"}!`;
        return undefined;
      },
    ];
  }

  commands(): CommandDefinition[] {
    return [
      ...super.commands(), // Todos los IACM commands + /reset

      {
        command: "team",
        description: "Set team name",
        buildText: (ctx) => {
          const name = (ctx.message?.text ?? "").split(" ").slice(1).join(" ");
          if (!name) return "Usage: /co_team <name>";
          this.engine.setVar(ctx.chat?.id ?? 0, "team_name", name);
          return `Team set to: ${name}`;
        },
      },
    ];
  }
}
```

### 3.11 Exports del barrel (`src/index.ts`)

```typescript
// --- IACM Protocol ---
export type {
  IacmMessageType, IacmPriority, IacmMeta, IacmMessage, AnyIacmMessage,
  IacmDataMap, IacmSessionVars,
  IacmRequestData, IacmReportData, IacmQuestionData, IacmAnswerData,
  IacmProposalData, IacmAcknowledgeData, IacmAcceptData, IacmRejectData,
  IacmDeferData, IacmFyiData, IacmUrgentData,
} from "./core/iacm-types.js";
export { IACM_VERSION } from "./core/iacm-types.js";

export {
  buildIacmMessage, buildRequest, buildReport, buildQuestion, buildAnswer,
  buildProposal, buildAcknowledge, buildAccept, buildReject, buildDefer,
  buildFyi, buildUrgent, generateMessageId, iacmTimestamp,
  formatIacmForChat, toIacmYaml,
} from "./core/iacm-templates.js";

export type { ParseResult } from "./core/iacm-parser.js";
export { parseIacmMessage, validateIacmMessage, detectsIacmMessage } from "./core/iacm-parser.js";

export { getAllIacmCategories, getIacmCategories, getIacmCommandCategories, IACM_INTENTS } from "./core/iacm-categories.js";
export { iacmProtocolHandler } from "./core/iacm-protocol-handlers.js";

export { IacmBotPlugin } from "./core/iacm-bot-plugin.js";
```

---

## 4. Cambios por archivo

| Archivo | Cambio | Nuevo |
|---------|--------|-------|
| `protocols/IACM_FORMAT_SPECIFICATION.md` | Movido desde `templates/` | ✅† |
| `docs/protocols.html` | Página GH Pages con link a spec | ✅ |
| `docs/index.html` | Añadir card "Protocols" con link a `protocols.html` | — |
| `src/core/iacm-types.ts` | Tipos TS de los 11 message types + meta + session vars | ✅ |
| `src/core/iacm-templates.ts` | Builders + formatters de mensajes | ✅ |
| `src/core/iacm-parser.ts` | Parser + validator | ✅ |
| `src/core/iacm-categories.ts` | Categorías AIML: patterns → intents `iacm.*` (NO texto) + `IACM_INTENTS` | ✅ |
| `src/core/iacm-protocol-handlers.ts` | Handlers: intents `iacm.*` → state machine → respuesta | ✅ |
| `src/core/iacm-bot-plugin.ts` | Plugin base `IacmBotPlugin` con pipeline IACM | ✅ |
| `src/index.ts` | Exportar todos los nuevos tipos, handlers y funciones | — |
| `tests/iacm-types.test.ts` | Tests de tipos y IacmMessage genérico | ✅ |
| `tests/iacm-templates.test.ts` | Tests de builders, messageId, timestamp, formatForChat, toYaml | ✅ |
| `tests/iacm-parser.test.ts` | Tests de parse (strict/lenient), validate, detect | ✅ |
| `tests/iacm-categories.test.ts` | Tests de categorías: patterns → IntentResult con intent iacm.* | ✅ |
| `tests/iacm-protocol-handlers.test.ts` | Tests de handlers: REQUEST→ACK, QUESTION→response, URGENT→escalate, state transitions | ✅ |
| `tests/iacm-bot-plugin.test.ts` | Tests: full pipeline, commands, menus, onMessage, extends funciona | ✅ |
| `tests/barrel.test.ts` | Nuevos exports existen | — |

> † `templates/IACM_FORMAT_SPECIFICATION.md` se mueve, no se elimina (git detecta el rename).

---

## 5. Criterios de aceptación

### Protocolo & docs
1. `protocols/IACM_FORMAT_SPECIFICATION.md` existe y tiene el contenido íntegro.
2. `docs/protocols.html` es navegable, sigue el estilo fanzine, y enlaza al `.md` en GitHub.
3. `docs/index.html` tiene una card "Protocols" que enlaza a `protocols.html`.
4. La spec no se duplica — solo un enlace DRY.

### Tipos
5. `IacmMessage<"REQUEST">` tiene type-safety: `msg.data.task` existe, `msg.data.severity` no.
6. Los 11 tipos de datos están definidos con campos required/optional según la spec IACM.
7. `AnyIacmMessage` es una unión discriminada por `meta.message_type`.

### Builders & parser
8. `buildRequest(...)` genera un mensaje con `meta.format_version === "IACM/1.0"`.
9. `generateMessageId("REQUEST")` produce un ID kebab-case con prefijo `req-`.
10. `parseIacmMessage(yaml)` parsea un YAML válido a `IacmMessage`.
11. `validateIacmMessage(msg)` retorna `[]` para un mensaje válido y errores descriptivos para uno inválido.
12. `formatIacmForChat(msg)` produce un string legible para enviar al grupo de Telegram.

### Plugin base & pipeline
13. `IacmBotPlugin` implementa `BotPlugin` — `registerPlugins` la acepta sin cambios.
14. Las categorías IACM producen `IntentResult` con intents `iacm.*`, no texto.
15. El `iacmProtocolHandler` consume intents `iacm.*` y ejecuta transiciones de protocolo → texto.
16. Un bot que hereda de `IacmBotPlugin` tiene los comandos IACM (`/xx_request`, `/xx_question`, etc.) automáticamente.
17. El menú `/xx_iacm` muestra los tipos de mensaje organizados.
18. `onMessage` ejecuta el pipeline completo: classify (IACM categories) → IntentResult → protocol handler → response.
19. El developer puede añadir categories Y handlers propios concatenando `super.categories()` y `super.handlers()`.
20. Los handlers del developer se ejecutan DESPUÉS del protocol handler (protocol tiene prioridad).

### Integración
21. Las dos example apps pueden extender `IacmBotPlugin` (se verifica en tests, no se migra RabbitBot).
22. Full test suite verde.

---

## 6. Tests

| Suite | Tests |
|-------|-------|
| `iacm-types.test.ts` | IacmMessage genérico: discriminación por tipo, acceso a data, IacmSessionVars shape |
| `iacm-templates.test.ts` | generateMessageId formato correcto; iacmTimestamp ISO8601; buildRequest campos; formatIacmForChat legible; toIacmYaml parseable |
| `iacm-parser.test.ts` | parseIacmMessage strict/lenient; validateIacmMessage required fields; detectsIacmMessage true/false; round-trip build→yaml→parse |
| `iacm-categories.test.ts` | REQUEST pattern → IntentResult `iacm.request.received`; QUESTION → `iacm.question.received`; command /request → `iacm.send.request`; entities extracted; sideEffects update vars |
| `iacm-protocol-handlers.test.ts` | REQUEST intent → ACK + flow_state change; QUESTION intent → response; URGENT → escalate; PROPOSAL → awaiting_confirmation; send-request → formatIacmForChat; unknown intent → undefined |
| `iacm-bot-plugin.test.ts` | Full pipeline: input → classify → handler → response; commands include IACM + reset; menus include /iacm; extends adds categories + handlers; registerPlugins accepts; domain handler runs after protocol |
| `barrel.test.ts` | Todos los nuevos exports: `IACM_INTENTS`, `iacmProtocolHandler`, `IacmBotPlugin`, etc. |

---

## 7. Notas de diseño

### Categorías → IntentResult, no texto

Las categorías IACM (§3.6) producen `IntentResult` con intents como `iacm.request.received`. **No producen texto de respuesta.** El texto lo genera el protocol handler (§3.7), que implementa la álgebra conocida del protocolo:

```
categoría:  [REQUEST] agent_x → bot  →  IntentResult { intent: "iacm.request.received", entities: { from: "agent_x" } }
handler:    iacm.request.received    →  ACK automático + flow_state = "processing" + "📋 REQUEST recibido..."
```

Esto permite:
- **Testear clasificación sin testear respuestas** (categories tests ≠ handler tests)
- **Reutilizar el protocol handler** en bots con categories diferentes
- **Override selectivo**: un bot puede redefinir cómo responde a un REQUEST sin cambiar cómo lo detecta

### Álgebra de flujos IACM

Los flujos son estados conocidos con transiciones válidas:

```
REQUEST  → ACK → PROCESS → REPORT
QUESTION → ANSWER
PROPOSAL → ACCEPT | REJECT | DEFER
URGENT   → ACK (inmediato) + escalación
FYI      → (opcional) ACK
REPORT   → ACK
```

El protocol handler implementa estas transiciones. Si un intent llega en un estado inválido (ej: ACCEPT sin PROPOSAL previa), el handler lo detecta y responde con un error de protocolo.

### YAML sin dependencia

Para `toIacmYaml()` y `parseIacmMessage()` NO añadimos `js-yaml` como dependencia. Usamos:
- **Serialización:** template literals con indentación (YAML es un subset de text que podemos generar sin librería para nuestro schema fijo).
- **Parsing:** regex-based para el schema fijo de IACM (sabemos la estructura exacta). Si el schema crece, se añade `js-yaml` como peerDependency opcional en v1.1.

### Formato de chat vs YAML

En un grupo de Telegram, enviar YAML puro es ilegible. El `formatIacmForChat()` genera un formato compacto:

```
[REQUEST] coordinator → documenter
📋 Document authentication flow
Priority: high · Deadline: 2026-02-15
─── ─── ───
Please document the new auth flow implemented in Sprint 12.
```

El YAML completo queda disponible como dato estructurado en el `RuntimeEmitter` (para dashboards, analytics).

### Convivencia con bots no-IACM

`IacmBotPlugin` es **opt-in**: solo los bots que hereden de él hablan IACM. Un `RabbitBot` que implementa `BotPlugin` directamente sigue funcionando sin cambios. Ambos tipos de bot pueden convivir en el mismo grupo — el motor AIML del `IacmBotPlugin` simplemente no matchea mensajes que no siguen el formato IACM (caen al fallback).

### Migración futura de plataforma

Los tipos IACM (`IacmMessage`, `IacmMeta`, etc.) son **platform-agnostic** — no referencian Telegram ni grammY. El `MessageContext` de SDS-16 abstrae la plataforma. Si migramos de Telegram a Matrix/Discord/custom:
- Los tipos IACM no cambian.
- Las categorías AIML no cambian.
- Solo cambia el adapter `onMessage()` que construye `MessageContext` desde el contexto de la nueva plataforma.
