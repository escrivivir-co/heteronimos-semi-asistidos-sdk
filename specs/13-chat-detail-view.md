# SDS-13 · Chat Detail View (pestaña Chats mejorada)

> **heteronimos-semi-asistidos-sdk** · Software Design Specification
> Estado: DRAFT · target: v0.3.0

---

## 1. Objetivo

Convertir la pestaña **Chats** del dashboard TUI en una vista master-detail:

1. **Lista de chats** (izquierda / vista principal) — muestra los chats conocidos con preview del último mensaje.
2. **Detalle de chat** — al seleccionar un chat, se muestran todos los mensajes de esa conversación en orden cronológico.

El grueso de la lógica (agrupar mensajes por chat, seleccionar, tipos) debe vivir en el **SDK** para que cualquier UI (TUI, web, Electron) pueda reutilizarla. La app de ejemplo solo consume.

**Principio rector:** SDK carga la implementación. La app solo consume.

---

## 2. Estado actual

### 2.1 Lo que existe

| Pieza | Estado | Ubicación |
|-------|--------|-----------|
| `MessageEntry` | `{ chatId, username?, text, timestamp }` — tipo plano | `src/core/store.ts` |
| `BaseRuntimeState.messages` | Buffer circular de `MessageEntry[]` (max 100) — flat, sin agrupar | `src/core/emitter-bridge.ts` |
| `BaseRuntimeState.chatIds` | `number[]` — lista plana de IDs conocidos | `src/core/emitter-bridge.ts` |
| `ChatList` component | Muestra KnownChats + Recent Messages (últimos 10) en vista flat | `examples/dashboard/components/ChatList.tsx` |
| `connectEmitterToStore` | Reduce `message` events → push a `messages[]` buffer | `src/core/emitter-bridge.ts` |
| `ChatTracker` | Persiste chat IDs en disco/memoria, emite `chat-tracked` | `src/core/chat-tracker.ts` |
| `RuntimeEvent.message` | `{ chatId, userId?, username?, text, timestamp }` | `src/core/runtime-emitter.ts` |
| `RuntimeEvent.command-response` | `{ command, text, chatId, timestamp }` — respuestas de comandos ejecutados | `src/core/runtime-emitter.ts` |

### 2.2 Brechas a cerrar

1. **No hay agrupación de mensajes por chat** — `messages[]` es un buffer flat; filtrar por chatId cada render es ineficiente y responsabilidad que la app no debería tener.
2. **No hay concepto de "chat seleccionado"** — la vista es solo lectura, no hay interactividad.
3. **`MessageEntry` no distingue usuario del bot** — no se puede saber si un mensaje es del usuario o una respuesta del bot. Las `command-response` están en otro buffer separado.
4. **No hay selectors/helpers en el SDK** — cada app tiene que reimplementar el filtro y agrupado.
5. **No hay scroll/paginación** — si hay muchos mensajes, se cortan.

---

## 3. Diseño

### 3.1 Tipos nuevos en el SDK (`src/core/store.ts`)

```typescript
/** Mensaje unificado: tanto del usuario como respuesta del bot. */
export interface ChatMessage {
  chatId: number;
  /** "user" = mensaje entrante; "bot" = respuesta de comando/onMessage */
  direction: "user" | "bot";
  username?: string;
  text: string;
  /** Comando que generó esta respuesta (solo si direction="bot") */
  command?: string;
  timestamp: string;
}

/** Vista agrupada de un chat con su historial. */
export interface ChatThread {
  chatId: number;
  /** Último mensaje (para ordenar la lista y mostrar preview) */
  lastMessage: ChatMessage | null;
  /** Historial completo (buffer limitado) */
  messages: ChatMessage[];
  /** Número total de mensajes (puede ser > messages.length por el buffer) */
  totalMessages: number;
}
```

### 3.2 Selector en el SDK (`src/core/chat-selectors.ts`)

Funciones puras que operan sobre `BaseRuntimeState` — reutilizables por cualquier UI.

```typescript
import type { BaseRuntimeState } from "./emitter-bridge.js";
import type { ChatMessage, ChatThread } from "./store.js";

/**
 * Construye la lista de ChatThreads a partir del estado base.
 * Combina messages[] y commandResponses[] en un timeline unificado por chat.
 * Ordenado por timestamp del último mensaje (más reciente primero).
 */
export function selectChatThreads(state: BaseRuntimeState): ChatThread[];

/**
 * Devuelve el timeline de un chat específico.
 * Combina mensajes de usuario + respuestas del bot, ordenados cronológicamente.
 */
export function selectChatMessages(
  state: BaseRuntimeState,
  chatId: number
): ChatMessage[];
```

**Lógica interna:**

1. Recorre `state.messages` → genera `ChatMessage` con `direction: "user"`.
2. Recorre `state.commandResponses` → genera `ChatMessage` con `direction: "bot"`.
3. Agrupa por `chatId` en un `Map<number, ChatMessage[]>`.
4. Para cada `chatId` en `state.chatIds`, crea un `ChatThread`.
5. Ordena threads por `lastMessage.timestamp` desc.
6. Ordena mensajes dentro de cada thread por `timestamp` asc.

### 3.3 SDK exports (`src/index.ts`)

Exportar los nuevos tipos y selectores:

```typescript
export type { ChatMessage, ChatThread } from "./core/store.js";
export { selectChatThreads, selectChatMessages } from "./core/chat-selectors.js";
```

### 3.4 Componentes del dashboard (vista master-detail)

La pestaña Chats se divide en dos subcomponentes:

#### `ChatList.tsx` — refactored

```
┌───────────────────────────────────────┐
│ Chats (3)           [↑↓] Navigate     │
│───────────────────────────────────────│
│ > #12345  alice · Hola!     14:32:01  │  ← selected
│   #67890  bob   · /rb_aleph 14:31:55  │
│   #11111  carol · gracias   14:30:12  │
│                                       │
│ [Enter] Open chat  [Esc] Back         │
└───────────────────────────────────────┘
```

- Muestra la lista de `ChatThread` ordenados por último mensaje.
- Navegación con ↑↓ y cursor visual.
- Enter abre el chat seleccionado → cambia a vista detalle.
- Usa `selectChatThreads(state)` del SDK.

#### `ChatDetail.tsx` — nuevo

```
┌──────────────────────────────────────────┐
│ Chat #12345 — alice                      │
│──────────────────────────────────────────│
│ 14:30:01  alice: Hola!                   │
│ 14:30:02  🤖 bot: Next hole! Join & ...  │
│ 14:31:05  alice: /rb_aleph               │
│ 14:31:06  🤖 bot [rb_aleph]: Next hole!  │
│ ...                                      │
│                                          │
│ [Esc] Back to list  [↑↓] Scroll         │
└──────────────────────────────────────────┘
```

- Muestra `ChatMessage[]` del chat seleccionado.
- Usa `selectChatMessages(state, chatId)` del SDK.
- Diferencia visual entre mensajes del usuario y del bot (color/icono).
- Esc vuelve a la lista.
- Scroll con ↑↓ si hay más mensajes de los que caben.

#### Estado local del panel Chats

```typescript
// Estado local del panel (dentro de ChatList/ChatDetail wrapper)
interface ChatPanelState {
  /** null = vista lista; number = chatId abierto */
  selectedChat: number | null;
  /** Índice del cursor en la lista */
  cursorIndex: number;
  /** Offset de scroll en la vista detalle */
  scrollOffset: number;
}
```

Este estado es local al componente (React `useState`), no pasa por el store del SDK.

### 3.5 Flujo de datos

```
RuntimeEmitter
  ├─ "message" event ──────→ emitter-bridge → state.messages[]
  ├─ "command-response" ───→ emitter-bridge → state.commandResponses[]
  └─ "chat-tracked" ──────→ emitter-bridge → state.chatIds[]
                                    │
                                    ▼
                              Store<DashboardState>
                                    │
                              ┌─────┴─────┐
                              │           │
                    selectChatThreads()  selectChatMessages(chatId)
                              │           │
                              ▼           ▼
                          ChatList    ChatDetail
```

No se añade estado nuevo al store — los selectores derivan todo de los campos ya existentes (`messages`, `commandResponses`, `chatIds`).

---

## 4. Desglose de implementación

### §4.1 Tipos `ChatMessage` + `ChatThread` en `src/core/store.ts`

- Añadir ambos tipos debajo de `CommandResponseEntry`.
- No rompe ningún contrato existente.

### §4.2 Selectores `selectChatThreads` + `selectChatMessages` en `src/core/chat-selectors.ts`

- Archivo nuevo con funciones puras.
- Test unitario: dado un state con N messages y M commandResponses, verificar agrupación, orden, y direction.

### §4.3 Exportar tipos y selectores desde `src/index.ts`

- Añadir exports.

### §4.4 Refactorizar `ChatList.tsx` (vista lista)

- Reemplazar la lógica de agrupación manual por `selectChatThreads(state)`.
- Añadir estado local `cursorIndex` + navegación ↑↓.
- Enter dispara `onSelectChat(chatId)`.
- Mostrar preview: `thread.lastMessage.username: thread.lastMessage.text` truncado.

### §4.5 Crear `ChatDetail.tsx` (vista detalle)

- Recibe `chatId` + `state`.
- Usa `selectChatMessages(state, chatId)`.
- Render de mensajes con colores diferenciados por direction.
- Esc emite `onBack()`.
- Scroll ↑↓ con `scrollOffset`.

### §4.6 Wrapper `ChatPanel.tsx` (orquesta lista ↔ detalle)

- Estado local: `{ selectedChat, cursorIndex, scrollOffset }`.
- Si `selectedChat === null` → render `<ChatList>`.
- Si `selectedChat !== null` → render `<ChatDetail>`.
- Maneja transiciones Enter / Esc.

### §4.7 Tests

- `chat-selectors.test.ts` — unit tests de los selectores.
- Verificar que `selectChatThreads` ordena por último mensaje.
- Verificar que `selectChatMessages` combina y ordena user + bot messages.
- Verificar edge cases: chat sin mensajes, solo command-responses, buffer vacío.

---

## 5. Lo que NO se cubre

| Excluido | Motivo |
|----------|--------|
| Enviar mensajes desde el dashboard al chat real | Requiere `bot.api.sendMessage` con token activo; fuera de scope |
| Persistencia de historial entre reinicios | Los buffers son in-memory; la persistencia es tema de Sprint 5 |
| Búsqueda dentro de mensajes | Feature futura, no necesaria para la vista básica |
| Markdown/HTML rendering de mensajes | Ink no soporta HTML; se muestra texto plano |
| Mostrar attachments/fotos | Ink es text-only |

---

## 6. Criterios de aceptación

| # | Criterio | Validación |
|---|----------|-----------|
| 1 | La pestaña Chats muestra una lista de chats ordenados por último mensaje | Visual: enviar mensajes desde distintos chats, verificar orden |
| 2 | Se puede navegar la lista con ↑↓ y el cursor se mueve visualmente | Visual: teclear flechas, verificar highlight |
| 3 | Enter abre el detalle del chat seleccionado | Visual: enter → timeline de mensajes |
| 4 | El detalle muestra mensajes del usuario y del bot con diferenciación visual | Visual: colores distintos, icono 🤖 para bot |
| 5 | Esc vuelve a la lista de chats | Visual: esc → lista |
| 6 | `selectChatThreads` y `selectChatMessages` son funciones puras del SDK | `import { selectChatThreads } from "heteronimos-semi-asistidos-sdk"` funciona |
| 7 | Tests de selectores pasan (agrupación, orden, direction, edge cases) | `bun test` 0 failures |
| 8 | El SDK compila sin errores tras los cambios | `bun run build:sdk` limpio |
| 9 | Dashboard compila sin errores tras los cambios | `tsc --noEmit` en dashboard limpio |

---

## 7. Dependencias

| Spec | Relación |
|------|----------|
| SDS-09 (UI Bridge) | `BaseRuntimeState`, `Store`, `connectEmitterToStore` — fundamento |
| SDS-12 (Command Execution) | `CommandResponseEntry`, `command-response` event — se usa para mensajes bot |
| SDS-07 (Mock Telegram) | `MockTelegramBot.simulateCommand()` genera las command-responses |

---

## 8. Riesgos

| Riesgo | Impacto | Mitigación |
|--------|---------|-----------|
| Selectores recalculan en cada render | Puede haber re-renders costosos con muchos mensajes | Memoizar con `useMemo` en los componentes; los selectores son puros |
| Buffer circular pierde mensajes antiguos | El detalle de un chat podría tener huecos | Documentar en README; la persistencia es tema de Sprint 5 |
| `ChatMessage.direction` depende de matching por timestamp | Si un message y un command-response coinciden en chat+timestamp se podría confundir | Poco probable; timestamps del SDK tienen ms resolution |
| Scroll en Ink puede ser limitado | Ink no tiene scroll nativo | Implementar scroll manual con offset + slice visible |
