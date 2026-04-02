# SDS-15 · Group Command Sync & Chat Validation

> **heteronimos-semi-asistidos-sdk** · Software Design Specification
> Estado: DRAFT · target: v0.4.0

---

## 1. Objetivo

Que los comandos del bot aparezcan en el menú `/` de **grupos y supergrupos**, no solo en chats privados. Además, validar al arranque que todos los chats persistidos siguen siendo accesibles — enriqueciendo `.chats.json` con metadatos (tipo, título, estado del bot) y exponiendo el resultado en la dashboard.

**Motivación:**

- `syncCommandsWithTelegram()` llama a `setMyCommands(cmds)` sin `scope`, que registra con `BotCommandScopeDefault`. En la práctica, muchos clientes Telegram no muestran el menú `/` en grupos a menos que se registren comandos explícitamente con scope `all_group_chats`.
- `.chats.json` almacena solo IDs numéricos sin metadata — no se sabe si un chat es privado, grupo o supergrupo, ni si el bot sigue siendo miembro.
- No hay forma de validar la salud de los chats al arrancar — un chat donde el bot fue expulsado sigue en la lista indefinidamente.
- La dashboard muestra `#chatId` sin contexto; el usuario no puede distinguir un DM de un grupo.

---

## 2. Estado actual

### 2.1 Lo que existe

| Pieza | Estado | Ubicación |
|-------|--------|-----------|
| `syncCommandsWithTelegram()` | Sincroniza con scope **default** (solo private chats garantizados) | `src/core/command-handler.ts` |
| `ChatTracker` | Persiste array de `number[]` en JSON | `src/core/chat-tracker.ts` |
| `ChatStore` interface | `load(): number[]`, `save(chatIds: number[])` | `src/core/chat-tracker.ts` |
| `FileChatStore` | Lee/escribe JSON plano de `number[]` | `src/core/chat-tracker.ts` |
| `ChatList` componente | Muestra `#chatId` + último mensaje | `examples/dashboard/components/ChatList.tsx` |
| `bootBot()` | Llama `syncCommands` → `setMyCommands(cmds)` sin scope | `src/core/boot.ts` |

### 2.2 Brechas

1. **Sin scope de grupo** — `setMyCommands` no envía `{ scope: { type: "all_group_chats" } }`.
2. **Sin validación al arranque** — chats muertos persisten para siempre.
3. **Sin metadatos de chat** — sin tipo, título ni estado de membresía.
4. **Sin evento `my_chat_member`** — el SDK no reacciona a ser añadido/expulsado de grupos.
5. **Dashboard ciega** — no diferencia grupo de DM, no puede disparar re-sync.

---

## 3. Diseño

### 3.1 Estrategia de scopes — Multi-scope sync

Telegram resuelve comandos en grupos con este fallback:

```
botCommandScopeChatMember → botCommandScopeChatAdministrators
→ botCommandScopeChat → botCommandScopeAllGroupChats
→ botCommandScopeDefault
```

**Opción elegida:** Registrar comandos en **dos scopes** durante el sync:

1. `BotCommandScopeDefault` (ya existente) — cubre private chats.
2. `BotCommandScopeAllGroupChats` — cubre todos los grupos y supergrupos.

Así, el menú `/` funciona en ambos contextos sin necesidad de configuración per-chat.

```typescript
// command-handler.ts — syncCommandsWithTelegram ampliado
const scopes: BotCommandScope[] = [
  { type: "default" },
  { type: "all_group_chats" },
];

for (const scope of scopes) {
  const remote = await bot.api.getMyCommands({ scope });
  if (!commandsMatch(localCmds, remote)) {
    await bot.api.setMyCommands(localCmds, { scope });
  }
}
```

**Alternativas descartadas:**

| Opción | Por qué no |
|--------|-----------|
| Per-chat `BotCommandScopeChat` | Requiere una llamada API por cada grupo conocido; O(n) API calls al arrancar. |
| Solo `BotCommandScopeDefault` | Es el estado actual; no garantiza visibilidad en clientes con grupos. |
| `deleteMyCommands` de scopes viejos | Innecesario si siempre registramos los dos scopes; además rompería bots que usan scopes específicos por otras razones. |

### 3.2 Chat metadata enriquecido

Ampliar el modelo persistido:

```typescript
/** Metadata mínima de un chat conocido. */
export interface ChatInfo {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;        // grupos/supergrupos/canales
  username?: string;      // si tiene @username
  firstName?: string;     // private chats
  /** Estado del bot en este chat. null = no verificado aún. */
  botStatus?: "member" | "administrator" | "left" | "kicked" | null;
  /** Timestamp ISO de la última verificación exitosa. */
  lastVerified?: string;
}
```

**Migración:** `FileChatStore` detecta si el JSON cargado es `number[]` (formato v1) o `ChatInfo[]` (formato v2). Si es v1, migra automáticamente a v2 manteniendo los IDs y poniendo `type: "private"` + `botStatus: null` como defaults.

### 3.3 Validación al arranque

Nueva función `validateChats()`:

```typescript
export interface ValidateChatResult {
  valid: ChatInfo[];    // chats accesibles con metadata fresca
  stale: ChatInfo[];    // chats donde getChat falló (bot expulsado, chat borrado)
}

export async function validateChats(
  bot: Bot,
  chatInfos: ChatInfo[],
): Promise<ValidateChatResult> {
  const valid: ChatInfo[] = [];
  const stale: ChatInfo[] = [];

  for (const info of chatInfos) {
    try {
      const fresh = await bot.api.getChat(info.id);
      valid.push({
        id: info.id,
        type: fresh.type,
        title: fresh.title,
        username: fresh.username,
        firstName: fresh.first_name,
        botStatus: "member", // si getChat retorna, el bot tiene acceso
        lastVerified: new Date().toISOString(),
      });
    } catch {
      stale.push({ ...info, botStatus: "left", lastVerified: new Date().toISOString() });
    }
  }

  return { valid, stale };
}
```

**Rate limiting:** `getChat` se ejecuta secuencialmente. Con pocos chats (<50) no es problema. Para bots con muchos chats, se puede añadir un delay configurable (futuro).

### 3.4 Evento `my_chat_member` — tracking reactivo

Escuchar `my_chat_member` permite saber **cuándo** el bot es añadido o expulsado de un grupo:

```typescript
// chat-tracker.ts — nuevo método
registerMemberUpdates(bot: Bot) {
  bot.on("my_chat_member", (ctx) => {
    const chat = ctx.myChatMember.chat;
    const newStatus = ctx.myChatMember.new_chat_member.status;

    if (newStatus === "member" || newStatus === "administrator") {
      this.trackWithInfo({
        id: chat.id,
        type: chat.type,
        title: chat.title,
        username: chat.username,
        botStatus: newStatus,
        lastVerified: new Date().toISOString(),
      });
    } else if (newStatus === "left" || newStatus === "kicked") {
      this.markStale(chat.id, newStatus);
    }
  });
}
```

**Requisito:** Para recibir `my_chat_member`, el bot necesita `allowed_updates` que lo incluya. grammY lo incluye por defecto en polling.

### 3.5 Nuevos `RuntimeEvent`

```typescript
// Emitido cuando se validan los chats al arranque
export interface ChatsValidatedEvent {
  type: "chats-validated";
  valid: number;
  stale: number;
  timestamp: string;
}

// Emitido cuando el bot es añadido/expulsado de un chat
export interface ChatMemberChangedEvent {
  type: "chat-member-changed";
  chatId: number;
  chatType: string;
  chatTitle?: string;
  newStatus: string;
  timestamp: string;
}

// Emitido cuando los comandos se sincronizan con un scope específico
export interface CommandsScopeSyncedEvent {
  type: "commands-scope-synced";
  scope: string;   // "default" | "all_group_chats"
  count: number;
  timestamp: string;
}
```

### 3.6 `SyncOptions` ampliado

```typescript
export interface SyncOptions {
  autoConfirm?: boolean;
  confirmFn?: (question: string) => Promise<boolean>;
  /** Scopes para los que registrar comandos. Default: ["default", "all_group_chats"] */
  scopes?: Array<"default" | "all_group_chats" | "all_chat_administrators">;
}
```

**Default:** `["default", "all_group_chats"]` — cambia el comportamiento actual que solo registra el scope default.

### 3.7 `ChatStore` v2

```typescript
/** Contrato de almacenamiento v2 — soporta metadata. */
export interface ChatStoreV2 {
  load(): ChatInfo[] | Promise<ChatInfo[]>;
  save(chats: ChatInfo[]): void | Promise<void>;
}
```

`FileChatStore` implementa ambos (`ChatStore` y `ChatStoreV2`) con auto-migración. La interfaz original `ChatStore` se mantiene como deprecated para backward compat. `ChatTracker` pasa a usar `ChatStoreV2` internamente.

### 3.8 `BaseRuntimeState` ampliado

```typescript
// store.ts — nuevos campos
export interface BaseRuntimeState {
  // ... campos existentes ...
  /** Detalle de chats conocidos con metadata. */
  chatInfos: ChatInfo[];
  /** Número de chats verificados como accesibles. */
  validChatCount: number;
  /** Número de chats stale (bot expulsado, chat borrado). */
  staleChatCount: number;
}
```

### 3.9 `emitter-bridge.ts` — nuevos reducers

```typescript
case "chats-validated":
  return {
    ...state,
    validChatCount: event.valid,
    staleChatCount: event.stale,
  };

case "chat-member-changed":
  // Actualizar chatInfos con el nuevo estado
  return {
    ...state,
    chatInfos: updateChatInfo(state.chatInfos, event),
  };
```

### 3.10 `bootBot()` — flujo ampliado

```
ensureEnv → crearBot → registerPlugins
  → syncCommands (multi-scope)
  → validateChats (opcional — solo si hay chats persistidos)
  → registerMemberUpdates
  → bot.start()
```

La validación es **opt-in** vía `BootBotOptions`:

```typescript
export interface BootBotOptions {
  // ... campos existentes ...
  /** Validar chats persistidos al arrancar. Default: false */
  validateChatsOnBoot?: boolean;
}
```

### 3.11 Dashboard — panel Chats enriquecido

El componente `<ChatList>` pasa de mostrar `#chatId` a:

```
┌─ Chats (3 valid · 1 stale) ─────────────────────┐
│ 🟢 427058448     private  @alice      12:03      │
│ 🟢 -10038961...  supergrp Test Group  12:01      │
│ 🟢 -10038258...  group    Dev Team    11:45      │
│ 🔴 -10039999...  group    Old Chat    (stale)    │
│                                                   │
│ [r] Re-validate ∙ [s] Sync commands to groups     │
└───────────────────────────────────────────────────┘
```

Keybindings desde el panel Chats:
- `r` — re-validar todos los chats (`validateChats`) — requiere modo Telegram real.
- `s` — forzar re-sync de comandos a todos los scopes.

---

## 4. Resumen de cambios por archivo

### 4.1 SDK core

| Archivo | Cambio |
|---------|--------|
| `src/core/command-handler.ts` | `syncCommandsWithTelegram` acepta `scopes[]`, itera scopes, emite evento por scope |
| `src/core/chat-tracker.ts` | `ChatInfo` interface, `ChatStoreV2`, `validateChats`, `registerMemberUpdates`, auto-migración v1→v2 |
| `src/core/runtime-emitter.ts` | 3 nuevos eventos: `chats-validated`, `chat-member-changed`, `commands-scope-synced` |
| `src/core/store.ts` | `ChatInfo` type export, `chatInfos`, `validChatCount`, `staleChatCount` en `BaseRuntimeState` |
| `src/core/emitter-bridge.ts` | Reducers para nuevos eventos |
| `src/core/boot.ts` | `validateChatsOnBoot` option, llamada a `validateChats` + `registerMemberUpdates` |
| `src/core/mock-telegram.ts` | Mock de `getChat` + `my_chat_member` handler registration |
| `src/index.ts` | Exportar `ChatInfo`, `ChatStoreV2`, `validateChats`, nuevos eventos |

### 4.2 Dashboard

| Archivo | Cambio |
|---------|--------|
| `examples/dashboard/state.ts` | `DashboardState` hereda nuevos campos de `BaseRuntimeState` |
| `examples/dashboard/components/ChatList.tsx` | Vista enriquecida con tipo/título/estado, keybindings `r`/`s` |
| `examples/dashboard/main.tsx` | Pasar `validateChatsOnBoot: true` a `bootBot()` |

### 4.3 Console app

| Archivo | Cambio |
|---------|--------|
| `examples/console-app/main.ts` | Pasar `validateChatsOnBoot: true` opcionalmente |

---

## 5. Opciones de automatización

Hay tres niveles de automatización posibles. Se recomienda implementar los tres progresivamente:

| Nivel | Qué hace | Cuándo | Esfuerzo |
|-------|----------|--------|----------|
| **A. Multi-scope sync** | Registra comandos con `default` + `all_group_chats` | En `syncCommands` al arrancar | Bajo |
| **B. Validación al arranque** | Llama `getChat` para cada chat persistido, enriquece metadata, marca stale | En `bootBot` si `validateChatsOnBoot: true` | Medio |
| **C. Tracking reactivo** | Escucha `my_chat_member` para saber cuándo el bot entra/sale de grupos | Continuo durante polling | Medio |

**Nivel A** resuelve el problema original del menú `/` en grupos.
**Nivel B** resuelve la higiene de datos al reiniciar.
**Nivel C** resuelve el mantenimiento en tiempo real sin necesidad de reiniciar.

---

## 6. Criterios de aceptación

1. Comandos aparecen en el menú `/` de grupos y supergrupos sin configuración manual.
2. `getMyCommands({ scope: { type: "all_group_chats" } })` retorna los mismos comandos que el scope default.
3. `.chats.json` almacena `ChatInfo[]` con tipo, título y estado del bot.
4. Migración automática de `number[]` → `ChatInfo[]` al leer un JSON v1.
5. `validateChats()` clasifica chats en valid/stale.
6. Chats stale se marcan pero no se eliminan (el usuario decide).
7. `my_chat_member` trackea dinámicamente adiciones/expulsiones.
8. Dashboard muestra tipo y título de cada chat, con indicador visual de estado.
9. Keybinding `r` en panel Chats re-valida; `s` re-sincroniza comandos.
10. Mock mode soporta `getChat` mock y `my_chat_member` handler (para tests).
11. Full test suite verde + tests nuevos para cada feature.

---

## 7. Tests

| Suite | Tests nuevos |
|-------|-------------|
| `command-handler.test.ts` | Multi-scope sync: verifica que `setMyCommands` se llama con ambos scopes; getMyCommands por scope |
| `chat-tracker.test.ts` | `ChatInfo` persistence, auto-migración v1→v2, `validateChats` con mocks, `registerMemberUpdates` |
| `emitter-bridge.test.ts` | Reducers para `chats-validated`, `chat-member-changed`, `commands-scope-synced` |
| `runtime-emitter.test.ts` | Nuevos eventos fluyen por streams |
| `mock-telegram.test.ts` | Mock `getChat`, `my_chat_member` handler |
| `barrel.test.ts` | Nuevos exports existen |

---

## 8. Dependencias

- Ninguna dependencia nueva en `package.json`.
- Usa APIs existentes de grammY: `bot.api.getChat()`, `bot.api.setMyCommands()` con `scope`, `bot.on("my_chat_member")`.
- Requiere que el bot tenga `my_chat_member` en `allowed_updates` — grammY lo incluye por defecto en polling mode.

---

## 9. Nota sobre BotFather Privacy Mode

Para que el bot **reciba** mensajes en grupos (no solo comandos dirigidos), Privacy Mode debe estar desactivado:

```
@BotFather → /setprivacy → Disabled
```

Esto es independiente del registro de comandos. Con Privacy Mode **habilitado**, los comandos del menú `/` siguen apareciendo (si están registrados con scope correcto), pero el bot solo recibe mensajes que empiezan con `/` o que son respuestas a sus propios mensajes.

El SDK puede verificar esto al arrancar con `getMe()` → `can_read_all_group_messages`. Si es `false`, emitir un warning en los logs.
