# SDS-01 · Segmentos de Consumidor

> Cada segmento tiene necesidades distintas sobre la superficie de tipos del SDK.

---

## Segmento A · Plugin Author

**Quién**: Desarrollador que crea un bot nuevo como plugin. No toca el core. Solo implementa `BotPlugin` y lo entrega para que otro lo monte.

**Importa**:
```ts
import type {
  BotPlugin,
  CommandDefinition,
  MenuDefinition, MenuPage, NavButton, UrlButton,
} from "heteronimos-semi-asistidos-sdk";
import type { Context } from "heteronimos-semi-asistidos-sdk"; // re-export
```

**No necesita**: `registerPlugins`, `syncCommands`, `ChatTracker`, `Logger`, `Bot`.

**Requisitos sobre tipos**:
- `BotPlugin` debe ser una interfaz, no clase abstracta, para no forzar herencia.
- `commands()`, `menus()`, `onMessage()` deben tener firmas explícitas con tipos de retorno documentados en las `.d.ts`.
- `Context` de grammY debe re-exportarse para que el author no tenga que instalar grammY por separado solo para tipar `onMessage(ctx)`.
- Ningún tipo debe forzar un import de Node.js (`fs`, `path`, `readline`).

**Caso de uso típico**:
1. Crea un fichero `my-bot.ts`.
2. Implementa `BotPlugin` con `name`, `pluginCode`, `commands()`.
3. Opcionalmente añade `menus()` y/o `onMessage()`.
4. Entrega el fichero al integrador (o lo publica como paquete propio).

**Riesgos actuales**:
- `CommandDefinition.buildText` recibe `Context` de grammY → si no se re-exporta, el author necesita `grammy` como dep directa.
- `GEvent` está definido dentro de `rabbit-bot.ts` → no afecta al SDK, pero si alguien copia el patrón, podría intentar exportarlo.

---

## Segmento B · Integrador / DevOps

**Quién**: Opera un servicio Node.js (API, microservicio, worker). Quiere montar uno o varios bots de Telegram usando plugins existentes. Controla el token, el entorno, y el ciclo de vida del proceso.

**Importa**:
```ts
import {
  Bot,
  registerPlugins,
  syncCommands,
  ChatTracker,
  Logger,
} from "heteronimos-semi-asistidos-sdk";
```

**No necesita**: las interfaces de definición de plugin (las usa indirectamente al instanciar plugins de terceros).

**Requisitos sobre tipos**:
- `registerPlugins(bot, plugins, tracker)` — los tres args tipados con exports del SDK.
- `syncCommands(bot, plugins, tracker)` — igual.
- `ChatTracker` configurable: el integrador decide dónde persistir (fichero, Redis, memoria).
- `Logger` configurable: el integrador puede inyectar su propio nivel y transporte.
- `Bot` re-exportado para no forzar import directo de grammY.
- Todo el bootstrap debe poder hacerse **sin TTY** (sin `confirm()` bloqueante por defecto).

**Caso de uso típico**:
1. `npm install heteronimos-semi-asistidos-sdk grammy`
2. Crea `main.ts`:
   ```ts
   const bot = new Bot(process.env.BOT_TOKEN!);
   const tracker = new ChatTracker({ filePath: "./data/chats.json" });
   const plugins = [new SomePlugin()];
   registerPlugins(bot, plugins, tracker);
   await syncCommands(bot, plugins, tracker);
   bot.start();
   ```
3. Dockeriza, despliega, opera.

**Riesgos actuales**:
- `ChatTracker` usa `__dirname` hardcoded → no funciona fuera de la estructura del repo.
- `syncCommandsWithTelegram` llama a `confirm()` → se cuelga en un container sin stdin.
- `config.ts` lanza `throw` al importarse si no existe `BOT_TOKEN` → si el barrel lo re-exporta por accidente, rompe en import-time.

---

## Segmento C · Headless / MCP Server / CI Pipeline

**Quién**: Automatización sin terminal interactiva. Un MCP server que agrega bots dinámicamente. Un pipeline CI que valida configuración de comandos.

**Importa** (subconjunto selectivo):
```ts
import {
  collectPluginFatherSettings,
  toBotFatherFormat,
  toBotCommands,
  commandsMatch,
} from "heteronimos-semi-asistidos-sdk";
```

**No necesita**: `Bot`, `registerPlugins` (no hay runtime de Telegram). Posiblemente necesita `BotPlugin` y los tipos de definición para montar configuraciones programáticamente.

**Requisitos sobre tipos**:
- Funciones puras como `collectPluginFatherSettings`, `toBotFatherFormat`, `commandsMatch` deben poder importarse **sin efecto lateral** de ningún tipo (ni log, ni fs, ni env).
- Tipos como `BotPlugin`, `CommandDefinition` deben poder importarse sin que se active ningún singleton.
- La confirmación interactiva (`confirm`) no debe ejecutarse nunca en este contexto → necesita opción `autoConfirm: true` o similar.

**Caso de uso típico — MCP server**:
1. Recibe una request: "agrega este plugin al bot X".
2. Instancia el plugin, llama a `collectPluginFatherSettings([plugin])`.
3. Valida con `commandsMatch` contra los comandos actuales.
4. Si hay cambios, llama a `syncCommandsWithTelegram` con `{ autoConfirm: true }`.
5. Responde al cliente con el diff.

**Caso de uso típico — CI pipeline**:
1. Importa plugins, genera settings con `toBotFatherFormat`.
2. Compara contra `bot-father-settings.md` en el repo.
3. Falla el pipeline si hay drift.

**Riesgos actuales**:
- `syncCommandsWithTelegram` requiere `Bot` instanciado → no se puede hacer dry-run sin token.
- Las funciones puras están en el mismo módulo que las que tienen side effects → sin tree-shaking, se arrastra todo.

---

## Segmento D · Tooling / Docs Generator

**Quién**: Scripts de build, generadores de documentación, linters de configuración.

**Importa**:
```ts
import type { BotPlugin, CommandDefinition, MenuDefinition } from "heteronimos-semi-asistidos-sdk";
import { collectPluginFatherSettings, toBotFatherFormat } from "heteronimos-semi-asistidos-sdk";
```

**Requisitos**: Idénticos a Segmento C pero con énfasis en que `import type` funcione sin side effects. El script `build-bot-father-settings.ts` existente ya es un ejemplo de este segmento.

---

## Matriz de uso por tipo/función

| Export | A (Author) | B (Integrador) | C (Headless) | D (Tooling) |
|--------|:---:|:---:|:---:|:---:|
| `BotPlugin` | ✦ | · | · | ○ |
| `CommandDefinition` | ✦ | · | ○ | ✦ |
| `MenuDefinition` + tipos | ✦ | · | ○ | ✦ |
| `Context` (re-export) | ✦ | ○ | · | · |
| `Bot` (re-export) | · | ✦ | · | · |
| `registerPlugins` | · | ✦ | · | · |
| `syncCommands` | · | ✦ | ○ | · |
| `ChatTracker` | · | ✦ | · | · |
| `Logger` | ○ | ✦ | · | · |
| `registerCommands` | · | ○ | · | · |
| `handleCommand` | · | ○ | · | · |
| `registerMenu` | · | ○ | · | · |
| `collectPluginFatherSettings` | · | · | ✦ | ✦ |
| `toBotFatherFormat` | · | · | ✦ | ✦ |
| `toBotCommands` | · | · | ✦ | ○ |
| `commandsMatch` | · | · | ✦ | ○ |
| `syncCommandsWithTelegram` | · | ✦ | ○* | · |
| `confirm` | · | · | · | · |

`✦` = uso principal · `○` = uso ocasional · `·` = no usa · `*` = solo con `autoConfirm`
