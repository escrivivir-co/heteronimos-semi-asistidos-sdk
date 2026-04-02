# Product Backlog

> **heteronimos-semi-asistidos-sdk** · v0.0.0 · pre-kick-off
> Ordered by priority. Status: ✅ Done · 🔲 Ready · 💡 Idea

---

## Sprint 0 — Scaffolding ✅

| # | Story | Status |
|---|-------|--------|
| 1 | **Scaffold project** — Bun + grammY + TypeScript base setup | ✅ |
| 2 | **Command handler** — declarative command definitions + generic handler | ✅ |
| 3 | **Menu handler** — declarative inline keyboard menus | ✅ |
| 4 | **Scoped logger** — LOG_LEVEL support, child loggers, colored output | ✅ |
| 5 | **BotPlugin interface** — plugin code prefixing + orchestrator | ✅ |
| 6 | **RabbitBot** — first plugin implementation (4 commands, 1 menu, onMessage) | ✅ |
| 7 | **Chat tracker** — persistent chat IDs + broadcast | ✅ |
| 8 | **BotFather settings generator** — script to output settings doc | ✅ |
| 9 | **Unit test suite** — 27 tests across 4 suites (command-handler, bot-handler, logger, rabbit-bot) | ✅ |
| 10 | **Release script** — version bump (patch/minor/major), git tag, commit | ✅ |
| 11 | **README + CONTRIBUTING** — FOSS-style documentation | ✅ |
| 12 | **GH Pages docs site** — fanzine/hacker-minimal template | ✅ |
| 13 | **PR template** — checklist for pull requests | ✅ |
| 14 | **.env migration** — config.ts with requireEnv/optionalEnv, .env.example | ✅ |
| 15 | **TypeScript upgrade** — 4.7.4 → 6.0.2 (bun-types compatibility) | ✅ |
| 16 | **src/ restructuring** — move source code into standard src/ directory | ✅ |

---

## Sprint 1 — CI/CD & Quality

| # | Story | Status |
|---|-------|--------|
| 17 | **GitHub Actions CI** — lint + test on push/PR | 🔲 |
| 18 | **GitHub Actions CD** — auto-deploy GH Pages on main | 🔲 |
| 19 | **Test coverage threshold** — enforce minimum coverage in CI | 🔲 |
| 20 | **Changelog automation** — generate CHANGELOG.md from conventional commits | 🔲 |

---

## Sprint 2 — SDK Hardening

| # | Story | Status |
|---|-------|--------|
| 21 | **Plugin hot-reload** — add/remove plugins without restart | 💡 |
| 22 | **Error boundary per plugin** — isolate plugin crashes from core | 🔲 |
| 23 | **Rate limiter middleware** — per-chat and global rate limiting | 🔲 |
| 24 | **i18n support** — multi-language replies per chat locale | 💡 |
| 25 | **Plugin dependency graph** — declare dependencies between plugins | 💡 |

---

## Sprint 3 — New Plugins & Features

| # | Story | Status |
|---|-------|--------|
| 26 | **Scheduler plugin** — cron-like scheduled messages | 🔲 |
| 27 | **Admin plugin** — /admin_broadcast, /admin_stats, /admin_chats | 🔲 |
| 28 | **Webhook mode** — support webhook alongside polling | 🔲 |
| 29 | **Analytics middleware** — track command usage, active users | 💡 |
| 30 | **Database adapter** — abstract persistence beyond .chats.json | 💡 |

---

## Icebox

| # | Story | Status |
|---|-------|--------|
| 31 | **npm/JSR publish** — publish SDK as a package | 💡 |
| 32 | **Plugin marketplace** — registry/catalog of community plugins | 💡 |
| 33 | **Web dashboard** — real-time bot monitoring UI | 💡 |
| 34 | **Multi-bot instance** — run multiple Bot tokens in one process | 💡 |
| 35 | **E2E tests** — integration tests against Telegram test server | 💡 |

---

*Last updated: 2025-04-02 · Sprint 0 complete*
