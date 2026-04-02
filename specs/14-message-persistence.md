# SDS-14 · Persistencia de mensajes entre reinicios

> **heteronimos-semi-asistidos-sdk** · Software Design Specification
> Estado: DRAFT · target: v0.3.0

---

## 1. Objetivo

Persistir los mensajes entrantes y las respuestas de comandos a disco para que al reiniciar el bot, la dashboard (y cualquier UI) recupere el historial reciente sin esperar a que lleguen mensajes nuevos desde Telegram.

**Contexto:** La Bot API de Telegram no ofrece `getChatHistory` para bots — solo se reciben mensajes en tiempo real vía `getUpdates`/webhook. Una vez procesados y confirmados con offset, se pierden. Por tanto, si el SDK no persiste los mensajes localmente, cada reinicio arranca con el buffer vacío.

**Principio rector:** El SDK aporta la interfaz (`MessageStore`), la implementación por defecto (`FileMessageStore`) y el cableado al bridge. La app solo pasa un path en la configuración.

---

## 2. Estado actual

### 2.1 Lo que existe

| Pieza | Estado | Ubicación |
|-------|--------|-----------|
| `MessageEntry` | `{ chatId, username?, text, timestamp }` | `src/core/store.ts` |
| `CommandResponseEntry` | `{ command, text, chatId, timestamp }` | `src/core/store.ts` |
| `BaseRuntimeState.messages` | Buffer circular in-memory (max 100) — **se pierde al reiniciar** | `src/core/emitter-bridge.ts` |
| `BaseRuntimeState.commandResponses` | Buffer circular in-memory (max 50) — **se pierde al reiniciar** | `src/core/emitter-bridge.ts` |
| `ChatStore` interface | `load(): number[]`, `save(ids): void` — solo chat IDs | `src/core/chat-tracker.ts` |
| `FileChatStore` | Persiste `number[]` a `.chats.json` | `src/core/chat-tracker.ts` |
| `connectEmitterToStore` | Reduce events → state; no persiste | `src/core/emitter-bridge.ts` |
| `bootBot` options | `chatStorePath` para IDs; **nada para mensajes** | `src/core/boot.ts` |

### 2.2 Brechas a cerrar

1. **No hay `MessageStore`** — no existe interfaz ni implementación para persistir mensajes.
2. **El bridge no sabe de persistencia** — `connectEmitterToStore` reduce al buffer in-memory y listo.
3. **`bootBot` no ofrece config de mensajes** — no hay parámetro para activar persistencia.
4. **Al arrancar, `messages[]` y `commandResponses[]` empiezan vacíos** — no hay carga de historial.

---

## 3. Diseño

### 3.1 Interfaz `MessageStore` (`src/core/message-store.ts` — nuevo)

Sigue el mismo patrón que `ChatStore`: interfaz + implementación fichero + implementación memoria.

```typescript
import type { MessageEntry, CommandResponseEntry } from "./store.js";

/** Datos persistidos por el MessageStore. */
export interface PersistedMessages {
  messages: MessageEntry[];
  commandResponses: CommandResponseEntry[];
}

/** Contrato mínimo de almacenamiento de mensajes. */
export interface MessageStore {
  /** Carga los mensajes persistidos. Se llama una vez al arrancar. */
  load(): PersistedMessages | Promise<PersistedMessages>;
  /** Persiste el estado actual de mensajes. Se llama tras cada nuevo mensaje. */
  save(data: PersistedMessages): void | Promise<void>;
}
```

### 3.2 `FileMessageStore` — implementación por defecto

```typescript
export class FileMessageStore implements MessageStore {
  constructor(
    private filePath: string,
    private maxMessages: number = MSG_BUFFER_SIZE,
    private maxResponses: number = CMD_BUFFER_SIZE,
  ) {}

  load(): PersistedMessages {
    // Lee el fichero JSON, valida shape, devuelve datos o vacío.
    // Recorta a maxMessages/maxResponses si el fichero tiene más.
  }

  save(data: PersistedMessages): void {
    // Escribe JSON atómicamente (write tmp + rename para evitar corrupción).
    // Solo guarda los últimos maxMessages/maxResponses entries.
  }
}
```

**Fichero:** `.messages.json` junto a `.chats.json`.

**Formato:**
```json
{
  "messages": [
    { "chatId": 12345, "username": "alice", "text": "Hola!", "timestamp": "2026-04-03T14:30:01.000Z" }
  ],
  "commandResponses": [
    { "command": "rb_aleph", "text": "Next hole!...", "chatId": 12345, "timestamp": "2026-04-03T14:30:02.000Z" }
  ]
}
```

### 3.3 `MemoryMessageStore` — para tests

```typescript
export class MemoryMessageStore implements MessageStore {
  private data: PersistedMessages = { messages: [], commandResponses: [] };
  load(): PersistedMessages { return { ...this.data }; }
  save(data: PersistedMessages): void { this.data = data; }
}
```

### 3.4 Integración con el bridge (`emitter-bridge.ts`)

Ampliar `EmitterBridgeOptions` y `connectEmitterToStore`:

```typescript
export interface EmitterBridgeOptions {
  logBufferSize?: number;
  msgBufferSize?: number;
  cmdBufferSize?: number;
  /** Si se proporciona, persiste mensajes tras cada evento y carga al conectar. */
  messageStore?: MessageStore;
}
```

**Flujo:**

1. **Al conectar** (`connectEmitterToStore`): si hay `messageStore`, llama `messageStore.load()` y hace `store.setState()` para inyectar `messages` y `commandResponses` como estado inicial.
2. **En cada evento `message` o `command-response`**: tras actualizar el state in-memory, llama `messageStore.save({ messages, commandResponses })` con los buffers actuales.
3. El `save` es fire-and-forget (no bloquea el render). Si falla, log warning y continúa.

```
Arranque:
  messageStore.load() → prev messages/commandResponses
  store.setState(s => ({ ...s, messages: loaded.messages, commandResponses: loaded.commandResponses }))

Runtime:
  RuntimeEvent "message" → update state → messageStore.save(state.messages, state.commandResponses)
  RuntimeEvent "command-response" → update state → messageStore.save(...)
```

### 3.5 Integración con `bootBot` (`boot.ts`)

Añadir campo opcional a `BootBotOptions`:

```typescript
export interface BootBotOptions {
  // ... campos existentes ...
  /** Path to the message persistence file. If provided, enables message persistence. */
  messageStorePath?: string;
}
```

`bootBot` crea un `FileMessageStore` si se pasa el path y lo pasa a `connectEmitterToStore` vía options. Si no se pasa, el comportamiento es idéntico al actual (solo in-memory).

### 3.6 Uso en la dashboard (`examples/dashboard/main.tsx`)

```typescript
const result = await bootBot({
  plugins: [new RabbitBot(SOLANA_ADDRESS)],
  envDir: appDir,
  chatStorePath: path.join(appDir, ".chats.json"),
  messageStorePath: path.join(appDir, ".messages.json"),  // ← nuevo
  emitter,
  logger: log,
  nonInteractive: true,
});
```

No se necesita ningún otro cambio en la app — el bridge se encarga de cargar y guardar.

### 3.7 Escritura atómica

Para evitar corrupción si el proceso muere a mitad de escritura:

```typescript
// FileMessageStore.save():
const tmp = this.filePath + ".tmp";
fs.writeFileSync(tmp, JSON.stringify(data), "utf-8");
fs.renameSync(tmp, this.filePath);  // atómico en la mayoría de OS
```

### 3.8 Debounce de escritura

Escribir a disco en cada mensaje puede ser excesivo si hay ráfagas. Opción: debounce de ~500ms.

```typescript
// Dentro de connectEmitterToStore, si messageStore:
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedSave(state: BaseRuntimeState) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    messageStore.save({ messages: state.messages, commandResponses: state.commandResponses });
  }, 500);
}
```

Así en ráfagas de 10 mensajes solo escribe 1 vez. Al shutdown, flush inmediato.

---

## 4. Desglose de implementación

### §4.1 `MessageStore` interface + `FileMessageStore` + `MemoryMessageStore`

- Nuevo archivo `src/core/message-store.ts`.
- `FileMessageStore`: load/save con escritura atómica (tmp + rename).
- `MemoryMessageStore`: para tests.

### §4.2 Integrar `MessageStore` en `connectEmitterToStore`

- Ampliar `EmitterBridgeOptions` con `messageStore?: MessageStore`.
- Al conectar: cargar datos de `messageStore.load()` → `store.setState()`.
- En handlers de `message` y `command-response`: invocar `save()` (debounced).
- Flush al completar el emitter (event `complete`).

### §4.3 Ampliar `BootBotOptions` con `messageStorePath`

- Si se pasa, crear `FileMessageStore` y pasarlo al bridge.
- Si no, comportamiento actual (in-memory only).

### §4.4 Exportar tipos y clases desde `src/index.ts`

```typescript
export type { MessageStore, PersistedMessages } from "./core/message-store.js";
export { FileMessageStore, MemoryMessageStore } from "./core/message-store.js";
```

### §4.5 Dashboard: activar persistencia en `main.tsx`

- Añadir `messageStorePath: path.join(appDir, ".messages.json")` a `bootBot()`.
- Añadir `.messages.json` al `.gitignore` de la app si existe.

### §4.6 Tests

- `message-store.test.ts`:
  - `FileMessageStore` load/save round-trip.
  - `FileMessageStore` load con fichero corrupto → devuelve vacío.
  - `FileMessageStore` load con fichero inexistente → devuelve vacío.
  - `FileMessageStore` respeta los límites `maxMessages`/`maxResponses`.
  - Escritura atómica: simular crash → fichero no queda corrupto.
- `emitter-bridge.test.ts` (ampliar):
  - Con `MemoryMessageStore`: conectar, emitir mensajes, verificar que `save` se llama.
  - Reconectar con store precargado → `messages` del state contiene el historial.

---

## 5. Lo que NO se cubre

| Excluido | Motivo |
|----------|--------|
| Base de datos (SQLite, etc.) | Sobreingeniería para el caso actual; `MessageStore` es extensible |
| Persistencia de logs | Los logs son volátiles por diseño — se regeneran en cada sesión |
| Compresión del fichero | Los buffers son pequeños (100 msgs + 50 responses) — JSON plano basta |
| Sincronización multi-proceso | El SDK asume un solo proceso; no se necesita file locking |
| Recuperar mensajes de Telegram | La Bot API no lo permite para bots (solo Client API / MTProto) |

---

## 6. Criterios de aceptación

| # | Criterio | Validación |
|---|----------|-----------|
| 1 | Al reiniciar el dashboard con `messageStorePath`, los mensajes previos aparecen en la pestaña Chats | Manual: enviar mensajes, reiniciar, verificar que siguen ahí |
| 2 | Sin `messageStorePath`, comportamiento idéntico al actual (solo in-memory) | Test: no se crea fichero; mensajes vacíos al reconectar |
| 3 | `FileMessageStore.save()` usa escritura atómica (tmp + rename) | Test: verificar que se crea .tmp y se renombra |
| 4 | Fichero corrupto o inexistente → carga silenciosa con arrays vacíos | Test: fichero con basura → load devuelve `{ messages: [], commandResponses: [] }` |
| 5 | Los buffers persistidos respetan los límites de tamaño | Test: guardar 200 mensajes → load devuelve max 100 |
| 6 | Escritura debounced: ráfaga de N mensajes → máximo 1-2 escrituras | Test: emitir 10 mensajes rápidos, contar llamadas a save |
| 7 | `MessageStore`, `FileMessageStore`, `MemoryMessageStore` exportados desde el SDK | `import { FileMessageStore } from "heteronimos-semi-asistidos-sdk"` funciona |
| 8 | SDK compila limpio | `bun run build:sdk` sin errores |
| 9 | Dashboard compila limpio | `tsc --noEmit` sin errores |
| 10 | Todos los tests pasan | `bun test` 0 failures |

---

## 7. Dependencias

| Spec | Relación |
|------|----------|
| SDS-09 (UI Bridge) | `BaseRuntimeState`, `Store`, `connectEmitterToStore` — punto de integración |
| SDS-13 (Chat Detail) | Consume `messages[]` y `commandResponses[]` — se beneficia de tenerlos precargados |
| SDS-12 (Command Execution) | `CommandResponseEntry` — se persiste junto con mensajes |

---

## 8. Riesgos

| Riesgo | Impacto | Mitigación |
|--------|---------|-----------|
| Corrupción de `.messages.json` por crash | Pérdida de historial | Escritura atómica (tmp + rename); load tolerante a errores |
| Fichero crece sin límite | Disco lleno | Los buffers ya están limitados (MSG_BUFFER_SIZE=100, CMD_BUFFER_SIZE=50) |
| Debounce pierde últimos mensajes si el proceso muere | Últimos ~500ms de mensajes perdidos | Flush al recibir SIGINT/SIGTERM (a través de `emitter.complete()`) |
| `save()` lento bloquea el event loop | UI se congela | `save` es síncrono pero el payload es pequeño (~50KB max); si crece, migrar a async |
