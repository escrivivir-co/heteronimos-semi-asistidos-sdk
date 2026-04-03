# SDS-15 · Multi-Scope Command Sync (Groups)

> **heteronimos-semi-asistidos-sdk** · Software Design Specification
> Estado: DRAFT · target: v0.4.0

---

## 1. Objetivo

Que `syncCommandsWithTelegram()` registre los comandos del bot también con scope `all_group_chats`, para que el menú `/` aparezca en grupos y supergrupos — no solo en chats privados.

**Problema actual:** `setMyCommands(cmds)` se llama sin `scope`, lo que equivale a `BotCommandScopeDefault`. En muchos clientes Telegram el menú `/` no aparece en grupos a menos que los comandos estén registrados explícitamente con `{ type: "all_group_chats" }`.

**Solución:** Iterar sobre dos scopes (`default` + `all_group_chats`) en la misma función de sync, reutilizando la lógica de diff y confirmación existente.

---

## 2. Estado actual

| Pieza | Estado | Ubicación |
|-------|--------|-----------|
| `syncCommandsWithTelegram()` | Sincroniza **solo** scope default | `src/core/command-handler.ts` |
| `SyncOptions` | `autoConfirm`, `confirmFn` — sin campo de scopes | `src/core/command-handler.ts` |
| `syncCommands()` (orquestador) | Delega a `syncCommandsWithTelegram`, emite `commands-synced` | `src/core/bot-handler.ts` |
| `MockTelegramBot.api` | `getMyCommands()` / `setMyCommands()` sin soporte de scope | `src/core/mock-telegram.ts` |
| Tests | `command-handler.test.ts` prueba sync contra mock — sin scopes | `tests/` |

---

## 3. Diseño

### 3.1 Algoritmo de resolución de Telegram (referencia)

Telegram resuelve qué comandos mostrar en un grupo con esta cascada:

```
botCommandScopeChatMember + language_code
botCommandScopeChatMember
botCommandScopeChatAdministrators + language_code
botCommandScopeChatAdministrators
botCommandScopeChat + language_code
botCommandScopeChat
botCommandScopeAllGroupChats + language_code
botCommandScopeAllGroupChats          ← AQUÍ
botCommandScopeDefault + language_code
botCommandScopeDefault                ← HOY solo aquí
```

Si no hay comandos en ningún scope específico, Telegram cae al `default`. En la práctica, muchos clientes no muestran el menú `/` en grupos si solo hay scope default.

### 3.2 Cambio en `syncCommandsWithTelegram`

```typescript
// ANTES — un solo scope implícito
remoteCmds = await bot.api.getMyCommands();
// ...
await bot.api.setMyCommands(localCmds);

// DESPUÉS — itera scopes
const scopes = options?.scopes ?? [
  { type: "default" },
  { type: "all_group_chats" },
];

for (const scope of scopes) {
  const remote = await bot.api.getMyCommands({ scope });
  if (commandsMatch(localCmds, remote)) continue;

  logCommandsDiff(localCmds, remote);
  // Confirmar una sola vez (no por scope)
  if (!confirmed) {
    confirmed = options.autoConfirm || await doConfirm("Proceed to update BotFather commands?");
    if (!confirmed) return false;
  }

  await bot.api.setMyCommands(localCmds, { scope });
  log.info(`Commands synced for scope: ${scope.type}`);
}
```

### 3.3 `SyncOptions` ampliado

```typescript
export interface SyncOptions {
  autoConfirm?: boolean;
  confirmFn?: (question: string) => Promise<boolean>;
  /** Scopes de Telegram para registrar comandos.
   *  Default: [{ type: "default" }, { type: "all_group_chats" }] */
  scopes?: BotCommandScope[];
}

/** Scope de visibilidad de comandos (subconjunto de la API Telegram). */
export type BotCommandScope =
  | { type: "default" }
  | { type: "all_private_chats" }
  | { type: "all_group_chats" }
  | { type: "all_chat_administrators" };
```

El default cambia de "solo default" a "default + all_group_chats". Esto es **backward compatible** porque antes no existía el campo `scopes` — el consumidor que no lo especificaba ya estaba aceptando el comportamiento implícito (solo default), y ahora obtiene un comportamiento más completo.

Si alguien explícitamente quiere solo private chats, pasa `scopes: [{ type: "default" }]`.

### 3.4 Mock — soporte de scope

`MockTelegramBot.api` necesita scope-awareness mínimo:

```typescript
// Storage interno: Map<string, BotCommand[]> en vez de BotCommand[]
private commandsByScope = new Map<string, BotCommand[]>();

readonly api = {
  getMyCommands: async (opts?: { scope?: BotCommandScope }) => {
    const key = opts?.scope?.type ?? "default";
    return [...(this.commandsByScope.get(key) ?? [])];
  },
  setMyCommands: async (commands: BotCommand[], opts?: { scope?: BotCommandScope }) => {
    const key = opts?.scope?.type ?? "default";
    this.commandsByScope.set(key, [...commands]);
  },
  // sendMessage sin cambios
};
```

### 3.5 `syncCommands` (bot-handler.ts) — sin cambios funcionales

`syncCommands` ya delega a `syncCommandsWithTelegram` y pasa `SyncOptions`. Como `scopes` ahora es parte de `SyncOptions`, fluye automáticamente. Solo necesita actualizar el evento `commands-synced` para reflejar cuántos scopes se actualizaron:

```typescript
emitter?.emit({
  type: "commands-synced",
  commandCount: commands.length,
  timestamp: new Date().toISOString(),
});
```

No hace falta añadir un nuevo evento; el existente `commands-synced` sigue siendo correcto.

---

## 4. Cambios por archivo

| Archivo | Cambio |
|---------|--------|
| `src/core/command-handler.ts` | `BotCommandScope` type, `scopes` en `SyncOptions`, loop de scopes en `syncCommandsWithTelegram` |
| `src/core/mock-telegram.ts` | `commandsByScope: Map`, `getMyCommands`/`setMyCommands` con `scope?` |
| `src/index.ts` | Exportar `BotCommandScope` |
| `tests/command-handler.test.ts` | Tests de multi-scope sync |
| `tests/mock-telegram.test.ts` | Tests de scope-aware get/set |

**No se tocan:** `boot.ts`, `bot-handler.ts`, `chat-tracker.ts`, `runtime-emitter.ts`, `emitter-bridge.ts`, dashboard.

---

## 5. Criterios de aceptación

1. Al arrancar con `syncCommands`, los comandos se registran en scope `default` y `all_group_chats`.
2. En Telegram, al escribir `/` en un grupo donde está el bot, aparece el menú de comandos.
3. `getMyCommands({ scope: { type: "all_group_chats" } })` retorna los mismos comandos que el scope default.
4. Si los comandos ya están sincronizados en ambos scopes, no se hace ninguna llamada a `setMyCommands`.
5. La confirmación interactiva se pide **una sola vez** (no una por scope).
6. El consumidor puede pasar `scopes: [{ type: "default" }]` para mantener el comportamiento anterior.
7. Mock soporta scopes — tests pasan sin bot real.
8. Full test suite verde.

---

## 6. Tests

| Suite | Tests nuevos |
|-------|-------------|
| `command-handler.test.ts` | Sync registra en ambos scopes; skip si ya sincronizado; custom scopes override; confirmación una sola vez |
| `mock-telegram.test.ts` | `getMyCommands({ scope })` devuelve por scope; `setMyCommands(cmds, { scope })` almacena por scope; scopes independientes |
| `barrel.test.ts` | `BotCommandScope` existe como export |
