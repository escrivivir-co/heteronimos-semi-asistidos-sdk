# Contributing

## Getting Started

1. Fork the repo
2. Clone your fork: `git clone https://github.com/<you>/heteronimos-semi-asistidos-sdk.git`
3. `cd heteronimos-semi-asistidos-sdk/Nodejs && bun install`
4. Copy `.env.example` to `.env` and add your bot token (see [README](README.md))

## Development

```bash
bun run dev          # watch mode
bun run dev:verbose  # watch + debug logs
bun run lint         # type-check
```

## Making Changes

1. Create a branch: `git checkout -b feat/my-feature`
2. Make your changes
3. Run `bun run lint` to type-check
4. Commit with a clear message
5. Push and open a PR

## Creating a Plugin

The main contribution path is adding new bot plugins. See the `BotPlugin` interface in `core/bot-handler.ts` and `bots/rabbit-bot.ts` as a reference.

Each plugin needs:
- A unique `pluginCode` (2-3 chars) to avoid command collisions
- At least one command via `commands()`
- Optionally: `menus()` and `onMessage()`

## Conventions

- TypeScript, no `any` unless unavoidable
- Use the SDK's `Logger` instead of `console.log`
- Keep `.env` out of git — never commit secrets
- Run `bun run bot-father-settings` after changing commands to verify output

## License

By contributing, you agree that your contributions will be licensed under the [AIPL](LICENSE.md).
