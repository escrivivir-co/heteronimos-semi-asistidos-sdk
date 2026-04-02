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
| 148 | Crear `src/core/store.ts` — `Store<T>`, `createStore()`, `LogEntry`, `MessageEntry`, `LOG_BUFFER_SIZE`, `MSG_BUFFER_SIZE` | ✅ | SDS-09 §3.1 |
| 149 | Crear `src/core/emitter-bridge.ts` — `BaseRuntimeState`, `getDefaultBaseState()`, `EmitterBridgeOptions`, `connectEmitterToStore()` | ✅ | SDS-09 §3.1 |
| 150 | Ampliar `src/index.ts` — exportar nuevos tipos y funciones del store + bridge | ✅ | SDS-09 §3.2 |
| 151 | `bun run build:sdk` — verificar que `dist/` incluye `store.js/.d.ts` y `emitter-bridge.js/.d.ts` | ✅ | SDS-09 §7 |
| 152 | Tests: `tests/store.test.ts` — createStore, setState, subscribe, unsub | ✅ | SDS-09 §5 |
| 153 | Tests: `tests/emitter-bridge.test.ts` — connectEmitterToStore reduce todos los RuntimeEvent, buffers max, unsub | ✅ | SDS-09 §5 |
| 154 | Tests: ampliar `tests/barrel.test.ts` — smoke test con nuevos exports | ✅ | SDS-09 §5 |

### Fase V · Dashboard: consumir del SDK
| # | Task | Status | Ref |
|---|------|--------|-----|
| 155 | Refactorizar `examples/dashboard/state.ts` — `DashboardState extends BaseRuntimeState`, re-exportar tipos del SDK | ✅ | SDS-09 §3.3 |
| 156 | Eliminar `examples/dashboard/store.ts` — importar `createStore` del SDK | ✅ | SDS-09 §3.3 |
| 157 | Eliminar `examples/dashboard/emitter-bridge.ts` — importar `connectEmitterToStore` del SDK | ✅ | SDS-09 §3.3 |
| 158 | Actualizar `examples/dashboard/main.tsx` — nuevos imports del SDK | ✅ | SDS-09 §3.3 |
| 159 | Actualizar `examples/dashboard/App.tsx` + componentes — `import type { Store }` del SDK | ✅ | SDS-09 §3.3 |
| 160 | `bun run build:sdk && bun run examples:install` — verificar dashboard funciona | ✅ | SDS-09 §7 |

### Fase W · Tests de integración + docs
| # | Task | Status | Ref |
|---|------|--------|-----|
| 161 | Full test suite verde — core + dashboard smoke | ✅ | SDS-09 §7 |
| 162 | Actualizar `examples/dashboard/README.md` — store y bridge vienen del SDK | ✅ | SDS-09 §5 |
| 163 | Actualizar `docs/dashboard-guide.html` — Paso 3 importa store del SDK | ✅ | SDS-09 §5 |
| 164 | Actualizar `docs/index.html` — stats si cambian | ✅ | SDS-09 §5 |
| 165 | Actualizar `README.md` raíz — mencionar dos arquetipos (headless vs interactive) | ✅ | SDS-09 §5 |
| 166 | Actualizar `specs/00-overview.md` §3 — añadir Capa 4 (UI Bridge) al diagrama | ✅ | SDS-09 §6 |

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

## Sprint 4g — GH Pages Light/Dark Mode (from SDS-11)

> Objetivo: toggle de light/dark mode en todas las páginas GH Pages.
> Convertir colores hardcoded a CSS custom properties, añadir paleta oscura,
> toggle button con persistencia y respeto a `prefers-color-scheme`.
> Spec: `specs/11-dark-mode.md`

### Fase AA · CSS custom properties + dark theme en `fanzine.css`
| # | Task | Status | Ref |
|---|------|--------|-----|
| 178 | Definir `:root` con CSS custom properties para todos los colores en `fanzine.css` | ✅ | SDS-11 §3.1 |
| 179 | Definir `[data-theme="dark"]` con paleta oscura | ✅ | SDS-11 §3.1 |
| 180 | Sustituir todos los literales de color en `fanzine.css` por `var(--xxx)` | ✅ | SDS-11 §3.2 |
| 181 | Añadir regla `@media print` que fuerce light theme | ✅ | SDS-11 §3.7 |
| 182 | Verificar visualmente: light mode idéntico al estado actual | ✅ | SDS-11 §6.1 |

### Fase AB · Toggle button + script anti-flash
| # | Task | Status | Ref |
|---|------|--------|-----|
| 183 | Añadir estilos `.theme-toggle` a `fanzine.css` | ✅ | SDS-11 §3.3 |
| 184 | Insertar script anti-flash en `<head>` de `docs/index.html` | ✅ | SDS-11 §3.4 |
| 185 | Insertar toggle button + script en `<body>` de `docs/index.html` | ✅ | SDS-11 §3.4 |
| 186 | Verificar: toggle funciona, persiste en localStorage, respeta prefers-color-scheme | ✅ | SDS-11 §6.3–6.6 |

### Fase AC · Migrar inline styles de todas las páginas
| # | Task | Status | Ref |
|---|------|--------|-----|
| 187 | `docs/index.html` — sustituir colores hardcoded en `<style>` por CSS vars + añadir anti-flash + toggle | ✅ | SDS-11 §3.5 |
| 188 | `docs/quick-start.html` — sustituir colores en `<style>` + añadir anti-flash + toggle | ✅ | SDS-11 §3.5 |
| 189 | `docs/dashboard-guide.html` — sustituir colores en `<style>` + añadir anti-flash + toggle | ✅ | SDS-11 §3.5 |
| 190 | `docs/prompts-agents.html` — sustituir colores en `<style>` + añadir anti-flash + toggle | ✅ | SDS-11 §3.5 |
| 191 | Verificar: las 4 páginas se ven bien en ambos modos (light y dark) | ✅ | SDS-11 §6.8 |

### Fase AD · Templates + docs
| # | Task | Status | Ref |
|---|------|--------|-----|
| 192 | Actualizar `docs/poster-template/template.html` — incluir anti-flash + toggle pattern | ✅ | SDS-11 §3.6 |
| 193 | Actualizar `docs/poster-template/spec-template.html` — incluir anti-flash + toggle | ✅ | SDS-11 §3.6 |
| 194 | Actualizar `docs/poster-template/README.md` — documentar dark mode pattern | 🗒 | SDS-11 §3.6 |
| 195 | Verificar todos los criterios de aceptación SDS-11 §6 (9 puntos) | ✅ | SDS-11 §6 |

---

## Sprint 4h — Mock Command Execution from Dashboard (from SDS-12)

> Objetivo: permitir que la dashboard (y cualquier UI) ejecute comandos contra el MockTelegramBot
> en modo mock, simulando interacción como si viniera de Telegram. El admin selecciona un comando,
> lo ejecuta y ve la respuesta — todo dentro de la TUI.
> Principio: el SDK carga con la implementación; la app de ejemplo solo consume.
> Spec: `specs/12-mock-command-execution.md`

### Fase AE · SDK: mock ejecutable + eventos
| # | Task | Status | Ref |
|---|------|--------|-----|
| 198 | Ampliar `PluginInfo` — añadir `commands: PluginCommandInfo[]` con command + description | ✅ | SDS-12 §3.1 |
| 199 | Ampliar `RuntimeEvent` union — añadir `command-executed` y `command-response` | ✅ | SDS-12 §3.2 |
| 200 | Ampliar `MockTelegramBot` — aceptar `RuntimeEmitter?` en options, emitir eventos en simulate, retornar `SentMessage[]` | ✅ | SDS-12 §3.3 |
| 201 | Ampliar `BootResult` — añadir `executeCommand?`, `startMock()` retorna mock | ✅ | SDS-12 §3.4 |
| 202 | Crear `CommandResponseEntry` + `CMD_BUFFER_SIZE` en `store.ts`, ampliar `BaseRuntimeState` con `commandResponses[]` | ✅ | SDS-12 §3.5 |
| 203 | Ampliar `emitter-bridge.ts` — manejar `command-response` → buffer circular en state | ✅ | SDS-12 §3.6 |
| 204 | Ampliar `bot-handler.ts` — `plugins-registered` event incluye command details en PluginInfo | ✅ | SDS-12 §3.1 |
| 205 | Ampliar barrel `src/index.ts` — exportar `CommandResponseEntry`, `CMD_BUFFER_SIZE`, `SentMessage`, `SimulateOpts`, `PluginCommandInfo` | ✅ | SDS-12 §3.8 |

### Fase AF · SDK: tests
| # | Task | Status | Ref |
|---|------|--------|-----|
| 206 | Tests: `mock-telegram.test.ts` — emitter integration, simulateCommand retorna mensajes, emite eventos | ✅ | SDS-12 §6 |
| 207 | Tests: `emitter-bridge.test.ts` — command-response reduce correctamente, buffer no excede max | ✅ | SDS-12 §6 |
| 208 | Tests: `runtime-emitter.test.ts` — nuevos eventos fluyen por streams | ✅ | SDS-12 §6 |
| 209 | Tests: `barrel.test.ts` — nuevos exports existen | ✅ | SDS-12 §6 |

### Fase AG · Dashboard: CommandPanel
| # | Task | Status | Ref |
|---|------|--------|-----|
| 210 | Ampliar `DashboardState` — `executeCommand` ref + hereda `commandResponses` del SDK | ✅ | SDS-12 §4.1 |
| 211 | Crear `components/CommandPanel.tsx` — lista plugins→commands, selector ↑↓, execute Enter, visor respuestas | ✅ | SDS-12 §4.2 |
| 212 | Actualizar `App.tsx` — tab `[5] Commands`, tecla 5, footer actualizado | ✅ | SDS-12 §4.3 |
| 213 | Actualizar `main.tsx` — pasar `result.executeCommand` al store/state | ✅ | SDS-12 §4.4 |

### Fase AH · Integración + docs
| # | Task | Status | Ref |
|---|------|--------|-----|
| 214 | Full test suite verde + lint limpio | ✅ | SDS-12 §6 |
| 215 | Actualizar `docs/dashboard-guide.html` — mencionar Commands panel | ✅ | SDS-12 §7 |
| 216 | Actualizar `docs/index.html` — 5 paneles, mock command execution | ✅ | SDS-12 §7 |
| 217 | Actualizar `specs/00-overview.md` — mencionar ejecución de comandos desde UI como capacidad | ✅ | SDS-12 §7 |

---

## Sprint 4h-fix — Command execution hotfixes (post-sprint)

> Bugs y mejoras detectados al probar SDS-12 en dashboard.

| # | Task | Status | Ref |
|---|------|--------|-----|
| 218 | Fix double-prefix en `CommandPanel` — `PluginInfo.commands[].command` ya tiene prefijo, no re-prefixar | ✅ | SDS-12 §4.2 |
| 219 | Ampliar `boot.ts` — modo real: `bot.start()` non-blocking + local mock para `executeCommand` | ✅ | SDS-12 §3.4 |
| 220 | Test de regresión prefijo en `bot-handler.test.ts` + spec SDS-12 actualizada para ambos modos | ✅ | SDS-12 §6 |

---

## Sprint 4i — Chat Detail View (pestaña Chats mejorada)

| # | Story | Status | Spec ref |
|---|-------|--------|----------|
| 221 | Tipos `ChatMessage` + `ChatThread` en `src/core/store.ts` | 🔲 | SDS-13 §4.1 |
| 222 | Selectores `selectChatThreads` + `selectChatMessages` en `src/core/chat-selectors.ts` | 🔲 | SDS-13 §4.2 |
| 223 | Exportar tipos y selectores desde `src/index.ts` | 🔲 | SDS-13 §4.3 |
| 224 | Refactorizar `ChatList.tsx` — vista lista con cursor ↑↓ y preview | ✅ | SDS-13 §4.4 |
| 225 | Crear `ChatDetail.tsx` — timeline de mensajes user/bot con scroll | ✅ | SDS-13 §4.5 |
| 226 | Crear `ChatPanel.tsx` wrapper — orquesta lista ↔ detalle (Enter/Esc) | ✅ | SDS-13 §4.6 |
| 227 | Tests de selectores `chat-selectors.test.ts` | 🔲 | SDS-13 §4.7 |

---

## Sprint 4j — Message Persistence (historial entre reinicios)

| # | Story | Status | Spec ref |
|---|-------|--------|----------|
| 228 | `MessageStore` interface + `FileMessageStore` + `MemoryMessageStore` en `src/core/message-store.ts` | ✅ | SDS-14 §4.1 |
| 229 | Integrar `MessageStore` en `connectEmitterToStore` — carga al conectar, save debounced | ✅ | SDS-14 §4.2 |
| 230 | Ampliar `BootBotOptions` con `messageStorePath` + cableado en `bootBot` | ✅ | SDS-14 §4.3 |
| 231 | Exportar tipos y clases desde `src/index.ts` | ✅ | SDS-14 §4.4 |
| 232 | Dashboard: activar persistencia en `main.tsx` + `.gitignore` | ✅ | SDS-14 §4.5 |
| 233 | Tests `message-store.test.ts` + ampliar `emitter-bridge.test.ts` | ✅ | SDS-14 §4.6 |

---

## Sprint 4k — Group Command Sync & Chat Validation (from SDS-15)

> Objetivo: que los comandos del bot aparezcan en el menú `/` de grupos (no solo en DMs),
> validar chats persistidos al arrancar y enriquecer `.chats.json` con metadatos (tipo, título,
> estado del bot). Exponer todo en la dashboard con acciones de re-sync y re-validate.
> Spec: `specs/15-group-command-sync.md`

### Fase AI · SDK: multi-scope command sync
| # | Task | Status | Ref |
|---|------|--------|-----|
| 234 | Ampliar `SyncOptions` — nuevo campo `scopes[]` con default `["default", "all_group_chats"]` | 🔲 | SDS-15 §3.6 |
| 235 | Refactorizar `syncCommandsWithTelegram` — iterar scopes, `getMyCommands`/`setMyCommands` por scope | 🔲 | SDS-15 §3.1 |
| 236 | Nuevo `RuntimeEvent`: `commands-scope-synced` — emitido por cada scope sincronizado | 🔲 | SDS-15 §3.5 |
| 237 | Ampliar `MockTelegramBot.api` — `getMyCommands({ scope })` y `setMyCommands(cmds, { scope })` con storage por scope | 🔲 | SDS-15 §4.1 |
| 238 | Tests: `command-handler.test.ts` — multi-scope sync, verifica ambas llamadas, diff por scope | 🔲 | SDS-15 §7 |
| 239 | Tests: `mock-telegram.test.ts` — scope-aware get/setMyCommands | 🔲 | SDS-15 §7 |

### Fase AJ · SDK: ChatInfo + ChatStore v2 + migración
| # | Task | Status | Ref |
|---|------|--------|-----|
| 240 | Definir `ChatInfo` interface en `src/core/chat-tracker.ts` | 🔲 | SDS-15 §3.2 |
| 241 | Definir `ChatStoreV2` interface — `load(): ChatInfo[]`, `save(chats: ChatInfo[])` | 🔲 | SDS-15 §3.7 |
| 242 | Ampliar `FileChatStore` — auto-migración v1 (`number[]`) → v2 (`ChatInfo[]`) al leer | 🔲 | SDS-15 §3.7 |
| 243 | Refactorizar `ChatTracker` — usar `ChatStoreV2` internamente, `trackWithInfo()`, `markStale()`, `getAllInfo()` | 🔲 | SDS-15 §3.7 |
| 244 | Mantener backward compat: `ChatTracker.getAll()` sigue devolviendo `number[]` | 🔲 | SDS-15 §3.7 |
| 245 | Tests: `chat-tracker.test.ts` — ChatInfo persistence, auto-migración v1→v2, getAll todavía funciona | 🔲 | SDS-15 §7 |

### Fase AK · SDK: validación de chats al arranque
| # | Task | Status | Ref |
|---|------|--------|-----|
| 246 | Implementar `validateChats(bot, chatInfos)` → `{ valid, stale }` usando `bot.api.getChat` | 🔲 | SDS-15 §3.3 |
| 247 | Nuevo `RuntimeEvent`: `chats-validated` — emitido tras validación con contadores valid/stale | 🔲 | SDS-15 §3.5 |
| 248 | Ampliar `MockTelegramBot.api` — mock `getChat(chatId)` configurable (éxito/fallo por chat) | 🔲 | SDS-15 §4.1 |
| 249 | Ampliar `BootBotOptions` — `validateChatsOnBoot?: boolean` | 🔲 | SDS-15 §3.10 |
| 250 | Integrar `validateChats` en `bootBot()` — llamar tras registerPlugins si opción activa | 🔲 | SDS-15 §3.10 |
| 251 | Añadir warning `getMe()` → `can_read_all_group_messages` = false → log.warn sobre Privacy Mode | 🔲 | SDS-15 §9 |
| 252 | Tests: `chat-tracker.test.ts` — validateChats con mock (chats accesibles y no accesibles) | 🔲 | SDS-15 §7 |

### Fase AL · SDK: tracking reactivo con my_chat_member
| # | Task | Status | Ref |
|---|------|--------|-----|
| 253 | Implementar `ChatTracker.registerMemberUpdates(bot)` — escucha `my_chat_member`, llama `trackWithInfo`/`markStale` | 🔲 | SDS-15 §3.4 |
| 254 | Nuevo `RuntimeEvent`: `chat-member-changed` — emitido cuando el bot entra/sale de un chat | 🔲 | SDS-15 §3.5 |
| 255 | Integrar `registerMemberUpdates` en `bootBot()` — siempre activo en modo real | 🔲 | SDS-15 §3.10 |
| 256 | Tests: `chat-tracker.test.ts` — registerMemberUpdates con mock (added, kicked, left) | 🔲 | SDS-15 §7 |

### Fase AM · SDK: state + bridge + barrel
| # | Task | Status | Ref |
|---|------|--------|-----|
| 257 | Ampliar `BaseRuntimeState` — `chatInfos: ChatInfo[]`, `validChatCount`, `staleChatCount` | 🔲 | SDS-15 §3.8 |
| 258 | Ampliar `emitter-bridge.ts` — reducers para `chats-validated`, `chat-member-changed`, `commands-scope-synced` | 🔲 | SDS-15 §3.9 |
| 259 | Exportar desde barrel: `ChatInfo`, `ChatStoreV2`, `validateChats`, nuevos RuntimeEvent types | 🔲 | SDS-15 §4.1 |
| 260 | Tests: `emitter-bridge.test.ts` — reducers nuevos | 🔲 | SDS-15 §7 |
| 261 | Tests: `runtime-emitter.test.ts` — nuevos eventos en streams | 🔲 | SDS-15 §7 |
| 262 | Tests: `barrel.test.ts` — nuevos exports existen | 🔲 | SDS-15 §7 |

### Fase AN · Dashboard: panel Chats enriquecido
| # | Task | Status | Ref |
|---|------|--------|-----|
| 263 | Ampliar `DashboardState` — hereda `chatInfos`, `validChatCount`, `staleChatCount` | 🔲 | SDS-15 §4.2 |
| 264 | Refactorizar `ChatList.tsx` — mostrar tipo, título, username, indicador visual valid/stale | 🔲 | SDS-15 §3.11 |
| 265 | Keybinding `r` en panel Chats — dispara re-validación (solo modo Telegram real) | 🔲 | SDS-15 §3.11 |
| 266 | Keybinding `s` en panel Chats — dispara re-sync de comandos a todos los scopes | 🔲 | SDS-15 §3.11 |
| 267 | Actualizar `main.tsx` — pasar `validateChatsOnBoot: true` a `bootBot()` | 🔲 | SDS-15 §4.2 |

### Fase AO · Docs + integración final
| # | Task | Status | Ref |
|---|------|--------|-----|
| 268 | Full test suite verde + tests nuevos cubren cada feature | 🔲 | SDS-15 §6 |
| 269 | Actualizar `bot-father-settings.md` — nota sobre grupo scope | 🔲 | SDS-15 §9 |
| 270 | Actualizar `docs/dashboard-guide.html` — panel Chats enriquecido | 🔲 | SDS-15 §6 |
| 271 | Actualizar `README.md` raíz — mencionar soporte de grupos | 🔲 | SDS-15 §6 |

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

*Last updated: 2026-04-03 · Sprint 0 ✅ · Sprint 1 (specs) ✅ · Sprint 3 (SDK impl) ✅ · Sprint 4 (dashboard) ✅ · Sprint 4b Fase O (mock) ✅ · Sprint 4c Fase L-bis (ConfigPanel) ✅ · Sprint 4d Fases P-T (paquetes independientes) ✅ · Sprint 4e (UI bridge) ✅ · Sprint 4f Fases X (prompts-agents página) ✅ · Sprint 4g Fases AA-AC + AD (dark mode) ✅ · Sprint 4h (mock command execution) ✅ · Sprint 4h-fix (command execution hotfixes) ✅ · Sprint 4i (chat detail view) 🔲 · Sprint 4j (message persistence) 🔲 · next: Sprint 4i 🔲 · Sprint 4f Fases Y-Z (agentes expertos) 🔲 · Sprint 2 (CI) 🔲*
