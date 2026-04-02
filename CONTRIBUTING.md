# Contributing

Thanks for your interest in contributing! This project follows a standard open-source workflow. Whether you're fixing a bug, adding a plugin, or improving docs — the process is the same.

---

## 1. Find Something to Work On

Check the [**BACKLOG.md**](BACKLOG.md) for open items. Look for tasks marked 🔲 (Ready).

Each task has an ID number and a short description. Pick one that matches your interest and skill level. If you're new, look for tasks in the **docs**, **tests**, or **plugin** categories.

> No need to "claim" an issue first — just start working. If two people submit PRs for the same task, we'll review both.

## 2. Fork & Clone

```bash
# Fork via GitHub UI, then:
git clone https://github.com/<your-user>/heteronimos-semi-asistidos-sdk.git
cd heteronimos-semi-asistidos-sdk/Nodejs
bun install
```

Copy the environment file:
```bash
cp .env.example .env
# Edit .env → add your BOT_TOKEN from @BotFather
```

Do this before running `bun run dev` or `bun run start`. The app reads `BOT_TOKEN` on startup and exits if it is missing.

## 3. Create a Branch

Branch from `main`. Use this naming convention:

| Type | Branch name | Example |
|------|-------------|---------|
| Feature | `feat/<short-description>` | `feat/scheduler-plugin` |
| Bug fix | `fix/<short-description>` | `fix/menu-parse-mode` |
| Docs | `docs/<short-description>` | `docs/improve-quickstart` |
| Refactor | `refactor/<short-description>` | `refactor/decouple-chat-tracker` |
| Test | `test/<short-description>` | `test/barrel-smoke` |

```bash
git checkout main
git pull origin main
git checkout -b feat/my-feature
```

## 4. Develop

Prerequisite: make sure `.env` already exists and contains `BOT_TOKEN` before starting the app locally.

```bash
bun run dev          # watch mode (auto-reload on changes)
bun run dev:verbose  # watch + LOG_LEVEL=debug
bun run lint         # type-check (must pass before PR)
bun run test         # run all unit tests
```

### Project Structure

```
src/
├── index.ts              ← SDK barrel (public API)
├── main.ts               ← current console entrypoint
├── config.ts             ← env-var loader for the local app
├── core/
│   ├── bot-handler.ts    ← BotPlugin interface + orchestrator
│   ├── command-handler.ts
│   ├── menu-handler.ts
│   ├── chat-tracker.ts
│   └── logger.ts
└── bots/                 ← demo plugins (will move to examples/)
tests/
scripts/
specs/                    ← design documents (SDS-00 to SDS-04)
docs/                     ← GitHub Pages site
```

### Creating a Plugin

The main contribution path is adding new bot plugins. Use `src/index.ts` as the public API reference, and see `src/bots/rabbit-bot.ts` as a working example plugin.

Each plugin needs:
- A unique `pluginCode` (2-3 lowercase alphanumeric chars) to avoid command collisions
- At least one command via `commands()`
- Optionally: `menus()` for inline keyboards and/or `onMessage()` as a fallback handler

## 5. Test & Lint

Before pushing, make sure everything passes:

```bash
bun run lint              # zero errors required
bun run test              # all tests must pass
bun run bot-father-settings   # verify command output (if you changed commands)
```

If you're adding new functionality, add tests. Test files go in `tests/` and follow the pattern `<module>.test.ts`.

## 6. Commit

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(plugins): add scheduler plugin
fix(menu): respect parseMode from MenuPage
docs: improve backlog with Sprint 3 tasks
test: add barrel smoke test
refactor(core): decouple ChatTracker from filesystem
```

Reference the backlog item in the commit body if applicable:

```
feat(plugins): add scheduler plugin

Implements BACKLOG #37.
```

## 7. Push & Open a PR

```bash
git push origin feat/my-feature
```

Then open a Pull Request on GitHub against the **`main`** branch. The [PR template](.github/PULL_REQUEST_TEMPLATE.md) will guide you through the checklist.

**Your PR should**:
- Reference the BACKLOG item number (e.g., "Implements #37")
- Have a clear description of what it does
- Pass lint and tests
- Not commit secrets (`.env` is gitignored)

## 8. Review & Merge

A maintainer will review your PR. Typical feedback:
- Style or convention adjustments
- Missing tests
- Scope creep (keep PRs focused on one backlog item)

Once approved, it gets squash-merged into `main`.

---

## Conventions

- **Language**: TypeScript, no `any` unless unavoidable
- **Logging**: Use the SDK's `Logger` instead of `console.log`
- **Secrets**: Keep `.env` out of git — never commit tokens
- **Tests**: Add or update tests when changing behavior
- **Commits**: Conventional Commits format
- **Branches**: Branch from `main`, name with `feat/` `fix/` `docs/` `refactor/` `test/` prefix

## License

By contributing, you agree that your contributions will be licensed under the [AIPL](LICENSE.md) — Animus Iocandi Public License.
