# SDS-12 · Mock Command Execution from Dashboard

> **heteronimos-semi-asistidos-sdk** · Software Design Specification
> Estado: DRAFT · target: v0.3.0

---

## 1. Objetivo

Permitir que el dashboard TUI (y cualquier UI similar) ejecute comandos de bot contra el `MockTelegramBot` en modo mock, simulando la interacción como si viniera de Telegram. El admin selecciona un comando registrado, lo ejecuta, y ve la respuesta — todo dentro de la TUI, sin conexión real.

**Motivación:**

- En modo mock no hay forma de probar interactivamente los comandos del bot; el mock arranca pero nadie le envía mensajes.
- La dashboard ya conoce los plugins cargados y sus comandos (vía `PluginInfo`), pero no puede ejecutarlos.
- El subsistema `MockTelegramBot.simulateCommand()` ya existe y funciona — solo falta exponerlo al consumidor y cerrar el ciclo UI → mock → respuesta → UI.

**Principio rector:** El SDK carga con toda la implementación. La app de ejemplo solo consume.

---

## 2. Estado actual

### 2.1 Lo que existe

| Pieza | Estado | Ubicación |
|-------|--------|-----------|
| `MockTelegramBot` | Completo: `simulateCommand()`, `simulateMessage()`, registro de handlers, middleware chain | `src/core/mock-telegram.ts` |
| `BootResult` | Devuelve `{ mock: boolean, started: boolean }` — **no expone el mock** | `src/core/boot.ts` |
| `PluginInfo` | `{ name, pluginCode, commandCount }` — **sin lista de comandos** | `src/core/runtime-emitter.ts` |
| `RuntimeEvent` | 7 tipos — **sin eventos de ejecución de comando** | `src/core/runtime-emitter.ts` |
| `BaseRuntimeState` | logs, messages, chatIds, plugins, commandCount — **sin respuestas de comandos** | `src/core/emitter-bridge.ts` |
| Dashboard panels | Overview, Logs, Chats, Config — **sin visor de comandos** | `examples/dashboard/components/` |
| `startMock()` | Crea mock internamente, no lo retorna | `src/core/boot.ts` |

### 2.2 Brechas a cerrar

1. **No hay acceso al mock desde fuera de `bootBot()`** — `startMock()` crea el mock y lo descarta.
2. **`PluginInfo` no incluye la lista de comandos** — la dashboard sabe cuántos hay, pero no cuáles son.
3. **No hay eventos de ejecución/respuesta** — el emitter no sabe cuándo alguien ejecuta un comando ni qué respondió el bot.
4. **No hay panel de comandos** en la dashboard.

---

## 3. Diseño

### 3.1 `PluginInfo` ampliado

```typescript
// ANTES
export interface PluginInfo {
  name: string;
  pluginCode: string;
  commandCount: number;
}

// DESPUÉS
export interface PluginCommandInfo {
  /** Nombre del comando CON prefijo (e.g. "rb_aleph") */
  command: string;
  /** Descripción para el usuario */
  description: string;
}

export interface PluginInfo {
  name: string;
  pluginCode: string;
  commandCount: number;
  commands: PluginCommandInfo[];
}
```

**Impacto:** El evento `plugins-registered` ya transporta `PluginInfo[]`. Añadir `commands` es aditivo — no rompe consumidores existentes que no leen ese campo.

El punto de generación es `registerPlugins()` en `bot-handler.ts`, que ya tiene acceso a `plugin.commands()`. Solo hay que incluir los detalles en el `PluginInfo` que emite.

### 3.2 Nuevos `RuntimeEvent`

```typescript
export type RuntimeEvent =
  // ... eventos existentes ...
  | { type: "command-executed"; command: string; chatId: number; userId: number; username: string; timestamp: string }
  | { type: "command-response"; command: string; text: string; chatId: number; timestamp: string };
```

- **`command-executed`** — se emite ANTES de correr el handler. Registra qué comando pidió el admin.
- **`command-response`** — se emite por cada `reply()` / `editMessageText()` del handler. Registra qué respondió el bot.

### 3.3 `MockTelegramBot` ampliado

```typescript
export interface MockBotOptions {
  initialCommands?: BotCommand[];
  emitter?: RuntimeEmitter;  // NUEVO
}

export class MockTelegramBot {
  private emitter?: RuntimeEmitter;

  constructor(options?: MockBotOptions) {
    // ... existente ...
    this.emitter = options?.emitter;
  }

  /**
   * Simula un comando. Retorna los mensajes producidos por ESTA ejecución
   * (no todos los históricos).
   *
   * Si hay emitter configurado:
   * - Emite command-executed antes de correr el handler
   * - Emite command-response por cada reply del handler
   */
  async simulateCommand(name: string, opts?: SimulateOpts): Promise<SentMessage[]> {
    const before = this.sentMessages.length;

    // Emit command-executed
    this.emitter?.emit({
      type: "command-executed",
      command: name,
      chatId: opts?.chatId ?? MOCK_FIXTURES.chatId,
      userId: opts?.userId ?? MOCK_FIXTURES.userId,
      username: opts?.username ?? MOCK_FIXTURES.username,
      timestamp: new Date().toISOString(),
    });

    // ... ejecutar handler (existente) ...

    // Collect new messages produced by this execution
    const produced = this.sentMessages.slice(before);

    // Emit command-response for each reply
    for (const msg of produced) {
      this.emitter?.emit({
        type: "command-response",
        command: name,
        text: msg.text,
        chatId: msg.chatId,
        timestamp: new Date().toISOString(),
      });
    }

    return produced;
  }
}
```

**Cambio de firma:** `simulateCommand()` pasa de `Promise<void>` a `Promise<SentMessage[]>`. No es breaking: consumidores que no usan el retorno (`await bot.simulateCommand(...)`) siguen funcionando.

### 3.4 `BootResult` ampliado + `startMock` retorna mock

```typescript
// ANTES
export interface BootResult {
  mock: boolean;
  started: boolean;
}

// DESPUÉS
export interface BootResult {
  mock: boolean;
  started: boolean;
  /** Ejecuta un comando contra el mock bot. Solo disponible en mock mode. */
  executeCommand?: (name: string, opts?: SimulateOpts) => Promise<SentMessage[]>;
}
```

**Cambios en `boot.ts`:**

```typescript
async function startMock(opts: BootBotOptions, log: Logger, syncOpts: SyncOptions): Promise<MockTelegramBot> {
  // ... existente ...
  const mockBot = new MockTelegramBot({ emitter: opts.emitter }); // pasa emitter
  // ... registerPlugins, syncCommands ...
  return mockBot; // ANTES: no retornaba
}

export async function bootBot(opts: BootBotOptions): Promise<BootResult> {
  // ...
  if (env.mock) {
    const mockBot = await startMock(opts, log, syncOpts);
    return {
      mock: true,
      started: true,
      executeCommand: (name, simOpts) => mockBot.simulateCommand(name, simOpts),
    };
  }
  // ... fallback mock también monta executeCommand ...
}
```

### 3.5 `CommandResponseEntry` + `BaseRuntimeState` ampliado

```typescript
// En src/core/store.ts

/** Respuesta de un comando ejecutado desde la UI. */
export interface CommandResponseEntry {
  command: string;
  text: string;
  chatId: number;
  timestamp: string;
}

export const CMD_BUFFER_SIZE = 50;
```

```typescript
// En src/core/emitter-bridge.ts

export interface BaseRuntimeState {
  // ... campos existentes ...
  /** Respuestas de comandos ejecutados desde la UI (buffer circular). */
  commandResponses: CommandResponseEntry[];
}

export function getDefaultBaseState(): BaseRuntimeState {
  return {
    // ... existente ...
    commandResponses: [],
  };
}
```

### 3.6 `emitter-bridge.ts` — nuevos cases

```typescript
case "command-response": {
  const entry: CommandResponseEntry = {
    command: event.command,
    text: event.text,
    chatId: event.chatId,
    timestamp: event.timestamp,
  };
  const commandResponses = [...prev.commandResponses, entry].slice(-maxCmds) as T["commandResponses"];
  return { ...prev, commandResponses };
}

case "command-executed":
  // Se registra como log informativo, no necesita su propio campo en state
  return prev;
```

### 3.7 `reduceRuntime` — sin cambios necesarios

Los nuevos eventos (`command-executed`, `command-response`) no afectan a `BotRuntime` (snapshot del estado del bot). Pasan por el `default:` que devuelve state sin cambios. La información de ejecución fluye por el bridge hacia `BaseRuntimeState.commandResponses`, que es responsabilidad de la capa UI, no del runtime snapshot.

### 3.8 Barrel `src/index.ts` — nuevos exports

```typescript
// Nuevos exports
export type { SentMessage, SimulateOpts } from "./core/mock-telegram.js";
export type { CommandResponseEntry } from "./core/store.js";
export { CMD_BUFFER_SIZE } from "./core/store.js";
```

`MockTelegramBot` **no se exporta desde el barrel** — sigue siendo interno. El consumidor interactúa a través de `BootResult.executeCommand`.

---

## 4. Cambios en la Dashboard (ejemplo)

### 4.1 `DashboardState` ampliado

```typescript
export interface DashboardState extends BaseRuntimeState {
  // ... campos existentes ...
  /** Función para ejecutar comandos en mock mode. null si no está en mock. */
  executeCommand: ((name: string) => Promise<SentMessage[]>) | null;
}
```

### 4.2 `CommandPanel.tsx` — nuevo componente

Panel `[5] Commands` que:

1. **Lista los comandos** agrupados por plugin — lee `state.plugins[].commands[]`.
2. **Selector** — el admin navega con ↑↓ y ejecuta con Enter.
3. **Ejecución** — llama `state.executeCommand(selectedCommand)`.
4. **Visor de respuestas** — muestra `state.commandResponses[]` con scroll.
5. **Estado deshabilitado** — si `executeCommand === null` (bot real), muestra mensaje informativo: "Command execution only available in mock mode."

```
┌─ [5] Commands ──────────────────────────────────┐
│ Plugins & Commands                              │
│                                                 │
│ [rb] RabbitBot                                  │
│   ▸ /rb_aleph    — next Fibonacci-date event    │
│   ▸ /rb_join     — join link                    │
│   ▸ /rb_quit     — quit                         │
│   ▸ /rb_alephs   — all events                   │
│   ▸ /rb_menu     — inline keyboard              │
│                                                 │
│ Responses                                       │
│ ─────────────────────────────                   │
│ 12:34:01 /rb_aleph → "Next aleph: 2026-..."    │
│ 12:34:15 /rb_join  → "Join us at t.me/..."     │
│                                                 │
│ [↑↓] select  [Enter] execute  [r] clear         │
└─────────────────────────────────────────────────┘
```

### 4.3 `App.tsx` actualizado

```typescript
const PANELS = ["Overview", "Logs", "Chats", "Config", "Commands"] as const;
// ...
if (input === "5") setActivePanel("Commands");
// ...
{activePanel === "Commands" && <CommandPanel state={state} />}
// Footer: [1] Overview  [2] Logs  [3] Chats  [4] Config  [5] Commands  [Tab] Cycle  [q] Quit
```

### 4.4 `main.tsx` actualizado

```typescript
store.setState((s) => ({
  ...s,
  // ... campos existentes ...
  executeCommand: result.executeCommand ?? null,
}));
```

---

## 5. Qué NO cubre este spec

| Aspecto | Motivo |
|---------|--------|
| Ejecución contra bot real | Riesgo: enviar mensajes reales desde panel admin requiere confirmación UX adicional |
| `callbackQuery` / menús inline | Complejidad: requiere estado de navegación de menú; se puede añadir después |
| Input de texto libre | El mock necesita contexto para `onMessage` handlers; requiere UX adicional |
| Exportar `MockTelegramBot` públicamente | Se expone solo `executeCommand`; si consumidores necesitan más, se promueve |
| Persistencia de respuestas | Buffer circular en memoria; se descarta al cerrar |

---

## 6. Criterios de aceptación

1. ✅ `PluginInfo.commands` se llena correctamente al registrar plugins (con y sin mock).
2. ✅ `MockTelegramBot.simulateCommand()` retorna `SentMessage[]` y emite `command-executed` + `command-response` por el emitter.
3. ✅ `BootResult.executeCommand` existe en mock mode y es `undefined` con bot real.
4. ✅ `BaseRuntimeState.commandResponses` se reduce correctamente desde `command-response` events.
5. ✅ Dashboard panel `[5] Commands` lista comandos de todos los plugins.
6. ✅ Al ejecutar un comando, la respuesta aparece en el visor del panel.
7. ✅ Si no es mock mode, el panel muestra mensaje informativo y no permite ejecución.
8. ✅ Full test suite verde + lint limpio.
9. ✅ No breaking changes — consumidores que no usan las features nuevas no se ven afectados.

---

## 7. Fases de implementación

| Fase | Entregable | Items backlog |
|------|-----------|---------------|
| **AE** | SDK: PluginInfo ampliado, nuevos RuntimeEvent, MockTelegramBot con emitter, BootResult con executeCommand, CommandResponseEntry, emitter-bridge ampliado, barrel exports | #198–#205 |
| **AF** | Tests: mock+emitter, bridge nuevos eventos, barrel smoke | #206–#209 |
| **AG** | Dashboard: DashboardState ampliado, CommandPanel, App.tsx 5 tabs, main.tsx con executeCommand | #210–#213 |
| **AH** | Integración: test suite verde, docs actualizados | #214–#217 |

---

## 8. Riesgos y mitigaciones

| Riesgo | Prob. | Mitigación |
|--------|-------|------------|
| `PluginInfo.commands` rompe snapshots serializados | Baja | Campo aditivo; `reduceRuntime` devuelve state sin cambios para campos desconocidos |
| `simulateCommand` retorna `SentMessage[]` vs anterior `void` | Baja | No-breaking: void consumers ignoran retorno |
| `BaseRuntimeState` crece con campo solo útil en mock | Baja | Campo es `[]` por defecto; overhead negligible; cualquier UI con command execution lo necesita |
| Deadlock si handler async largo bloquea Ink | Baja | `simulateCommand` es async; Ink continúa renderizando mientras await resuelve |
| `executeCommand` captura referencia al mock — memory leak | Baja | Mock vive tanto como el proceso; cleanup en `emitter.complete()` |
