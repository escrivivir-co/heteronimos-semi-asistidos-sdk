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

## Sprint 4 — Console Dashboard App (from ui-research + reference-console-app)

> Objetivo: nueva app de ejemplo con TUI interactiva basada en Ink/React.
> Requiere extender el SDK con una capa de observabilidad (eventos + snapshots de runtime).
> Referencia de arquitectura: `reference-console-app/` (submódulo).
> Propuesta UI: `docs/ui-research.md`.

### Fase G · SDK: capa de observabilidad del runtime
| # | Task | Status | Ref |
|---|------|--------|-----|
| 49 | Definir `BotRuntime` interface — snapshot del estado del bot (status, uptime, plugins cargados, comandos registrados) | ✅ | ui-research §3.1 |
| 50 | Definir `RuntimeEvent` union type — `log`, `message`, `command`, `error`, `status-change` | ✅ | ui-research §3.3 |
| 51 | Implementar `RuntimeEmitter` — EventEmitter tipado que emite `RuntimeEvent` desde core | ✅ | ref: AppStateStore |
| 52 | Conectar `Logger` → `RuntimeEmitter` — cada log emite evento `{ type: "log", entry }` | ✅ | SDS-03 P4 |
| 53 | Conectar `ChatTracker` → `RuntimeEmitter` — emit en track/untrack/broadcast | ✅ | SDS-03 P2 |
| 54 | Conectar `registerPlugins` / `syncCommands` → `RuntimeEmitter` — emit en registro y sync | ✅ | SDS-03 P5 |
| 55 | Exportar nuevos tipos desde barrel: `BotRuntime`, `RuntimeEvent`, `RuntimeEmitter` | ✅ | SDS-02 §1 |
| 56 | Tests: RuntimeEmitter emite eventos correctos, BotRuntime snapshot es coherente | ✅ | — |

### Fase H · Scaffold de la app TUI
| # | Task | Status | Ref |
|---|------|--------|-----|
| 57 | Crear `examples/dashboard/` con ink 5, react 19 instalados en root devDeps | ✅ | ref: package.json |
| 58 | Crear entrypoint `examples/dashboard/main.tsx` — monta `<App />` con Ink `render()` | ✅ | ref: replLauncher.tsx |
| 59 | Crear `examples/dashboard/store.ts` — mini-store reactivo (getState/setState/subscribe, ~30 líneas) | ✅ | ref: state/store.ts |
| 60 | Crear `examples/dashboard/theme.ts` — paleta mínima (colors, borders, text styles) | ✅ | ref: design-system/ |
| 61 | Script `dev:dashboard` en root package.json — `bun --watch run ./examples/dashboard/main.tsx` | ✅ | — |
| 62 | Verificar: build SDK limpio, lint limpio, 56 tests pasan | ✅ | — |

### Fase I · Panel de estado (Overview)
| # | Task | Status | Ref |
|---|------|--------|-----|
| 63 | Componente `<StatusPanel>` — bot status (online/offline/polling), uptime, versión | ✅ | ui-research §3.1 |
| 64 | Componente `<PluginList>` — dentro de StatusPanel, lista plugins con pluginCode y nº cmds | ✅ | ui-research §3.1 |
| 65 | Componente `<StatsBar>` — dentro de StatusPanel, mensajes procesados, chats activos | ✅ | ref: StatusLine.tsx |
| 66 | Hook `useRuntimeState` — `connectEmitterToStore` en `emitter-bridge.ts` suscribe al store | ✅ | ref: useAppState |
| 67 | Layout raíz `<App>` — compone header, panel activo y footer | ✅ | ref: FullscreenLayout |

### Fase J · Panel de logs en tiempo real
| # | Task | Status | Ref |
|---|------|--------|-----|
| 68 | Componente `<LogViewer>` — tail de últimos N logs con colores por nivel | ✅ | ui-research §3.3 |
| 69 | Buffer circular de logs en `state.ts` (max LOG_BUFFER_SIZE=200) | ✅ | ref: Messages.tsx |
| 70 | Filtro por nivel — toggle a/d/i/w/e con teclado | ✅ | ref: useInput |
| 71 | Scroll manual con ↑↓ + indicador de posición | ✅ | ref: ScrollBox |

### Fase K · Panel de chats y mensajes
| # | Task | Status | Ref |
|---|------|--------|-----|
| 72 | Componente `<ChatList>` — lista de chat IDs activos con último mensaje y timestamp | ✅ | ui-research §3.3 |
| 73 | Componente `<MessageStream>` — últimos mensajes entrantes (dentro de ChatList) | ✅ | ref: MessageRow.tsx |
| 74 | Buffer de mensajes en `state.ts` (max MSG_BUFFER_SIZE=100) | ✅ | — |

### Fase L · Navegación entre paneles y keybindings
| # | Task | Status | Ref |
|---|------|--------|-----|
| 75 | Sistema de tabs — 1/2/3 y Tab/Shift+Tab para cambiar entre Overview · Logs · Chats | ✅ | ref: Tabs.tsx |
| 76 | Componente `<Header>` — título + indicador de panel activo (dentro de App) | ✅ | ref: LogoV2 |
| 77 | Componente `<Footer>` — keybindings disponibles (dentro de App) | ✅ | ref: StatusLine.tsx |
| 78 | Keybinding `q` / Ctrl+C para salir limpio | ✅ | ref: useExitOnCtrlCD |

### Fase M · Integración, polish y docs
| # | Task | Status | Ref |
|---|------|--------|-----|
| 79 | Integrar dashboard con bot real — arranque conjunto: bot polling + TUI en paralelo | ✅ | — |
| 80 | Tests de componentes dashboard: smoke | ✅ | — |
| 81 | README de `examples/dashboard/` — screenshot, cómo correr, arquitectura | ✅ | — |
| 82 | Actualizar README raíz y docs/index.html con referencia a la nueva app | ✅ | — |

### Fase N · Migración RuntimeEmitter a RxJS (from SDS-06)

> Reemplazar `node:events` por RxJS Subject/Observable.
> Activar `BotRuntime` como snapshot reactivo vía `scan`.
> Spec: `specs/06-rxjs-migration.md`

| # | Task | Status | Ref |
|---|------|--------|-----|
| 83 | Añadir `rxjs >=7.8.0` a peerDependencies (optional: true) + devDependencies | ✅ | SDS-06 §Dependencia |
| 84 | Reescribir `RuntimeEmitter`: Subject interno, `events$`, `logs$`, `messages$`, `snapshot$`, `complete()` | ✅ | SDS-06 §1 |
| 85 | Implementar `reduceRuntime` reducer puro + `DEFAULT_BOT_RUNTIME` constante | ✅ | SDS-06 §2 |
| 86 | Mantener API legacy: `emit()`, `on()` (devuelve unsub), `off()` (no-op con deprecation) | ✅ | SDS-06 §1 |
| 87 | Actualizar barrel `src/index.ts`: exportar `reduceRuntime`, `DEFAULT_BOT_RUNTIME` | ✅ | SDS-06 §3 |
| 88 | Reescribir `tests/runtime-emitter.test.ts` — tests de Subject, streams, snapshot$, reducer, complete, legacy compat | ✅ | SDS-06 §Tests |
| 89 | Verificar tests de integración existentes (Logger + emitter, ChatTracker + emitter) pasan sin cambios | ✅ | SDS-06 §Tests |
| 90 | Actualizar `emitter-bridge.ts` — usar `events$.subscribe()` en vez de `emitter.on()` | ✅ | SDS-06 §5 |
| 91 | Limpiar `App.tsx` — quitar prop `emitter` de AppProps | ✅ | SDS-06 §5 |
| 92 | Actualizar `main.tsx` — quitar emitter de `<App>`, añadir `emitter.complete()` en cleanup | ✅ | SDS-06 §5 |
| 93 | Full test suite verde + lint limpio | ✅ | SDS-06 §Criterios |

---

## Sprint 4b — Mock Telegram Fallback (from SDS-07)

> Objetivo: módulo interno `MockTelegramBot` que cubre la superficie mínima de `grammy.Bot`
> usada por el SDK, reutilizable en unit tests y como fallback interactivo en el example.
> Spec: `specs/07-mock-telegram.md`

### Fase O · Mock en proceso + tests + fallback
| # | Task | Status | Ref |
|---|------|--------|-----|
| 110 | Crear `src/core/mock-telegram.ts` — `MockTelegramBot` con api mock, registro de handlers, middleware chain y contexto simulado | ✅ | SDS-07 §3, O-1 |
| 111 | Crear `tests/mock-telegram.test.ts` — tests unitarios de MockTelegramBot (registro, simulación, api, reset) | ✅ | SDS-07 §4.2, O-2 |
| 112 | Ampliar `tests/bot-handler.test.ts` — `registerPlugins` sobre mock bot verifica que handlers se registran | ✅ | SDS-07 §4.2, O-3 |
| 113 | Ampliar `tests/command-handler.test.ts` — `syncCommandsWithTelegram` contra api mock (diff + set) | ✅ | SDS-07 §4.2, O-3 |
| 114 | Ampliar `tests/chat-tracker.test.ts` — `ChatTracker.register` + `broadcast` sobre mock bot | ✅ | SDS-07 §4.2, O-3 |
| 115 | Fallback interactivo en `examples/console-app/main.ts` — detectar fallo, prompt CLI, arrancar mock | ✅ | SDS-07 §5, O-4 |
| 116 | Fallback interactivo en `examples/dashboard/main.tsx` — mismo patrón que console-app | ✅ | SDS-07 §5, O-5 |
| 117 | README de `examples/console-app/` — documentar mock mode + flujo de arranque | ✅ | SDS-07 §7, O-6 |
| 118 | Actualizar README raíz — mencionar mock mode en Quick Start | ✅ | O-7 |
| 119 | Actualizar `docs/index.html` — stats + mock feature | ✅ | O-8 |
| 120 | Full test suite verde + lint limpio — **143 tests / 12 suites / 0 fail** | ✅ | SDS-07 §7 |

---

## Sprint 4c — Config Panel + UX de arranque (from SDS-05 §L-bis)

> Objetivo: reemplazar el prompt readline en el dashboard por un panel Config dentro de la TUI.
> Ink controla stdin en raw mode — readline.close() lo destruye. Solución arquitectónica.

### Fase L-bis · Panel Config
| # | Task | Status | Ref |
|---|------|--------|-----|
| 121 | `dashboard` siempre `nonInteractive: true` — Ink obtiene stdin limpio | ✅ | SDS-05 §L-bis |
| 122 | Panel `[4] Config` en `App.tsx` — nuevo tab, tecla `4`, footer actualizado | ✅ | SDS-05 §L-bis |
| 123 | Crear `components/ConfigPanel.tsx` — muestra modo (MOCK/TELEGRAM), estado BOT_TOKEN, estado `.env` | ✅ | SDS-05 §L-bis |
| 124 | Acción `[c]` en ConfigPanel — `copyFileSync(.env.example → .env)` + feedback sin salir del TUI | ✅ | SDS-05 §L-bis |
| 125 | Banner de aviso mock en `StatusPanel` — si `mockMode && !tokenConfigured`, redirige a `[4] Config` | ✅ | SDS-05 §L-bis |
| 126 | `DashboardState` — nuevos campos: `mockMode`, `tokenConfigured`, `envFileExists`, `envExampleExists`, `appDir` | ✅ | SDS-05 §L-bis |
| 127 | `main.tsx` — `store.setState` tras `bootBot()` con los 5 campos nuevos | ✅ | SDS-05 §L-bis |
| 128 | `confirm()` en `src/core/logger.ts` — restaura stdin tras `rl.close()` para que console-app siga interactivo | ✅ | SDS-05 §L-bis |
| 129 | Full test suite verde — 143 tests / 12 suites / 0 fail | ✅ | — |
| 130 | Actualizar `specs/05-console-ui.md` — Ink 6, 4 paneles, Fase L-bis, navegación 1/2/3/4 | ✅ | — |

---

## Sprint 4d — Ejemplos como paquetes independientes (from SDS-08)

> Objetivo: `examples/console-app/` y `examples/dashboard/` son paquetes npm independientes
> que consumen el SDK por nombre de paquete en lugar de paths relativos.

### Fase P · Infraestructura de paquetes
| # | Task | Status | Ref |
|---|------|--------|-----|
| 131 | `examples/console-app/package.json` — instala SDK vía `file:../../` | ✅ | SDS-08 §4.1 |
| 132 | `examples/dashboard/package.json` — instala SDK + ink + react vía `file:../../` | ✅ | SDS-08 §4.2 |
| 133 | `examples/console-app/tsconfig.json` + `examples/dashboard/tsconfig.json` | ✅ | SDS-08 §4.3–4.4 |
| 134 | Añadir `examples/*/node_modules` al `.gitignore` | ✅ | SDS-08 §7.1 |

### Fase Q · Cambio de imports
| # | Task | Status | Ref |
|---|------|--------|-----|
| 135 | `console-app/main.ts` y `rabbit-bot.ts` — imports de `heteronimos-semi-asistidos-sdk` | ✅ | SDS-08 §5.1–5.2 |
| 136 | `dashboard/main.tsx`, `emitter-bridge.ts`, `state.ts` — imports de paquete, no `../../src/index.js` | ✅ | SDS-08 §5.3–5.5 |
| 137 | Copiar `config.ts` y `rabbit-bot.ts` a `examples/dashboard/` (autocontenido) | ✅ | SDS-08 §5.6 |

### Fase R · envDir y archivos de configuración locales
| # | Task | Status | Ref |
|---|------|--------|-----|
| 138 | `envDir` apunta al directorio propio del ejemplo (`__dirname` / `import.meta.dir`) | ✅ | SDS-08 §5.3 |
| 139 | `chatStorePath` apunta al directorio propio del ejemplo | ✅ | SDS-08 §5.3 |
| 140 | Copiar `.env.example` a `examples/console-app/` y `examples/dashboard/` | ✅ | — |

### Fase S · Scripts raíz + tests
| # | Task | Status | Ref |
|---|------|--------|-----|
| 141 | Scripts `dev`, `dev:verbose`, `dev:dashboard`, `start` delegan al ejemplo (`cd examples/… && bun run …`) | ✅ | SDS-08 §6.1 |
| 142 | Script `examples:install` — `bun install` en ambos ejemplos | ✅ | SDS-08 §6.3 |
| 143 | Scripts `test`, `test:report`, `test:coverage` incluyen `examples:install` como paso previo | ✅ | SDS-08 §6.3 |
| 144 | Verificar: `bun run build:sdk && bun run examples:install && bun test ./tests` verde | ✅ | — |

### Fase T · Documentación
| # | Task | Status | Ref |
|---|------|--------|-----|
| 145 | `specs/08-example-packages.md` — árbol §2 con `.env.example` + `ConfigPanel.tsx`; §5.3 con `store.setState` completo | ✅ | SDS-08 §7 |
| 146 | `README.md` — árbol de estructura con `.env.example` + `ConfigPanel`; mock mode diferenciado por ejemplo | ✅ | SDS-08 §7.2 |
| 147 | `docs/dashboard-guide.html` — 4 imports `../../src/index.js` → paquete; Paso 7 con patrón `bootBot()` real | ✅ | SDS-08 §7.7 |

---

## Sprint 4e — UI Bridge Layer (from SDS-09)

> Objetivo: mover las piezas genéricas del dashboard (store reactivo, bridge emitter→store,
> tipos de buffer) al SDK para formalizar los dos arquetipos de app: headless y con UI.
> Spec: `specs/09-ui-bridge-layer.md`

### Fase U · SDK: store + bridge genéricos
| # | Task | Status | Ref |
|---|------|--------|-----|
| 148 | Crear `src/core/store.ts` — `Store<T>`, `createStore()`, `LogEntry`, `MessageEntry`, `LOG_BUFFER_SIZE`, `MSG_BUFFER_SIZE` | 🔲 | SDS-09 §3.1 |
| 149 | Crear `src/core/emitter-bridge.ts` — `BaseRuntimeState`, `getDefaultBaseState()`, `EmitterBridgeOptions`, `connectEmitterToStore()` | 🔲 | SDS-09 §3.1 |
| 150 | Ampliar `src/index.ts` — exportar nuevos tipos y funciones del store + bridge | 🔲 | SDS-09 §3.2 |
| 151 | `bun run build:sdk` — verificar que `dist/` incluye `store.js/.d.ts` y `emitter-bridge.js/.d.ts` | 🔲 | SDS-09 §7 |
| 152 | Tests: `tests/store.test.ts` — createStore, setState, subscribe, unsub | 🔲 | SDS-09 §5 |
| 153 | Tests: `tests/emitter-bridge.test.ts` — connectEmitterToStore reduce todos los RuntimeEvent, buffers max, unsub | 🔲 | SDS-09 §5 |
| 154 | Tests: ampliar `tests/barrel.test.ts` — smoke test con nuevos exports | 🔲 | SDS-09 §5 |

### Fase V · Dashboard: consumir del SDK
| # | Task | Status | Ref |
|---|------|--------|-----|
| 155 | Refactorizar `examples/dashboard/state.ts` — `DashboardState extends BaseRuntimeState`, re-exportar tipos del SDK | 🔲 | SDS-09 §3.3 |
| 156 | Eliminar `examples/dashboard/store.ts` — importar `createStore` del SDK | 🔲 | SDS-09 §3.3 |
| 157 | Eliminar `examples/dashboard/emitter-bridge.ts` — importar `connectEmitterToStore` del SDK | 🔲 | SDS-09 §3.3 |
| 158 | Actualizar `examples/dashboard/main.tsx` — nuevos imports del SDK | 🔲 | SDS-09 §3.3 |
| 159 | Actualizar `examples/dashboard/App.tsx` + componentes — `import type { Store }` del SDK | 🔲 | SDS-09 §3.3 |
| 160 | `bun run build:sdk && bun run examples:install` — verificar dashboard funciona | 🔲 | SDS-09 §7 |

### Fase W · Tests de integración + docs
| # | Task | Status | Ref |
|---|------|--------|-----|
| 161 | Full test suite verde — core + dashboard smoke | 🔲 | SDS-09 §7 |
| 162 | Actualizar `examples/dashboard/README.md` — store y bridge vienen del SDK | 🔲 | SDS-09 §5 |
| 163 | Actualizar `docs/dashboard-guide.html` — Paso 3 importa store del SDK | 🔲 | SDS-09 §5 |
| 164 | Actualizar `docs/index.html` — stats si cambian | 🔲 | SDS-09 §5 |
| 165 | Actualizar `README.md` raíz — mencionar dos arquetipos (headless vs interactive) | 🔲 | SDS-09 §5 |
| 166 | Actualizar `specs/00-overview.md` §3 — añadir Capa 4 (UI Bridge) al diagrama | 🔲 | SDS-09 §6 |

---

## Sprint 4f — Prompts & Agentes Expertos (from SDS-10)

> Objetivo: formalizar los prompts de IA como artefactos de primera clase del proyecto.
> Crear una página GH Pages dedicada, un sistema de characterización vía lore, y los
> prompts de agentes expertos por área de la codebase.
> Spec: `specs/10-prompts-agents.md`

### Fase X · Página GH Pages + integración index
| # | Task | Status | Ref |
|---|------|--------|-----|
| 167 | Crear `specs/10-prompts-agents.md` — spec del sistema de prompts y agentes | ✅ | SDS-10 §7 |
| 168 | Crear `docs/prompts-agents.html` — página fanzine con hacker-devops, mecanismo lore, guía de creación | ✅ | SDS-10 §3.2 |
| 169 | Actualizar `docs/index.html` — botón ☞ PROMPTS & AGENTES en Quick Start | ✅ | SDS-10 §3.3 |
| 170 | Actualizar `docs/index.html` — card AI con descripción hacker-devops + tip lore | ✅ | SDS-10 §3.3 |

### Fase Y · Agentes expertos especializados
| # | Task | Status | Ref |
|---|------|--------|-----|
| 171 | Crear `.github/prompts/arquitecto-sdk.prompt.md` — rol arquitecto, foco SDS-00/02/03 | 🔲 | SDS-10 §5 |
| 172 | Crear `.github/prompts/qa-tester.prompt.md` — rol QA, foco tests/ y criterios de aceptación | 🔲 | SDS-10 §5 |
| 173 | Crear `.github/prompts/plugin-developer.prompt.md` — rol dev de plugins, foco BotPlugin API | 🔲 | SDS-10 §5 |
| 174 | Crear `.github/prompts/dashboard-builder.prompt.md` — rol TUI builder, foco SDS-05/06/09 | 🔲 | SDS-10 §5 |
| 175 | Actualizar `docs/prompts-agents.html` — cards completas para cada agente experto (reemplazar placeholders) | 🔲 | SDS-10 §3.2 |

### Fase Z · Docs + criterios de aceptación
| # | Task | Status | Ref |
|---|------|--------|-----|
| 176 | Verificar todos los criterios SDS-10 §6 — página navegable, lore explicado, links a GitHub | 🔲 | SDS-10 §6 |
| 177 | Actualizar `specs/00-overview.md` — mencionar sistema de prompts como artefacto del repo | 🔲 | SDS-10 §7 |

---

## Sprint 5 — SDK Hardening

| # | Story | Status |
|---|-------|--------|
| 94 | **Error boundary per plugin** — isolate plugin crashes from core | 🔲 |
| 95 | **Rate limiter middleware** — per-chat and global rate limiting | 🔲 |
| 96 | **Plugin hot-reload** — add/remove plugins without restart | 💡 |
| 97 | **i18n support** — multi-language replies per chat locale | 💡 |
| 98 | **Plugin dependency graph** — declare dependencies between plugins | 💡 |

---

## Sprint 6 — New Plugins & Features

| # | Story | Status |
|---|-------|--------|
| 99 | **Scheduler plugin** — cron-like scheduled messages | 🔲 |
| 100 | **Admin plugin** — /admin_broadcast, /admin_stats, /admin_chats | 🔲 |
| 101 | **Webhook mode** — support webhook alongside polling | 🔲 |
| 102 | **Analytics middleware** — track command usage, active users | 💡 |
| 103 | **Database adapter** — abstract persistence beyond .chats.json | 💡 |

---

## Icebox

| # | Story | Status |
|---|-------|--------|
| 104 | **npm/JSR publish** — publish SDK as a package | 💡 |
| 105 | **Plugin marketplace** — registry/catalog of community plugins | 💡 |
| 106 | **Web dashboard** — real-time bot monitoring UI (web, no terminal) | 💡 |
| 107 | **Multi-bot instance** — run multiple Bot tokens in one process | 💡 |
| 108 | **E2E tests** — integration tests against Telegram test server | 💡 |
| 109 | **Advanced TUI** — vim input, virtual lists, fullscreen layout (absorber más del submódulo) | 💡 |

---

*Last updated: 2026-04-02 · Sprint 0 ✅ · Sprint 1 (specs) ✅ · Sprint 3 (SDK impl) ✅ · Sprint 4 (dashboard) ✅ · Sprint 4b Fase O (mock) ✅ · Sprint 4c Fase L-bis (ConfigPanel) ✅ · Sprint 4d Fases P-T (paquetes independientes) ✅ · Sprint 4e (UI bridge) 🔲 next · Sprint 4f Fases X (prompts-agents página) ✅ · Sprint 4f Fases Y-Z (agentes expertos) 🔲 · Sprint 2 (CI) 🔲*
