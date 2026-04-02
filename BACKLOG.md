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

## Sprint 1 — SDK Extraction (specs/)

| # | Story | Status |
|---|-------|--------|
| 17 | **SDS-00 Overview** — visión general, capas, frontera SDK/app | ✅ |
| 18 | **SDS-01 Consumer Segments** — 4 segmentos (Author, Integrador, Headless, Tooling) + matriz | ✅ |
| 19 | **SDS-02 Type Surface** — barrel público, auditoría de tipos, HandlerReply unificado | ✅ |
| 20 | **SDS-03 Coupling Analysis** — 8 problemas identificados, grafo de resolución, invariantes | ✅ |
| 21 | **SDS-04 Migration Path** — 6 fases (A→F), criterios de aceptación, layout resultante | ✅ |

---

## Sprint 2 — CI/CD & Quality

| # | Story | Status |
|---|-------|--------|
| 22 | **GitHub Actions CI** — lint + test on push/PR | 🔲 |
| 23 | **GitHub Actions CD** — auto-deploy GH Pages on main | 🔲 |
| 24 | **Test coverage threshold** — enforce minimum coverage in CI | 🔲 |
| 25 | **Changelog automation** — generate CHANGELOG.md from conventional commits | 🔲 |

---

## Sprint 3 — SDK Implementation (from SDS-04)

### Fase A · Barrel público + frontera SDK/app
| # | Task | Status | Ref |
|---|------|--------|-----|
| 26 | Crear `src/index.ts` — barrel con re-exports de core (tipos + funciones) | ✅ | SDS-02 §1 |
| 27 | Re-exportar `Bot` y `type Context` desde grammY en barrel | ✅ | SDS-02 §1 |
| 28 | Mover grammY de dependencies a peerDependencies (>=1.11.0) | ✅ | SDS-03 P7 |
| 29 | Verificar: import del barrel sin side effects (no env, no fs, no throw) | ✅ | SDS-03 inv.2 |

### Fase B · Desacoplo de componentes core
| # | Task | Status | Ref |
|---|------|--------|-----|
| 30 | Definir `ChatStore` interface + `FileChatStore` + `MemoryChatStore` | ✅ | SDS-02 §2.5 |
| 31 | Refactorizar `ChatTracker` constructor: acepta `ChatStore?` (default: memory) | ✅ | SDS-03 P2 |
| 32 | Añadir `SyncOptions` a `syncCommandsWithTelegram` (autoConfirm, confirmFn) | ✅ | SDS-03 P3 |
| 33 | Añadir `LoggerOptions` al constructor de `Logger` (level, transport, colors) | ✅ | SDS-03 P4 |
| 34 | Hacer `tracker` opcional en `registerPlugins` | ✅ | SDS-03 P5 |
| 35 | Tests nuevos: MemoryChatStore, autoConfirm, tracker opcional, Logger con options | ✅ | SDS-04 Fase B |

### Fase C · RabbitBot a examples/
| # | Task | Status | Ref |
|---|------|--------|-----|
| 36 | Crear `examples/console-app/` con main.ts, config.ts, rabbit-bot.ts | ✅ | SDS-04 Fase C |
| 37 | Eliminar `src/bots/`, `src/config.ts`, `src/main.ts` | ✅ | SDS-04 Fase C |
| 38 | Actualizar package.json scripts (start/dev → examples/) | ✅ | SDS-04 Fase C |
| 39 | Actualizar imports en tests de rabbit-bot | ✅ | SDS-04 Fase C |

### Fase D · Build publicable
| # | Task | Status | Ref |
|---|------|--------|-----|
| 40 | Crear `tsconfig.build.json` (declaration, outDir dist, sin bun-types) | ✅ | SDS-04 Fase D |
| 41 | Actualizar package.json: main/types/exports/files apuntan a dist | ✅ | SDS-04 Fase D |
| 42 | Script `build:sdk` — tsc compile del barrel y core | ✅ | SDS-04 Fase D |
| 43 | Verificar: `dist/*.d.ts` sin referencias a bun-types | ✅ | SDS-04 Fase D |

### Fase E · Ejemplo como consumidor real
| # | Task | Status | Ref |
|---|------|--------|-----|
| 44 | `examples/console-app/main.ts` importa solo desde barrel (no deep imports) | ✅ | SDS-04 Fase E |
| 45 | README: separar "Quick Start (repo)" vs "Quick Start (npm consumer)" | ✅ | SDS-04 Fase E |

### Fase F · Tests adaptados + smoke
| # | Task | Status | Ref |
|---|------|--------|-----|
| 46 | Tests de core importan desde barrel en vez de deep imports | ✅ | SDS-04 Fase F |
| 47 | `tests/barrel.test.ts` — smoke test de exports sin side effects | ✅ | SDS-04 Fase F |
| 48 | `tests/package.test.ts` — smoke test de dist/*.d.ts post-build | ✅ | SDS-04 Fase F |

---

## Sprint 4 — SDK Hardening

| # | Story | Status |
|---|-------|--------|
| 49 | **Plugin hot-reload** — add/remove plugins without restart | 💡 |
| 50 | **Error boundary per plugin** — isolate plugin crashes from core | 🔲 |
| 51 | **Rate limiter middleware** — per-chat and global rate limiting | 🔲 |
| 52 | **i18n support** — multi-language replies per chat locale | 💡 |
| 53 | **Plugin dependency graph** — declare dependencies between plugins | 💡 |

---

## Sprint 5 — New Plugins & Features

| # | Story | Status |
|---|-------|--------|
| 54 | **Scheduler plugin** — cron-like scheduled messages | 🔲 |
| 55 | **Admin plugin** — /admin_broadcast, /admin_stats, /admin_chats | 🔲 |
| 56 | **Webhook mode** — support webhook alongside polling | 🔲 |
| 57 | **Analytics middleware** — track command usage, active users | 💡 |
| 58 | **Database adapter** — abstract persistence beyond .chats.json | 💡 |

---

## Icebox

| # | Story | Status |
|---|-------|--------|
| 59 | **npm/JSR publish** — publish SDK as a package | 💡 |
| 60 | **Plugin marketplace** — registry/catalog of community plugins | 💡 |
| 61 | **Web dashboard** — real-time bot monitoring UI | 💡 |
| 62 | **Multi-bot instance** — run multiple Bot tokens in one process | 💡 |
| 63 | **E2E tests** — integration tests against Telegram test server | 💡 |
| 64 | **Better example console app** — richer TUI/dashboard example backed by `reference-console-app` research | 💡 |

---

*Last updated: 2026-04-02 · Sprint 0 ✅ · Sprint 1 (specs) ✅ · Sprint 3 next*
