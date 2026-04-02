# SDS-09 · Capa de UI Bridge en el SDK

> **heteronimos-semi-asistidos-sdk** · Software Design Specification
> Estado: DRAFT · target: v0.3.0

---

## 1. Objetivo

Extraer las piezas genéricas de `examples/dashboard/` que cualquier consumidor con UI necesitaría y moverlas al SDK como una **capa de UI bridge**: un mini-store reactivo, un bridge estándar RuntimeEmitter→Store, y los tipos de entrada de buffer (`LogEntry`, `MessageEntry`).

**Por qué:**

- **DRY.** `store.ts` (30 líneas) y la lógica central de `emitter-bridge.ts` (switch/case sobre `RuntimeEvent`) se necesitan en cualquier app que consuma el emitter — Ink, web, Electron, MCP view. Mantenerlas solo en `examples/` condenaba a cada consumidor a copiarlas.
- **Dos arquetipos de app.** El SDK ya soporta implícitamente dos modos de uso: _headless_ (`bootBot()` sin emitter) e _interactive_ (`bootBot()` + emitter + UI). Subir el bridge formaliza el segundo arquetipo como capacidad del SDK, no como accidente del ejemplo.
- **Tipos compartidos.** `LogEntry` y `MessageEntry` son representaciones UI de los `RuntimeEvent` que ya exportamos. Forzar a cada consumidor a redeclararlas rompe la garantía de tipos del barrel.
- **No es over-engineering.** Son ~100 líneas de código probado que ya existe. No se inventa nada nuevo; se reubica.

**Por qué ahora (y no antes):**

- Sprint 4d (SDS-08) estabilizó los examples como paquetes independientes. Ahora podemos mover piezas sin romper la independencia de ejemplos.
- `RuntimeEmitter` ya migró a RxJS (SDS-06). El bridge depende de `events$.subscribe()` que es API estable.

---

## 2. Análisis de duplicación actual

### 2.1 Archivos idénticos entre examples

| Archivo | console-app | dashboard | Acción |
|---------|-------------|-----------|--------|
| `config.ts` | ✅ 14 líneas | ✅ 14 líneas (idéntico) | Mantener duplicado — es app-specific por decisión SDS-08 §3.2 |
| `rabbit-bot.ts` | ✅ ~130 líneas | ✅ idéntico | Mantener duplicado — misma razón |

Estos archivos **no se mueven**. La duplicación es intencional: cada ejemplo debe ser autocontenido y copiable.

### 2.2 Código en dashboard reutilizable por cualquier consumidor con UI

| Archivo | Líneas | ¿Genérico? | Acción |
|---------|--------|------------|--------|
| `store.ts` | 30 | **Sí** — `Store<T>` es puro, sin deps, framework-agnostic | → `src/core/store.ts` |
| `emitter-bridge.ts` | 70 | **Parcialmente** — el switch/case es genérico sobre `RuntimeEvent`, pero los campos `LogEntry`/`MessageEntry` son definidos por la app | → `src/core/emitter-bridge.ts` (genérico sobre `T extends BaseRuntimeState`) |
| `state.ts` (tipos `LogEntry`, `MessageEntry`, constantes `LOG_BUFFER_SIZE`, `MSG_BUFFER_SIZE`) | ~25 de 65 | **Sí** — son la represención canónica de `RuntimeEvent.log` y `RuntimeEvent.message` para buffers | → `src/core/store.ts` (co-locados con el store) |
| `state.ts` (interfaz `DashboardState`, campos mock/token/env, `getDefaultDashboardState`) | ~40 de 65 | **No** — es app-specific del dashboard | Se queda en `examples/dashboard/state.ts` |

### 2.3 Código que NO se mueve

| Archivo | Razón |
|---------|-------|
| `theme.ts` | Subjetivo, cada UI lo define |
| `App.tsx`, componentes | Ink-specific |
| `DashboardState` completo | Campos `mockMode`, `tokenConfigured`, `envFileExists` son app-specific |

---

## 3. Diseño

### 3.1 Nuevos archivos en `src/core/`

#### `src/core/store.ts` — Store reactivo genérico + tipos de buffer

```typescript
/**
 * Mini reactive store — genérico sobre T, sin dependencias externas.
 * Provee el patrón getState/setState/subscribe para conectar
 * RuntimeEmitter a cualquier UI framework (Ink, React web, vanilla).
 */

// --- Tipos de buffer estándar ---

/** Entrada de log en un buffer de UI. Corresponde a RuntimeEvent type:"log". */
export interface LogEntry {
  level: "debug" | "info" | "warn" | "error";
  scope: string;
  message: string;
  timestamp: string;
}

/** Mensaje entrante capturado. Corresponde a RuntimeEvent type:"message". */
export interface MessageEntry {
  chatId: number;
  username?: string;
  text: string;
  timestamp: string;
}

/** Tamaños por defecto para los buffers circulares. */
export const LOG_BUFFER_SIZE = 200;
export const MSG_BUFFER_SIZE = 100;

// --- Store ---

type Listener = () => void;

export interface Store<T> {
  getState(): T;
  setState(updater: (prev: T) => T): void;
  subscribe(listener: Listener): () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<Listener>();

  return {
    getState: () => state,
    setState: (updater) => {
      state = updater(state);
      for (const l of listeners) l();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
```

#### `src/core/emitter-bridge.ts` — Bridge genérico RuntimeEmitter → Store

```typescript
import type { RuntimeEmitter, RuntimeEvent, PluginInfo } from "./runtime-emitter.js";
import type { Store, LogEntry, MessageEntry } from "./store.js";
import { LOG_BUFFER_SIZE, MSG_BUFFER_SIZE } from "./store.js";

/**
 * Estado base que el bridge sabe reducir.
 * Los consumidores pueden extender esta interfaz con campos propios
 * (ej. DashboardState extiende con mockMode, tokenConfigured, etc.).
 */
export interface BaseRuntimeState {
  botStatus: "starting" | "running" | "stopped" | "error";
  startedAt: Date | null;
  plugins: PluginInfo[];
  commandCount: number;
  chatIds: number[];
  logs: LogEntry[];
  messages: MessageEntry[];
}

/** Estado base por defecto — usado como initial si el consumidor no aporta el suyo. */
export function getDefaultBaseState(): BaseRuntimeState {
  return {
    botStatus: "starting",
    startedAt: null,
    plugins: [],
    commandCount: 0,
    chatIds: [],
    logs: [],
    messages: [],
  };
}

/**
 * Opciones de configuración del bridge.
 */
export interface EmitterBridgeOptions {
  /** Tamaño máximo del buffer de logs. Default: LOG_BUFFER_SIZE (200). */
  logBufferSize?: number;
  /** Tamaño máximo del buffer de mensajes. Default: MSG_BUFFER_SIZE (100). */
  msgBufferSize?: number;
}

/**
 * Conecta un RuntimeEmitter a un Store<T> donde T extiende BaseRuntimeState.
 * Aplica cada RuntimeEvent como mutación de estado.
 * Devuelve la función de desubscripción.
 */
export function connectEmitterToStore<T extends BaseRuntimeState>(
  emitter: RuntimeEmitter,
  store: Store<T>,
  options?: EmitterBridgeOptions,
): () => void {
  const maxLogs = options?.logBufferSize ?? LOG_BUFFER_SIZE;
  const maxMsgs = options?.msgBufferSize ?? MSG_BUFFER_SIZE;

  function handleEvent(event: RuntimeEvent) {
    store.setState((prev) => {
      switch (event.type) {
        case "plugins-registered":
          return {
            ...prev,
            plugins: event.plugins,
            botStatus: "running" as const,
            startedAt: prev.startedAt ?? new Date(event.timestamp),
          };

        case "commands-synced":
          return { ...prev, commandCount: event.commandCount };

        case "status-change":
          return { ...prev, botStatus: event.status };

        case "chat-tracked":
          if (prev.chatIds.includes(event.chatId)) return prev;
          return { ...prev, chatIds: [...prev.chatIds, event.chatId] };

        case "broadcast":
          return prev;

        case "log": {
          const entry: LogEntry = {
            level: event.level,
            scope: event.scope,
            message: event.message,
            timestamp: event.timestamp,
          };
          const logs = [...prev.logs, entry].slice(-maxLogs) as T["logs"];
          return { ...prev, logs };
        }

        case "message": {
          const entry: MessageEntry = {
            chatId: event.chatId,
            username: event.username,
            text: event.text,
            timestamp: event.timestamp,
          };
          const messages = [...prev.messages, entry].slice(-maxMsgs) as T["messages"];
          return { ...prev, messages };
        }

        default:
          return prev;
      }
    });
  }

  const sub = emitter.events$.subscribe(handleEvent);
  return () => sub.unsubscribe();
}
```

### 3.2 Cambios en el barrel `src/index.ts`

Nuevos exports al final del barrel:

```typescript
// --- Store + UI bridge ---
export type { LogEntry, MessageEntry, Store } from "./core/store.js";
export { LOG_BUFFER_SIZE, MSG_BUFFER_SIZE, createStore } from "./core/store.js";

export type { BaseRuntimeState, EmitterBridgeOptions } from "./core/emitter-bridge.js";
export { getDefaultBaseState, connectEmitterToStore } from "./core/emitter-bridge.js";
```

### 3.3 Cambios en `examples/dashboard/`

#### `state.ts` — se reduce, importa del SDK

```typescript
import type { BaseRuntimeState } from "heteronimos-semi-asistidos-sdk";

// Re-exportar los tipos del SDK para uso interno del dashboard
export type { LogEntry, MessageEntry } from "heteronimos-semi-asistidos-sdk";
export { LOG_BUFFER_SIZE, MSG_BUFFER_SIZE } from "heteronimos-semi-asistidos-sdk";

/** Estado del dashboard = estado base del SDK + campos propios de la app */
export interface DashboardState extends BaseRuntimeState {
  mockMode: boolean;
  tokenConfigured: boolean;
  envFileExists: boolean;
  envExampleExists: boolean;
  appDir: string;
}

export function getDefaultDashboardState(): DashboardState {
  return {
    // Campos del SDK
    botStatus: "starting",
    startedAt: null,
    plugins: [],
    commandCount: 0,
    chatIds: [],
    logs: [],
    messages: [],
    // Campos propios del dashboard
    mockMode: false,
    tokenConfigured: false,
    envFileExists: false,
    envExampleExists: false,
    appDir: "",
  };
}
```

> Alternativa: importar `getDefaultBaseState()` y spread, pero lo explícito es más legible.

#### `emitter-bridge.ts` — se elimina, se usa el del SDK

```typescript
// ANTES (70 líneas)
export function connectEmitterToStore(emitter, store) { ... }

// DESPUÉS — el archivo se puede eliminar
// main.tsx importa directamente:
import { connectEmitterToStore } from "heteronimos-semi-asistidos-sdk";
```

#### `store.ts` — se elimina, se usa el del SDK

```typescript
// ANTES (30 líneas)
export function createStore<T>(initial: T): Store<T> { ... }

// DESPUÉS — el archivo se puede eliminar
// main.tsx importa directamente:
import { createStore } from "heteronimos-semi-asistidos-sdk";
```

#### `main.tsx` — imports actualizados

```typescript
// ANTES
import { RuntimeEmitter, Logger, bootBot } from "heteronimos-semi-asistidos-sdk";
import { createStore } from "./store.js";
import { connectEmitterToStore } from "./emitter-bridge.js";

// DESPUÉS
import { RuntimeEmitter, Logger, bootBot, createStore, connectEmitterToStore } from "heteronimos-semi-asistidos-sdk";
```

#### Componentes — sin cambios

Los componentes (`App.tsx`, `StatusPanel.tsx`, etc.) importan `Store` y `DashboardState` desde `./state.js`. Como `DashboardState extends BaseRuntimeState`, y `Store<T>` se re-exporta desde el SDK, no necesitan cambios.

`App.tsx` importa `Store` del SDK:

```typescript
// ANTES
import type { Store } from "./store.js";
// DESPUÉS
import type { Store } from "heteronimos-semi-asistidos-sdk";
```

### 3.4 Cambios en `examples/console-app/`

**Ninguno.** console-app no usa store ni bridge. Sigue siendo el arquetipo headless puro.

---

## 4. Estructura resultante

### 4.1 SDK `src/`

```
src/
├── index.ts                  ← +8 líneas de export (store + bridge)
└── core/
    ├── bot-handler.ts
    ├── boot.ts
    ├── chat-tracker.ts
    ├── command-handler.ts
    ├── emitter-bridge.ts     ← NUEVO (~65 líneas)
    ├── logger.ts
    ├── menu-handler.ts
    ├── mock-telegram.ts
    ├── runtime-emitter.ts
    ├── startup.ts
    └── store.ts              ← NUEVO (~55 líneas)
```

### 4.2 Dashboard `examples/dashboard/`

```
examples/dashboard/
├── package.json
├── tsconfig.json
├── .env.example
├── config.ts
├── rabbit-bot.ts
├── main.tsx                  ← imports actualizados
├── App.tsx                   ← import Store del SDK
├── state.ts                  ← reducido: DashboardState extends BaseRuntimeState
├── theme.ts                  ← sin cambios
└── components/
    ├── StatusPanel.tsx        ← sin cambios
    ├── LogViewer.tsx          ← sin cambios (usa LogEntry re-exportado)
    ├── ChatList.tsx           ← sin cambios
    └── ConfigPanel.tsx        ← sin cambios
```

**Archivos eliminados del dashboard:** `store.ts`, `emitter-bridge.ts`

---

## 5. Plan de ejecución — Fases

### Fase U · SDK: store + bridge genéricos

| # | Task | Ref |
|---|------|-----|
| U-1 | Crear `src/core/store.ts` — `Store<T>`, `createStore()`, `LogEntry`, `MessageEntry`, `LOG_BUFFER_SIZE`, `MSG_BUFFER_SIZE` | §3.1 |
| U-2 | Crear `src/core/emitter-bridge.ts` — `BaseRuntimeState`, `getDefaultBaseState()`, `EmitterBridgeOptions`, `connectEmitterToStore()` | §3.1 |
| U-3 | Ampliar `src/index.ts` — exportar nuevos tipos y funciones | §3.2 |
| U-4 | `bun run build:sdk` — verificar que `dist/` incluye los nuevos `.js` + `.d.ts` | — |
| U-5 | Tests: `tests/store.test.ts` — createStore, setState, subscribe, unsub | — |
| U-6 | Tests: `tests/emitter-bridge.test.ts` — connectEmitterToStore reduce todos los tipos de RuntimeEvent, buffers no superan max, unsub funciona | — |
| U-7 | Tests: `tests/barrel.test.ts` — ampliar smoke test con nuevos exports | — |

### Fase V · Dashboard: consumir del SDK

| # | Task | Ref |
|---|------|-----|
| V-1 | Refactorizar `examples/dashboard/state.ts` — `DashboardState extends BaseRuntimeState`, re-exportar `LogEntry`/`MessageEntry` del SDK | §3.3 |
| V-2 | Eliminar `examples/dashboard/store.ts` — importar `createStore` del SDK | §3.3 |
| V-3 | Eliminar `examples/dashboard/emitter-bridge.ts` — importar `connectEmitterToStore` del SDK | §3.3 |
| V-4 | Actualizar `examples/dashboard/main.tsx` — nuevos imports del SDK | §3.3 |
| V-5 | Actualizar `examples/dashboard/App.tsx` — `import type { Store } from "heteronimos-semi-asistidos-sdk"` | §3.3 |
| V-6 | Actualizar componentes que importen `Store` de `./store.js` → SDK | §3.3 |
| V-7 | `bun run build:sdk && bun run examples:install` — verificar que dashboard funciona | — |

### Fase W · Tests de integración + docs

| # | Task | Ref |
|---|------|-----|
| W-1 | Full test suite verde — todos los tests de core + dashboard smoke | — |
| W-2 | Actualizar `examples/dashboard/README.md` — reflejar nueva arquitectura (store y bridge vienen del SDK) | — |
| W-3 | Actualizar `docs/dashboard-guide.html` — Paso 3 (store/state) ahora importa del SDK en vez de crear local | — |
| W-4 | Actualizar `docs/index.html` — si stats de tests cambian | — |
| W-5 | Actualizar `README.md` raíz — mencionar los dos arquetipos (headless vs interactive) en la sección de arquitectura | — |
| W-6 | Actualizar `specs/00-overview.md` §3 tabla "Dentro del SDK" — añadir `Store`, `createStore`, `connectEmitterToStore`, `BaseRuntimeState`, `LogEntry`, `MessageEntry` | — |

---

## 6. Impacto en la tabla de exports del barrel

| Export | Tipo | Capa | Consumidor |
|--------|------|------|------------|
| `Store<T>` | interface | UI Bridge | Integrador, Tooling |
| `createStore()` | function | UI Bridge | Integrador, Tooling |
| `LogEntry` | interface | UI Bridge | Integrador, Tooling |
| `MessageEntry` | interface | UI Bridge | Integrador, Tooling |
| `LOG_BUFFER_SIZE` | const | UI Bridge | Integrador |
| `MSG_BUFFER_SIZE` | const | UI Bridge | Integrador |
| `BaseRuntimeState` | interface | UI Bridge | Integrador |
| `getDefaultBaseState()` | function | UI Bridge | Integrador |
| `EmitterBridgeOptions` | interface | UI Bridge | Integrador |
| `connectEmitterToStore()` | function | UI Bridge | Integrador |

Actualiza el diagrama de capas de SDS-00:

```
┌─────────────────────────────────────────────────────────┐
│  Capa 4 · UI Bridge (NUEVO)                             │
│  Store · createStore · connectEmitterToStore             │
│  LogEntry · MessageEntry · BaseRuntimeState              │
│  → Integrador con UI (Ink, web, Electron, MCP view)     │
├─────────────────────────────────────────────────────────┤
│  Capa 3 · Orquestación                                  │
│  registerPlugins · syncCommands · ChatTracker · bootBot  │
│  → Integrador / DevOps                                   │
├─────────────────────────────────────────────────────────┤
│  Capa 2 · Definición                                     │
│  BotPlugin · CommandDefinition · MenuDefinition          │
│  → Plugin Author                                         │
├─────────────────────────────────────────────────────────┤
│  Capa 1 · Infraestructura                                │
│  Logger · RuntimeEmitter · tipos base                    │
│  → Todos                                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Criterios de aceptación

- [ ] `bun run build:sdk` genera `dist/store.js`, `dist/store.d.ts`, `dist/emitter-bridge.js`, `dist/emitter-bridge.d.ts`
- [ ] `dist/index.d.ts` exporta `Store`, `createStore`, `connectEmitterToStore`, `BaseRuntimeState`, `LogEntry`, `MessageEntry`
- [ ] `examples/dashboard/` no contiene `store.ts` ni `emitter-bridge.ts`
- [ ] `examples/dashboard/state.ts` importa `BaseRuntimeState`, `LogEntry`, `MessageEntry` del SDK
- [ ] `examples/dashboard/main.tsx` importa `createStore`, `connectEmitterToStore` del SDK
- [ ] `examples/console-app/` no tiene cambios (sigue siendo headless)
- [ ] Test suite completa verde (`bun run test`)
- [ ] Tests nuevos: `store.test.ts`, `emitter-bridge.test.ts`
- [ ] Barrel smoke test (`barrel.test.ts`) incluye los nuevos exports
- [ ] `docs/dashboard-guide.html` actualizada — pasos 3a/3b reflejan imports del SDK
- [ ] `README.md` raíz menciona los dos arquetipos de app

---

## 8. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| `connectEmitterToStore` está demasiado acoplado a la forma de `DashboardState` | Apps con estado diferente no podrían usarlo | El genérico `T extends BaseRuntimeState` permite extender con campos propios; el switch/case solo toca campos de `BaseRuntimeState` |
| Consumidor sin RxJS intenta usar `createStore` | Error de import si no tiene rxjs | `createStore` y `Store` no dependen de RxJS. Solo `connectEmitterToStore` lo necesita (vía `events$.subscribe`). Documentar que el store es standalone |
| Eliminación de `store.ts` / `emitter-bridge.ts` del dashboard rompe imports | Build error | Fase V es atómica: eliminar + actualizar imports en el mismo commit |

---

*Spec created: 2026-04-02 · Depends on: SDS-06 (RxJS migration) ✅, SDS-08 (example packages) ✅*
