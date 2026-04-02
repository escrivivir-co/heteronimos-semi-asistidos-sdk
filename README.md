# heteronimos-semi-asistidos-sdk

![version](https://img.shields.io/badge/version-0.0.0-blue)
![status](https://img.shields.io/badge/status-pre--kick--off-orange)
![license](https://img.shields.io/badge/license-AIPL-green)
![runtime](https://img.shields.io/badge/runtime-Bun-f472b6)
![tests](https://img.shields.io/badge/tests-27%20passing-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6)

A plugin-based Telegram bot SDK built on [grammY](https://grammy.dev/). Define bots as plugins — commands, menus, message handlers — and compose them into a single runtime.

> **Demo**: [@an_aleph_zero_rabit_23_bot](https://t.me/an_aleph_zero_rabit_23_bot)
> **Docs**: [escrivivir-co.github.io/heteronimos-semi-asistidos-sdk](https://escrivivir-co.github.io/heteronimos-semi-asistidos-sdk)

---

## Quick Start

```bash
# Install Bun (if you don't have it)
curl -fsSL https://bun.sh/install | bash

# Clone
git clone https://github.com/escrivivir-co/heteronimos-semi-asistidos-sdk.git
cd heteronimos-semi-asistidos-sdk/Nodejs

# Install deps
bun install
```

## Bot Token

1. Talk to [@BotFather](https://t.me/BotFather) — [official tutorial](https://core.telegram.org/bots/tutorial)
2. Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```dotenv
BOT_TOKEN=your-bot-token
SOLANA_ADDRESS=your-address
```

`BOT_TOKEN` is required. `SOLANA_ADDRESS` is optional.

## Run

```bash
bun run dev            # watch mode
bun run dev:verbose    # watch + LOG_LEVEL=debug
bun run start          # single run
```

## Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Watch mode (auto-reload) |
| `bun run dev:verbose` | Watch + debug logging |
| `bun run start` | Run once |
| `bun run build` | Bundle to `dist/` |
| `bun run dist` | Run bundled output |
| `bun run lint` | Type-check (tsc --noEmit) |
| `bun run bot-father-settings` | Generate `bot-father-settings.md` |
| `bun run test` | Run unit tests |
| `bun run test:report` | Tests + JUnit XML report |
| `bun run test:coverage` | Tests + coverage report |
| `bun run release <patch\|minor\|major>` | Bump version, tag, commit |

---

## Architecture

The SDK follows a **bot-of-bots** pattern. Each bot is a plugin (`BotPlugin`) that declares its own commands, menus, and message handlers. The core wires them together, prefixing commands with a plugin code to avoid collisions.

```
src/
├── main.ts                     ← entry point
├── config.ts                   ← env-var loader (BOT_TOKEN, etc.)
├── core/
│   ├── bot-handler.ts          ← BotPlugin interface + orchestrator
│   ├── command-handler.ts      ← command registration + Telegram sync
│   ├── menu-handler.ts         ← inline keyboard menus (declarative)
│   ├── chat-tracker.ts         ← persistent chat tracking + broadcast
│   └── logger.ts               ← scoped logger with LOG_LEVEL
└── bots/
    └── rabbit-bot.ts           ← example plugin (pluginCode = "rb")
scripts/
├── build-bot-father-settings.ts
└── release.ts
tests/
└── *.test.ts
```

### Plugin Flow

```
BotPlugin.commands()  →  prefixed (rb_aleph, rb_join...)  →  registered in grammY
BotPlugin.menus()     →  prefixed (rb_menu)               →  inline keyboard handlers
BotPlugin.onMessage() →  fallback handler                 →  replies to any text
```

On startup, `syncCommands()` diffs local commands against Telegram's `getMyCommands()`, prompts on changes, and broadcasts an update notification to tracked chats.

---

## Creating a Plugin

Implement the `BotPlugin` interface:

```ts
import { BotPlugin } from "./core/bot-handler";
import { CommandDefinition } from "./core/command-handler";

export class MyBot implements BotPlugin {
  name = "my-bot";
  pluginCode = "mb";  // commands will be: mb_hello, mb_info, etc.

  commands(): CommandDefinition[] {
    return [
      {
        command: "hello",
        description: "Say hello",
        buildText: (ctx) => `Hello, ${ctx.from?.first_name}!`,
      },
    ];
  }

  // Optional: menus(), onMessage()
}
```

Register it in `main.ts`:

```ts
const plugins = [
  new RabbitBot(SOLANA_ADDRESS),
  new MyBot(),
];
```

That's it. Commands get prefixed, registered, synced with Telegram, and ready.

### CommandDefinition

```ts
interface CommandDefinition {
  command: string;             // without /
  description: string;        // shown in BotFather
  buildText: (ctx) => string; // builds the reply
}
```

### MenuDefinition

```ts
interface MenuDefinition {
  command: string;
  description: string;
  entryPage: string;       // id of the first page
  pages: MenuPage[];       // inline keyboard pages
}
```

Each `MenuPage` has an `id`, `text` (supports HTML), and `buttons` (navigation or URL).

---

## Core Modules

### Logger

Scoped logger with `LOG_LEVEL` environment variable support (`debug` | `info` | `warn` | `error`).

```ts
const log = new Logger("my-scope");
log.info("message");
log.child("sub").debug("detail");
```

### ChatTracker

Persists chat IDs to `.chats.json`. Auto-tracks via middleware. Enables `broadcast(bot, message)` to all known chats.

### Command Sync

On boot, compares local commands with `bot.api.getMyCommands()`. If there's a diff, shows +/~/- changes and prompts before calling `setMyCommands`. Then broadcasts an update notice.

---

## Demo: RabbitBot

The included `RabbitBot` plugin (`pluginCode = "rb"`) provides:

- `/rb_aleph` — next Fibonacci-date sync event
- `/rb_join` — join link + Solana address
- `/rb_quit` — quit info
- `/rb_alephs` — list of upcoming events
- `/rb_menu` — inline keyboard with 2 pages

Try it: [@an_aleph_zero_rabit_23_bot](https://t.me/an_aleph_zero_rabit_23_bot) · Channel: *A cyborg-driven chat room*

---

## Testing

```bash
bun run test             # 27 tests across 4 suites
bun run test:coverage    # with coverage report
bun run test:report      # JUnit XML → test-results.xml
```

Test suites cover: command-handler, bot-handler, logger, rabbit-bot.

## Release

```bash
bun run release patch    # 0.0.0 → 0.0.1
bun run release minor    # 0.0.1 → 0.1.0
bun run release major    # 0.1.0 → 1.0.0
```

Creates a git tag `vX.Y.Z` and commit. Push with `git push && git push --tags`.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[AIPL](LICENSE.md) — Animus Iocandi Public License · [Escrivivir.co](https://escrivivir.co)
