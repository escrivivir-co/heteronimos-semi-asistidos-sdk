# heteronimos-semi-asistidos-sdk

![version](https://img.shields.io/badge/version-0.0.0-blue)
![status](https://img.shields.io/badge/status-pre--kick--off-orange)
![license](https://img.shields.io/badge/license-AIPL-green)
![runtime](https://img.shields.io/badge/runtime-Bun-f472b6)
![tests](https://img.shields.io/badge/tests-bun%20test-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6)

A plugin-based Telegram bot SDK built on [grammY](https://grammy.dev/). Define bots as plugins — commands, menus, message handlers — and compose them into a single runtime.

> **Demo**: [@an_aleph_zero_rabit_23_bot](https://t.me/an_aleph_zero_rabit_23_bot)
> **Docs**: [escrivivir-co.github.io/heteronimos-semi-asistidos-sdk](https://escrivivir-co.github.io/heteronimos-semi-asistidos-sdk)

## Choose Your Path

- **Use the SDK from another project** → start at **Quick Start (npm Consumer)**
- **Run the minimal console example** → start at **Quick Start (Repo)**
- **Run the full TUI dashboard** → see [examples/dashboard/README.md](examples/dashboard/README.md)
- **Run without a BOT_TOKEN (mock mode)** → console-app: answer `y` when prompted, or set `MOCK_MODE=1`; dashboard: goes to mock automatically (no prompt — use `[4] Config` panel to set up)
- **Contribute to the refactor** → read this README first, then [CONTRIBUTING.md](CONTRIBUTING.md), [BACKLOG.md](BACKLOG.md), and the design docs in [specs/](specs/)

The SDK supports two app archetypes:

| Archetype | When to use | Key SDK entry points |
|-----------|-------------|---------------------|
| **Headless / Server** | Running in Docker, CI, a server — no interactive terminal | `bootBot()` — no emitter needed |
| **Interactive / Admin** | Bot + live TUI or web UI for monitoring | `bootBot()` + `RuntimeEmitter` + `createStore` + `connectEmitterToStore` |

See [`examples/console-app/`](examples/console-app/README.md) for the headless archetype and [`examples/dashboard/`](examples/dashboard/README.md) for the interactive one.

---

## Quick Start (Repo)

Use this path if you're working inside this repository and want to run the included console example.

The bot needs a `BOT_TOKEN` to connect to Telegram. If `.env` is missing, the SDK offers to create it from `.env.example` and lets you continue in mock mode.

```bash
# Clone
git clone https://github.com/escrivivir-co/heteronimos-semi-asistidos-sdk.git
cd heteronimos-semi-asistidos-sdk

# Install deps
bun install
```

If Bun is not installed yet, follow the platform-specific instructions at [bun.sh](https://bun.sh).

## Quick Start (npm Consumer)

Use this path if you want to consume the SDK from another project.

```bash
mkdir my-telegram-bot
cd my-telegram-bot
bun init -y
bun add heteronimos-semi-asistidos-sdk grammy
```

Create your own entrypoint and import only from the package barrel:

```ts
import { Bot, ChatTracker, registerPlugins, syncCommands } from "heteronimos-semi-asistidos-sdk";

const bot = new Bot(process.env.BOT_TOKEN!);
const tracker = new ChatTracker();

registerPlugins(bot, [], tracker);
await syncCommands(bot, [], tracker);
```

You still need a valid `BOT_TOKEN` in your runtime environment.

## Bot Token

1. Open [@BotFather](https://t.me/BotFather) in Telegram — [official tutorial](https://core.telegram.org/bots/tutorial)
2. If you are creating a new bot, use `/newbot` and copy the HTTP API token BotFather returns.
3. If your bot already exists, use `/mybots`, select the bot, and open the API token section to view or regenerate the token.
4. Copy `.env.example` to `.env` before running any `bun run dev` or `bun run start` command.

On Windows, you can duplicate the file from VS Code Explorer or File Explorer. On shells with Unix commands available, `cp .env.example .env` works too.

```dotenv
BOT_TOKEN=your-bot-token
SOLANA_ADDRESS=your-address
```

`BOT_TOKEN` is required. `SOLANA_ADDRESS` is optional.

If you skip `.env` setup, the SDK will guide you interactively at startup: offer to create `.env` from the template, then offer mock mode if the token is still missing.

## Groups & Privacy Mode

By default Telegram bots have **Privacy Mode enabled** — in groups, the bot only receives:

- Messages that start with `/` (commands)
- Replies to the bot's own messages
- Messages that @mention the bot by username

If you want the bot to receive **all messages in a group** (needed for `onMessage` handlers), disable Privacy Mode:

```
@BotFather → /setprivacy → select your bot → Disable
```

After changing this setting, **remove and re-add the bot** to each group for the change to take effect.

> **Note:** The SDK registers commands with both `default` and `all_group_chats` scopes so the `/` command menu appears in groups and private chats alike. When the bot joins a new group while already running, it also syncs a chat-specific scope for that group as a workaround for Telegram Desktop clients that sometimes fail to refresh `all_group_chats` correctly. If a group's menu still looks stale, reopen the chat or remove and re-add the bot. On first boot, the SDK also checks for stale webhooks and deletes them automatically to ensure long-polling works correctly.

## Run

```bash
bun run build:sdk        # build the SDK first (required before examples:install)
bun run examples:install # link SDK into both example packages
bun run dev              # watch mode (console-app)
bun run dev:verbose      # watch + LOG_LEVEL=debug
bun run start            # single run (console-app)
```

## Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Watch mode — delegates to `examples/console-app` |
| `bun run dev:verbose` | Watch + debug logging |
| `bun run dev:dashboard` | TUI dashboard — delegates to `examples/dashboard` |
| `bun run start` | Run once (console-app) |
| `bun run build` | Compile the SDK to `dist/` |
| `bun run build:sdk` | Emit publishable JS + `.d.ts` for the SDK |
| `bun run build:example` | Bundle the example app to `dist-example/` |
| `bun run dist` | Build and run the bundled example output |
| `bun run examples:install` | `bun install` in both example packages |
| `bun run lint` | Type-check (tsc --noEmit) |
| `bun run bot-father-settings` | Generate `bot-father-settings.md` |
| `bun run test` | Build SDK, install examples, run unit tests |
| `bun run test:report` | Tests + JUnit XML report |
| `bun run test:coverage` | Tests + coverage report |
| `bun run release <patch\|minor\|major>` | Bump version, tag, commit |

---

## Architecture

The SDK follows a **bot-of-bots** pattern. Each bot is a plugin (`BotPlugin`) that declares its own commands, menus, and message handlers. The core wires them together, prefixing commands with a plugin code to avoid collisions.

```
src/
├── index.ts                    ← public SDK barrel
└── core/
    ├── bot-handler.ts          ← BotPlugin interface + orchestrator
    ├── command-handler.ts      ← command registration + Telegram sync
    ├── menu-handler.ts         ← inline keyboard menus (declarative)
    ├── chat-tracker.ts         ← persistent chat tracking + broadcast
    ├── logger.ts               ← scoped logger with LOG_LEVEL
    ├── runtime-emitter.ts      ← RxJS Subject-based event bus (observability)
    ├── store.ts                ← generic reactive store (Store<T>, createStore)
    ├── emitter-bridge.ts       ← RuntimeEmitter → Store bridge (BaseRuntimeState)
    ├── startup.ts              ← ensureEnv() — .env detection + copy + token check
    ├── boot.ts                 ← bootBot() — full startup orchestrator
    └── mock-telegram.ts        ← MockTelegramBot for tests + fallback
examples/
├── console-app/              ← headless archetype (standalone npm package)
│   ├── package.json          ← installs SDK via `file:../../`
│   ├── .env.example          ← template — copy to .env before running
│   ├── main.ts               ← minimal entrypoint
│   ├── config.ts             ← optional env vars (SOLANA_ADDRESS)
│   └── rabbit-bot.ts         ← demo plugin (pluginCode = "rb")
└── dashboard/                ← interactive archetype (TUI, Ink/React + RxJS)
    ├── package.json          ← installs SDK + ink + react via `file:../../`
    ├── .env.example          ← template — copy to .env before running
    ├── main.tsx              ← entrypoint: bot + TUI in parallel
    ├── App.tsx               ← root component (header, panel, footer)
    ├── state.ts              ← DashboardState extends BaseRuntimeState
    ├── theme.ts              ← color palette
    └── components/           ← StatusPanel, LogViewer, ChatList, ConfigPanel
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
import type { BotPlugin, CommandDefinition } from "heteronimos-semi-asistidos-sdk";

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

Register it in your entrypoint (e.g. `examples/console-app/main.ts`):

```ts
import { Bot, ChatTracker, registerPlugins, syncCommands } from "heteronimos-semi-asistidos-sdk";

const bot = new Bot(process.env.BOT_TOKEN!);
const tracker = new ChatTracker();
const plugins = [
  new RabbitBot(SOLANA_ADDRESS),
  new MyBot(),
];

registerPlugins(bot, plugins, tracker);
await syncCommands(bot, plugins, tracker);
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
bun run test             # 165 tests across 14 suites
bun run test:coverage    # with coverage report
bun run test:report      # JUnit XML → test-results.xml
```

Test suites cover: command-handler, bot-handler, logger, rabbit-bot, chat-tracker, logger options, barrel, phase-b, package, runtime-emitter, dashboard, mock-telegram, store, emitter-bridge.

## Release

```bash
bun run release patch    # 0.0.0 → 0.0.1
bun run release minor    # 0.0.1 → 0.1.0
bun run release major    # 0.1.0 → 1.0.0
```

Creates a git tag `vX.Y.Z` and commit. Push with `git push && git push --tags`.

---

## Contributing

We welcome contributions! The workflow:

1. Check [**BACKLOG.md**](BACKLOG.md) for open tasks (🔲)
2. Fork the repo & create a branch from `main` (`feat/`, `fix/`, `docs/`...)
3. Implement, lint (`bun run lint`), test (`bun run test`)
4. Open a PR against `main` — reference the backlog item

Full guide: [CONTRIBUTING.md](CONTRIBUTING.md) · PR template included.

### Session Wrap-up

Before closing a work session or opening a PR:

1. Run `bun run lint`
2. Run `bun run test`
3. Update [BACKLOG.md](BACKLOG.md) if a phase, task, or documentation milestone is now complete
4. Keep [docs/index.html](docs/index.html) aligned with this README and the relevant `.md` files when contributor-facing guidance changes

## License

[AIPL](LICENSE.md) — Animus Iocandi Public License · [Escrivivir.co](https://escrivivir.co)
