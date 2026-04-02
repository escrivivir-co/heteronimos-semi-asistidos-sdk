# SDS-03 · Análisis de Acoplamiento

> Identificación de dependencias problemáticas en la base actual
> y propuestas concretas de desacoplo para cada una.

---

## 1. Mapa de dependencias actual

```
src/main.ts
  ├─ grammy.Bot
  ├─ config.ts ──→ process.env (THROW on import!)
  ├─ core/bot-handler.ts
  │    ├─ grammy.Bot, grammy.Context
  │    ├─ core/command-handler.ts
  │    │    ├─ grammy.Bot, grammy.Context
  │    │    └─ core/logger.ts ──→ readline, process.env
  │    ├─ core/menu-handler.ts
  │    │    └─ grammy.Bot, grammy.InlineKeyboard
  │    ├─ core/logger.ts ──→ readline, process.env
  │    └─ core/chat-tracker.ts ──→ fs, path, __dirname
  ├─ core/chat-tracker.ts
  └─ bots/rabbit-bot.ts (demo)
```

---

## 2. Problemas identificados

### P1 · `config.ts` lanza en import-time

**Severidad**: 🔴 Crítica

```ts
// config.ts
export const TOKEN = requireEnv("BOT_TOKEN");  // THROW si no existe
```

Si el barrel (`src/index.ts`) importa cualquier módulo que transitivamente importe `config.ts`, el paquete explota al hacer `import ... from "heteronimos-semi-asistidos-sdk"` en un entorno sin `BOT_TOKEN`.

**Estado actual**: `config.ts` NO es importado por ningún módulo de `core/`. Solo lo importa `main.ts`. ✅ No es un riesgo inmediato.

**Riesgo latente**: Si por error un refactor futuro añade un import de config en core, se rompe todo.

**Acción**: Excluir `config.ts` del barrel. Mover a `examples/`. Documentar este riesgo como invariante del SDK ("ningún módulo de `src/core/` debe importar `config.ts`").

---

### P2 · `ChatTracker` con path hardcoded via `__dirname`

**Severidad**: 🔴 Crítica

```ts
const CHATS_FILE = path.join(__dirname, "..", ".chats.json");
```

- `__dirname` en ESM es `undefined` en Node.js nativo (requiere `import.meta.dirname` o el polyfill de Bun).
- La ruta asume la estructura de directorios del repo, no la del consumidor.
- Un servicio empaquetado con bundler (webpack, esbuild) no tiene `__dirname` coherente.

**Acción**: Inyectar la ruta o estrategia de persistencia via constructor (ver [SDS-02 §2.5](02-type-surface.md#25-chattracker--persistencia-desacoplada)).

---

### P3 · `confirm()` bloquea en entornos sin TTY

**Severidad**: 🟠 Alta

```ts
// logger.ts
export function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  // ...
}
```

`syncCommandsWithTelegram` llama a `confirm()`. En un Docker container, CI runner, MCP server, o cualquier proceso sin stdin, esto:
- Se queda colgado indefinidamente, o
- Lanza error si stdin no está disponible.

**Llamadores**:
```
syncCommandsWithTelegram()  ──→  confirm()
   ↑
syncCommands()  (bot-handler.ts)
   ↑
main.ts (app code)
```

**Acción**: `syncCommandsWithTelegram` acepta `SyncOptions.autoConfirm` o `SyncOptions.confirmFn`. `confirm()` deja de exportarse desde el barrel (ver [SDS-02 §2.4](02-type-surface.md#24-logger--confirm--infraestructura-transversal)).

---

### P4 · `Logger` acoplado a `process.env` y `console.*`

**Severidad**: 🟡 Media

```ts
function getGlobalLevel(): LogLevel {
  const env = (process.env.LOG_LEVEL || "info").toLowerCase();
  // ...
}
```

Se lee en cada llamada a log. No hay forma de:
- Setear nivel programáticamente sin mutar `process.env`.
- Redirigir output a un transporte distinto de `console`.
- Desactivar colores ANSI en entornos que no los soportan.

**Impacto real**: Para el Segmento B (integrador) esto es una molestia menor. Para el Segmento C (headless/MCP) puede generar ruido o logs malformados.

**Acción**: Añadir `LoggerOptions` al constructor (ver [SDS-02 §2.4](02-type-surface.md#24-logger--confirm--infraestructura-transversal)). Mantener el fallback a `process.env.LOG_LEVEL` para backwards compat.

---

### P5 · `registerPlugins` requiere `ChatTracker` como arg obligatorio

**Severidad**: 🟡 Media

```ts
export function registerPlugins(bot: Bot, plugins: BotPlugin[], tracker: ChatTracker)
```

Un consumidor que no necesita tracking de chats (e.g., un bot stateless, un test) está obligado a pasar un `ChatTracker`. Esto acopla la orquestación a la persistencia.

**Acción**: Hacer `tracker` opcional.

```ts
export function registerPlugins(
  bot: Bot,
  plugins: BotPlugin[],
  tracker?: ChatTracker,
): void
```

Si no se pasa tracker, no se registra el middleware de tracking. Simple.

---

### P6 · `handleCommand` encapsula reply con entities

**Severidad**: 🟢 Baja

```ts
await ctx.reply(text, { entities: ctx.message?.entities });
```

Reenvía las entities del mensaje original como entities de la respuesta. Esto es un comportamiento inesperado si `buildText` devuelve texto completamente distinto al input. En la práctica no parece causar bugs, pero es semántica frágil.

**Acción**: Evaluar si `entities` realmente debe propagarse. Si se implementa `HandlerReply` con `parseMode`, las entities manuales pierden sentido (el parse_mode genera entities automáticamente). Mantener como "revisar en implementación".

---

### P7 · grammY como dependency vs peerDependency

**Severidad**: 🟡 Media (decisión arquitectónica)

```json
// ACTUAL package.json
"dependencies": { "grammy": "^1.11.2" }
```

Si el SDK publica grammY como dependency:
- El consumidor puede acabar con 2 versiones de grammY (la suya y la del SDK).
- `instanceof Bot` falla si vienen de instancias distintas del paquete.

Si grammY es peerDependency:
- El consumidor instala una sola versión.
- El SDK declara el rango compatible (`"grammy": "^1.11.0"`).
- `Bot` y `Context` se comparten correctamente.

**Acción**: Mover a `peerDependencies` con rango `>=1.11.0`. Re-exportar `Bot` y `Context` desde el barrel para ergonomía.

---

### P8 · Módulo `menu-handler` hardcodea `parse_mode: "HTML"`

**Severidad**: 🟢 Baja

```ts
await ctx.reply(entry.text, { parse_mode: "HTML", reply_markup: ... });
```

Si un plugin define texto en Markdown, se renderiza mal (o falla).

**Acción**: Añadir `parseMode?` a `MenuPage` (default `"HTML"` para backwards compat). Ver [SDS-02 §2.3](02-type-surface.md#23-menudefinition-y-familia--el-sistema-de-teclados-inline).

---

## 3. Grafo de desacoplo: orden de resolución

Los problemas tienen dependencias entre sí. Este es el orden óptimo:

```
P1 (config.ts) ─────────→ Se resuelve al mover a examples/
          │                  No requiere cambios en core.
          ▼
P7 (peerDep grammY) ────→ Cambio en package.json.
          │                  Habilita re-exports limpios.
          ▼
P2 (ChatTracker path) ──→ Nuevo ChatStore interface.
P5 (tracker obligatorio)    tracker? opcional en registerPlugins.
          │                  Se resuelven juntos.
          ▼
P3 (confirm TTY) ───────→ SyncOptions en syncCommandsWithTelegram.
P4 (Logger env/console)     LoggerOptions en constructor.
          │                  Se pueden hacer en paralelo.
          ▼
P6 (entities) ──────────→ Se resuelve con HandlerReply.
P8 (parseMode HTML)         Se resuelve con MenuPage.parseMode.
                             Estos son refinamientos del tipo unificado.
```

---

## 4. Invariantes del SDK (post-desacoplo)

Reglas que deben cumplirse siempre:

1. **Ningun módulo de `src/core/` importa `config.ts`.**
2. **Ningún export del barrel tiene side effects en import-time** (no lee env, no abre archivos, no lanza excepciones).
3. **`ChatTracker` funciona sin filesystem** (con `MemoryChatStore` por defecto).
4. **`syncCommandsWithTelegram` funciona sin stdin** (con `autoConfirm` o `confirmFn`).
5. **El SDK compila a JS ESM + .d.ts sin dependencias de bun-types en la API pública.**
6. **`import type` de cualquier símbolo del barrel no ejecuta código.**
