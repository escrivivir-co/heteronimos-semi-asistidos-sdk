# SDS-02 · Superficie de Tipos

> Diseño de la API pública del SDK, organizada para uso selectivo por capas.

---

## 1. Barrel público: `src/index.ts`

Un solo punto de entrada. El consumidor nunca hace deep imports.

```ts
// ─── Tipos de definición (Capa 2 — Plugin Author) ────────
export type { BotPlugin }         from "./core/bot-handler";
export type { CommandDefinition, BotCommand } from "./core/command-handler";
export type {
  MenuDefinition, MenuPage,
  MenuButton, NavButton, UrlButton,
} from "./core/menu-handler";
export type { LogLevel }          from "./core/logger";

// ─── Re-exports de grammY (ergonomía) ────────────────────
export { Bot }                    from "grammy";
export type { Context }           from "grammy";

// ─── Funciones de orquestación (Capa 3 — Integrador) ─────
export { registerPlugins, syncCommands, collectPluginFatherSettings }
  from "./core/bot-handler";

// ─── Funciones de comando ─────────────────────────────────
export {
  registerCommands,
  handleCommand,
  toBotFatherFormat,
  toBotCommands,
  commandsMatch,
  syncCommandsWithTelegram,
}  from "./core/command-handler";

// ─── Menús ────────────────────────────────────────────────
export { registerMenu }           from "./core/menu-handler";

// ─── Infraestructura (Capa 1) ─────────────────────────────
export { Logger }                 from "./core/logger";
export { ChatTracker }            from "./core/chat-tracker";
```

### Principios del barrel

1. **Flat.** No hay subpaths (`/core`, `/menus`). Un solo import.
2. **Type-only cuando posible.** Interfaces y type aliases se exportan con `export type` para facilitar tree-shaking y evitar side effects.
3. **Sin re-export de `config.ts`**, `confirm()` directo, ni nada app-specific.
4. **grammY como peer.** El barrel hace `export { Bot }` y `export type { Context }` para que el author no necesite instalar grammY solo por tipos, pero el integrador sí lo tiene como peer.

---

## 2. Tipos actuales: auditoría y propuestas

### 2.1 `BotPlugin` — el contrato central

```ts
// ACTUAL
interface BotPlugin {
  name: string;
  pluginCode: string;
  commands(): CommandDefinition[];
  menus?(): MenuDefinition[];
  onMessage?(ctx: Context): string | Promise<string>;
}
```

**Análisis**:
- ✅ Es una interfaz, no clase abstracta. Correcto.
- ✅ `menus()` y `onMessage()` son opcionales. Correcto.
- ⚠️ `onMessage` devuelve `string | Promise<string>` — asume texto plano. No soporta respuestas con media, parse_mode, o silenciar respuesta (return `void`).
- ⚠️ `pluginCode` no tiene restricción de formato. Un code con espacios o caracteres especiales rompería los nombres de comando en Telegram.

**Propuesta**:
```ts
interface BotPlugin {
  readonly name: string;
  readonly pluginCode: PluginCode;         // branded type o al menos string restringido
  commands(): CommandDefinition[];
  menus?(): MenuDefinition[];
  onMessage?(ctx: Context): PluginReply;   // tipo extendido
}

/** Código alfanumérico corto, lowercase, sin espacios. */
type PluginCode = string & { readonly __brand: unique symbol };

/** Respuesta de un plugin. void = no responder. */
type PluginReply =
  | string
  | { text: string; parseMode?: "HTML" | "Markdown" }
  | void
  | Promise<string | { text: string; parseMode?: "HTML" | "Markdown" } | void>;
```

**Justificación**: `PluginReply` abre la puerta a parse_mode sin romper la firma actual (string sigue funcionando). `PluginCode` como branded type es verificable en runtime con un helper `asPluginCode()`. Las propiedades `readonly` expresan que no mutan tras construcción.

**Impacto**: Breaking change leve en `onMessage`. Mitigable con overload o union type que incluye el caso `string` actual.

---

### 2.2 `CommandDefinition` — el bloque de construcción

```ts
// ACTUAL
interface CommandDefinition {
  command: string;
  description: string;
  buildText: (ctx: Context) => string | Promise<string>;
}
```

**Análisis**:
- ✅ Mínimo y funcional.
- ⚠️ `buildText` devuelve solo `string`. Mismo problema que `onMessage`: sin parse_mode ni media.
- ⚠️ No hay campo para metadata (categoría, permisos, feature flags). No es necesario ahora, pero un campo `meta?: Record<string, unknown>` dejaría la puerta abierta sin coste.

**Propuesta para v0.1**:
```ts
interface CommandDefinition {
  command: string;
  description: string;
  buildText: (ctx: Context) => CommandReply;
  /** Metadata extensible. No afecta al runtime del SDK. */
  meta?: Record<string, unknown>;
}

type CommandReply =
  | string
  | { text: string; parseMode?: "HTML" | "Markdown" }
  | Promise<string | { text: string; parseMode?: "HTML" | "Markdown" }>;
```

**Nota**: `meta` es escape hatch deliberado. No es genérico `T` porque forzaría parámetros de tipo en cascada a `BotPlugin<T>`, `registerPlugins<T>`, etc. Un record plano es suficiente para feature flags, RBAC hints, analytics tags.

---

### 2.3 `MenuDefinition` y familia — el sistema de teclados inline

```ts
// ACTUAL
interface NavButton  { label: string; goTo: string; }
interface UrlButton  { label: string; url: string; }
type MenuButton = NavButton | UrlButton;
interface MenuPage   { id: string; text: string; buttons: MenuButton[]; }
interface MenuDefinition {
  command: string;
  description: string;
  entryPage: string;
  pages: MenuPage[];
}
```

**Análisis**:
- ✅ Declarativo, limpio, bien discriminado (`goTo` vs `url`).
- ⚠️ `entryPage` es un `string` que debe coincidir con algún `MenuPage.id`. No hay verificación en tipos. Es un buen candidato para un check en runtime (ya se hace en `registerMenu` con `pageMap.get`), pero no para un generic type complejo.
- ⚠️ `MenuPage.text` asume HTML (`parse_mode: "HTML"` hardcoded en `registerMenu`). Debería declararse explícitamente o parametrizarse.
- ⚠️ No hay `CallbackButton` (botón que dispara un callback custom sin navegar). Es la extensión más natural que pedirá cualquier plugin serio.

**Propuesta para v0.1**:
```ts
interface CallbackButton {
  label: string;
  callback: string;  // callback_data arbitrario
}

type MenuButton = NavButton | UrlButton | CallbackButton;

interface MenuPage {
  id: string;
  text: string;
  parseMode?: "HTML" | "Markdown";  // default "HTML" para backwards compat
  buttons: MenuButton[];
}
```

**Impacto**: Additive. `CallbackButton` es un nuevo variant del union. Código existente no lo genera, `isNavButton` sigue funcionando. `parseMode` tiene default que preserva el comportamiento actual.

---

### 2.4 `Logger` & `confirm` — infraestructura transversal

```ts
// ACTUAL
class Logger { constructor(scope: string); info(); warn(); error(); debug(); child(); }
function confirm(question: string): Promise<boolean>;
type LogLevel = "debug" | "info" | "warn" | "error";
```

**Análisis**:
- ⚠️ `Logger` lee `process.env.LOG_LEVEL` en cada llamada → no hay forma de inyectar nivel programáticamente.
- ⚠️ `confirm()` es función libre que abre `readline` → bloqueante en headless, no mockeable sin monkey-patch.
- ⚠️ `Logger` usa `console.*` directamente → no hay forma de redirigir a un transporte custom (archivo, CloudWatch, etc.).
- ⚠️ Usa ANSI colors → no todo entorno los soporta.

**Propuesta de interfaz para v0.1**:
```ts
interface LoggerOptions {
  level?: LogLevel;                        // override de process.env.LOG_LEVEL
  transport?: (entry: LogEntry) => void;   // custom output
  colors?: boolean;                        // default: auto-detect TTY
}

interface LogEntry {
  level: LogLevel;
  scope: string;
  message: string;
  args: unknown[];
  timestamp: Date;
}

class Logger {
  constructor(scope: string, options?: LoggerOptions);
  child(subscope: string): Logger;         // hereda options del padre
}
```

**Sobre `confirm`**:
No exportar `confirm` en el barrel. Es un detalle de implementación de `syncCommandsWithTelegram`. En su lugar, `syncCommandsWithTelegram` acepta una opción:

```ts
interface SyncOptions {
  /** Si true, aplica cambios sin pedir confirmación. Default: false. */
  autoConfirm?: boolean;
  /** Función custom para confirmar. Default: readline prompt. */
  confirmFn?: (question: string) => Promise<boolean>;
}

function syncCommandsWithTelegram(
  bot: Bot,
  commands: CommandDefinition[],
  options?: SyncOptions,
): Promise<boolean>;
```

**Impacto**: El integrador estándar no nota cambio (default = readline). El headless/MCP pasa `{ autoConfirm: true }`. CI puede pasar `{ confirmFn: () => Promise.resolve(false) }` para dry-run.

---

### 2.5 `ChatTracker` — persistencia desacoplada

```ts
// ACTUAL
class ChatTracker {
  constructor();   // lee .chats.json desde __dirname
  track(chatId: number): void;
  getAll(): number[];
  register(bot: Bot): void;
  broadcast(bot: Bot, message: string): Promise<void>;
}
```

**Análisis**:
- ⚠️ `constructor()` sin parámetros → path hardcoded via `__dirname`.
- ⚠️ `fs.readFileSync` / `fs.writeFileSync` → síncrono, bloqueante.
- ⚠️ No hay forma de usar otro backend (Redis, SQLite, memoria).
- ⚠️ `broadcast` mezcla lógica de persistencia con lógica de envío de Telegram.

**Propuesta — Strategy pattern ligero**:

```ts
/** Contrato mínimo de almacenamiento de chat IDs */
interface ChatStore {
  load(): Promise<number[]> | number[];
  save(chatIds: number[]): Promise<void> | void;
}

/** Implementación por defecto: fichero JSON */
class FileChatStore implements ChatStore {
  constructor(filePath: string);   // el consumidor decide la ruta
  load(): number[];
  save(chatIds: number[]): void;
}

/** Implementación para tests y headless */
class MemoryChatStore implements ChatStore {
  load(): number[] { return []; }
  save(): void {}
}

class ChatTracker {
  constructor(store?: ChatStore);   // default: MemoryChatStore
  track(chatId: number): void;
  getAll(): number[];
  register(bot: Bot): void;
  broadcast(bot: Bot, message: string): Promise<void>;
}
```

**Impacto**: Breaking en constructor (ya no zero-arg por defecto funcional). Mitigable: si no se pasa store, usa `MemoryChatStore` (no persiste). El integrador que quiere persistencia pasa `new FileChatStore("./data/chats.json")`.

---

## 3. Tipos que NO deben entrar en el barrel

| Tipo | Razón |
|------|-------|
| `GEvent` | Específico de RabbitBot. Vive en el ejemplo. |
| `requireEnv` / `optionalEnv` | App-specific. Cada consumidor tiene su estrategia de config. |
| `TOKEN` / `SOLANA_ADDRESS` | Constantes de la app demo. |
| `confirm()` (como export directo) | Detalle de implementación. Se ofrece via `SyncOptions.confirmFn`. |
| `prefixCommands` / `prefixMenus` | Internas del orquestador. No son parte del contrato público. |
| `logCommandsDiff` | Útil internamente, no critical path para ningún segmento. |

---

## 4. Mapa de imports por segmento

### Plugin Author (mínimo)
```ts
import type { BotPlugin, CommandDefinition, MenuDefinition, Context }
  from "heteronimos-semi-asistidos-sdk";
```

### Integrador (full runtime)
```ts
import { Bot, registerPlugins, syncCommands, ChatTracker, FileChatStore, Logger }
  from "heteronimos-semi-asistidos-sdk";
```

### MCP / Headless (sin runtime)
```ts
import { collectPluginFatherSettings, toBotFatherFormat, commandsMatch }
  from "heteronimos-semi-asistidos-sdk";
import type { BotPlugin, CommandDefinition }
  from "heteronimos-semi-asistidos-sdk";
```

### Tooling / Docs
```ts
import { collectPluginFatherSettings, toBotFatherFormat }
  from "heteronimos-semi-asistidos-sdk";
```

---

## 5. Unificación de reply types

Actualmente hay tres sitios donde se define "qué devuelve un handler":

| Lugar | Tipo actual | Propuesta unificada |
|-------|-------------|---------------------|
| `CommandDefinition.buildText` | `(ctx) => string \| Promise<string>` | `(ctx) => CommandReply` |
| `BotPlugin.onMessage` | `(ctx) => string \| Promise<string>` | `(ctx) => PluginReply` |
| `MenuPage.text` | `string` (HTML hardcoded) | `string` + `parseMode?` |

`CommandReply` y `PluginReply` comparten la misma estructura base. Se puede unificar en un solo tipo:

```ts
/** Respuesta textual de un handler. */
type TextReply = string | { text: string; parseMode?: "HTML" | "Markdown" };

/** Respuesta asíncrona. void = no responder. */
type HandlerReply = TextReply | void | Promise<TextReply | void>;
```

Y usarlo en ambos sitios:
- `CommandDefinition.buildText: (ctx: Context) => HandlerReply`
- `BotPlugin.onMessage: (ctx: Context) => HandlerReply`

Esto elimina la divergencia y establece un contrato claro: "si devuelves algo, el SDK lo envía como reply; si devuelves void/undefined, el SDK no hace nada".
