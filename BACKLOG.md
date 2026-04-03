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

## Sprint 4k — Multi-Scope Command Sync (from SDS-15)

> Objetivo: que los comandos del bot aparezcan en el menú `/` de grupos y supergrupos,
> no solo en chats privados. Sin tocar ChatStore, ChatTracker ni dashboard.
> Spec: `specs/15-group-command-sync.md`

### Fase AI · Multi-scope sync
| # | Task | Status | Ref |
|---|------|--------|-----|
| 234 | Definir tipo `BotCommandScope` + ampliar `SyncOptions` con campo `scopes?` (default: `[default, all_group_chats]`) | ✅ | SDS-15 §3.3 |
| 235 | Refactorizar `syncCommandsWithTelegram` — iterar scopes, `getMyCommands`/`setMyCommands` por scope, confirmación única | ✅ | SDS-15 §3.2 |
| 236 | Ampliar `MockTelegramBot.api` — storage por scope (`Map<string, BotCommand[]>`), `getMyCommands({ scope })`, `setMyCommands(cmds, { scope })` | ✅ | SDS-15 §3.4 |
| 237 | Exportar `BotCommandScope` desde barrel (`src/index.ts`) | ✅ | SDS-15 §4 |
| 238 | Tests: `command-handler.test.ts` — sync registra en ambos scopes; skip si ya sync; custom scopes override; confirmación una sola vez | ✅ | SDS-15 §6 |
| 239 | Tests: `mock-telegram.test.ts` — scope-aware get/set, scopes independientes | ✅ | SDS-15 §6 |
| 240 | Tests: `barrel.test.ts` — `BotCommandScope` existe como export | ✅ | SDS-15 §6 |
| 241 | Full test suite verde — **217 tests / 16 suites / 0 fail** | ✅ | SDS-15 §5 |

### Fase AI-bis · Live group scope sync + boot hardening
| # | Task | Status | Ref |
|---|------|--------|-----|
| 242 | Live group scope sync — `my_chat_member`/`chat_member` → `setMyCommands` con scope `chat` para grupos nuevos | ✅ | SDS-15 §3.2 |
| 243 | Resolver tracked group scopes al arranque — `resolveTrackedGroupChatScopes` en `syncCommands` | ✅ | SDS-15 §3.2 |
| 244 | `boot.ts` hardening — `bot.catch()`, webhook cleanup (`deleteWebhook`), `getMe()` identity log | ✅ | — |
| 245 | `src/core/telegram-error.ts` — `describeTelegramError` utility para formateo seguro de errores de Telegram | ✅ | — |
| 246 | Error boundaries en `handleCommand` — wrap `buildText` + `reply` en try/catch | ✅ | — |
| 247 | Error boundaries en `registerMenu` — wrap `reply`/`editMessageText` en try/catch | ✅ | — |
| 248 | Error boundaries en `registerPlugins` onMessage — wrap `plugin.onMessage` + `reply` | ✅ | — |
| 249 | `registerPlugins` acepta `options?: { quiet?: boolean }` para suprimir logs de startup | ✅ | — |
| 250 | MockTelegramBot — event handlers genéricos (`eventHandlers Map`), `simulateMyChatMember`, `chatType`/`chatTitle` en contexto | ✅ | SDS-15 §3.4 |
| 251 | Tests: `bot-handler.test.ts` — registerPlugins con multi-scope + live sync + error boundaries | ✅ | SDS-15 §6 |

### Fase AI-ter · Plugin Help
| # | Task | Status | Ref |
|---|------|--------|-----|
| 252 | `src/core/plugin-help.ts` — `collectPluginHelpEntries` + `buildPluginHelpText` helpers compartidos | ✅ | — |
| 253 | Exportar `PluginHelpEntry`, `BuildPluginHelpTextOptions` + funciones desde barrel | ✅ | — |
| 254 | `tests/plugin-help.test.ts` — test suite del help builder | ✅ | — |
| 255 | RabbitBot en `examples/*/rabbit-bot.ts` usa `buildPluginHelpText` en vez de help inline | ✅ | — |
| 256 | `tests/rabbit-bot.test.ts` — actualizado para help text | ✅ | — |

---

## Sprint 5a — AIML Intent Engine (from SDS-16)

> Objetivo: pipeline de extracción de intención basado en semántica AIML.
> Stage 1 classifica input → IntentResult. Stage 2 handlers → respuesta.
> AIML NO es un dispensador de texto: es una máquina de filtrar y encauzar intención.
> Spec: `specs/16-aiml-bot-plugin.md`

### Fase AJ · SDK: tipos AIML + intent engine
| # | Task | Status | Ref |
|---|------|--------|-----|
| 257 | Crear `src/core/aiml-types.ts` — `IntentResult`, `IntentResolver`, `IntentFn`, `IntentHandler`, `AimlPattern`, `AimlCategory`, `ConditionClause`, `SessionVars`, `MessageContext`, `ConversationState`, `IntentEngineOptions`, `UNMATCHED_INTENT` | ✅ | SDS-16 §3.1 |
| 258 | Crear `src/core/intent-engine.ts` — `IntentEngine<TVars>`: classify(), getState(), setVar(), setTopic(), resetChat(), addCategories(), recordResponse() | ✅ | SDS-16 §3.2 |
| 259 | Pattern compilation: wildcards `*`, `_`, `#`, `^` en strings → RegExp internamente | ✅ | SDS-16 §3.6 |
| 260 | IntentResolver expansion: string → IntentResult, literal pass-through, IntentFn → execute | ✅ | SDS-16 §3.2 |
| 261 | Algoritmo de classify(): topic filter → priority sort → that eval → pattern eval → conditions (refina intent) → sideEffect → redirect (re-classify) | ✅ | SDS-16 §3.2 |
| 262 | Tests: `tests/aiml-types.test.ts` — pattern compilation, wildcard captures, PatternFn, IntentResult shape, UNMATCHED_INTENT | ✅ | SDS-16 §6 |
| 263 | Tests: `tests/intent-engine.test.ts` — classify, prioridad, conditions refina intent, topic, that, redirect re-classify, sideEffect, fallbackIntent, history, IntentResolver shorthand | ✅ | SDS-16 §6 |

### Fase AK · SDK: clase base AimlBotPlugin + handler pipeline
| # | Task | Status | Ref |
|---|------|--------|-----|
| 264 | Crear `src/core/aiml-bot-plugin.ts` — `AimlBotPlugin<TVars>` abstract class: pipeline classify → handlers → recordResponse, categories(), handlers(), defaultVars(), fallbackResponse(), /reset command | ✅ | SDS-16 §3.3 |
| 265 | Ampliar `src/index.ts` — exportar `IntentResult`, `IntentEngine`, `AimlBotPlugin`, `IntentHandler`, `UNMATCHED_INTENT`, `AimlCategory`, `AimlPattern`, `IntentResolver`, `MessageContext` | ✅ | SDS-16 §3.5 |
| 266 | Tests: `tests/aiml-bot-plugin.test.ts` — pipeline completo, handler chain (first non-undefined wins), fallbackResponse, reset command, commands() concatena, registerPlugins acepta | ✅ | SDS-16 §6 |
| 267 | Tests: ampliar `tests/barrel.test.ts` — nuevos exports intent engine existen | ✅ | SDS-16 §6 |
| 268 | `bun run build:sdk` — verificar `dist/` incluye aiml-types, intent-engine, aiml-bot-plugin | ✅ | SDS-16 §4 |
| 269 | Full test suite verde | ✅ | SDS-16 §5 |

---

## Sprint 5b — IACM Protocol Integration (from SDS-17)

> Objetivo: incorporar el protocolo IACM como álgebra de transiciones que consume
> los IntentResults extraídos por el motor AIML. Categories producen intents `iacm.*`;
> protocol handlers ejecutan transiciones de estado; respuestas se generan downstream.
> Dependencia: Sprint 5a (SDS-16).
> Spec: `specs/17-iacm-protocol.md`

### Fase AL · Protocolo & docs
| # | Task | Status | Ref |
|---|------|--------|-----|
| 270 | Mover `templates/IACM_FORMAT_SPECIFICATION.md` → `protocols/IACM_FORMAT_SPECIFICATION.md` | ✅ | SDS-17 §3.1 |
| 271 | Crear `docs/protocols.html` — página GH Pages con link DRY al .md del repo + resumen ejecutivo | ✅ | SDS-17 §3.2 |
| 272 | Actualizar `docs/index.html` — card "Protocols" con link a `protocols.html` | ✅ | SDS-17 §3.2 |

### Fase AM · SDK: tipos IACM + builders
| # | Task | Status | Ref |
|---|------|--------|-----|
| 273 | Crear `src/core/iacm-types.ts` — `IacmMessageType`, `IacmMeta`, `IacmMessage<T>`, `AnyIacmMessage`, `IacmDataMap`, 11 data interfaces, `IacmSessionVars` | ✅ | SDS-17 §3.3 |
| 274 | Crear `src/core/iacm-templates.ts` — `buildIacmMessage`, 11 builders específicos, `generateMessageId`, `formatIacmForChat`, `toIacmYaml` | ✅ | SDS-17 §3.4 |
| 275 | Crear `src/core/iacm-parser.ts` — `parseIacmMessage` (strict/lenient), `validateIacmMessage`, `detectsIacmMessage` | ✅ | SDS-17 §3.5 |
| 276 | Tests: `tests/iacm-types.test.ts` — discriminación genérica, acceso a data, session vars | ✅ | SDS-17 §6 |
| 277 | Tests: `tests/iacm-templates.test.ts` — builders, messageId, timestamp, formatForChat, toYaml | ✅ | SDS-17 §6 |
| 278 | Tests: `tests/iacm-parser.test.ts` — parse strict/lenient, validate, detect, round-trip | ✅ | SDS-17 §6 |

### Fase AN · SDK: categories IACM + protocol handlers + plugin base
| # | Task | Status | Ref |
|---|------|--------|-----|
| 279 | Crear `src/core/iacm-categories.ts` — categorías AIML que producen IntentResult `iacm.*` (NO texto): patterns de recepción + patterns de comandos salientes + `IACM_INTENTS` const | ✅ | SDS-17 §3.6 |
| 280 | Crear `src/core/iacm-protocol-handlers.ts` — `iacmProtocolHandler()`: consume intents `iacm.*` → state machine → transiciones + respuesta formateada | ✅ | SDS-17 §3.7 |
| 281 | Crear `src/core/iacm-bot-plugin.ts` — `IacmBotPlugin<TVars>`: extiende AimlBotPlugin, categories() IACM, handlers() con protocol handler primero, 8 comandos IACM, menú /iacm, protocolSummary, conversationStatus | ✅ | SDS-17 §3.8 |
| 282 | Ampliar `src/index.ts` — exportar types, builders, parser, `IACM_INTENTS`, `iacmProtocolHandler`, categories y plugin IACM | ✅ | SDS-17 §3.11 |
| 283 | Tests: `tests/iacm-categories.test.ts` — patterns → IntentResult `iacm.*`, entities extraídas, sideEffects actualizan vars | ✅ | SDS-17 §6 |
| 284 | Tests: `tests/iacm-protocol-handlers.test.ts` — REQUEST→ACK+state, QUESTION→response, URGENT→escalate, PROPOSAL→awaiting, send→format, unknown→undefined | ✅ | SDS-17 §6 |
| 285 | Tests: `tests/iacm-bot-plugin.test.ts` — full pipeline, commands, menus, extends categories+handlers, domain handler after protocol, registerPlugins | ✅ | SDS-17 §6 |
| 286 | Tests: ampliar `tests/barrel.test.ts` — nuevos exports IACM + protocol handler existen | ✅ | SDS-17 §6 |
| 287 | `bun run build:sdk` — verificar `dist/` incluye todos los nuevos módulos | ✅ | SDS-17 §4 |
| 288 | Full test suite verde | ✅ | SDS-17 §5 |

---

## Sprint 5d — IACM Demo App (from SDS-18)

> Objetivo: construir `examples/iacm-demo/` — aplicación de referencia con 2 bots (MeteoBot + DispatchBot)
> que ejercita los 11 tipos de mensaje IACM con APIs públicas reales.
> Sirve como boilerplate para developers + validación end-to-end del pipeline SDS-16/SDS-17.
> Dependencia: Sprint 5a (SDS-16) + Sprint 5b (SDS-17).
> Spec: `specs/18-iacm-demo-app.md`

### Fase AO · Scaffold & servicios
| # | Task | Status | Ref |
|---|------|--------|-----|
| 289 | Crear `examples/iacm-demo/package.json` + `tsconfig.json` — deps SDK (file:../../), grammy, rxjs | ✅ | SDS-18 §4.1 |
| 290 | Crear `examples/iacm-demo/.env.example` — BOT_TOKEN_METEO, BOT_TOKEN_DISPATCH, agent names, defaults | ✅ | SDS-18 §4.3 |
| 291 | Crear `examples/iacm-demo/config.ts` — env vars, agent names, city/tz defaults | ✅ | SDS-18 §4.3 |
| 292 | Crear `examples/iacm-demo/services/weather-api.ts` — client wttr.in (fetchWeather, checkWeatherApi) | ✅ | SDS-18 §4.4 |
| 293 | Crear `examples/iacm-demo/services/time-api.ts` — client worldtimeapi (fetchTime) | ✅ | SDS-18 §4.5 |

### Fase AP · MeteoBot (Approach 1: TypeScript class)
| # | Task | Status | Ref |
|---|------|--------|-----|
| 294 | Crear `examples/iacm-demo/meteo-bot.ts` — MeteoBot extends IacmBotPlugin: MeteoVars, categories (cmd-weather, cmd-apistatus, cmd-alert, cmd-propose, cmd-question) | ✅ | SDS-18 §5.1 |
| 295 | MeteoBot handlers: REQUEST→REPORT (fetch weather), QUESTION→ANSWER (fetch time), FYI, URGENT, PROPOSAL | ✅ | SDS-18 §5.1 |
| 296 | MeteoBot commands() + menus() — 5 comandos + menú 3 páginas | ✅ | SDS-18 §5.1 |

### Fase AQ · DispatchBot (Approach 1: TypeScript class)
| # | Task | Status | Ref |
|---|------|--------|-----|
| 297 | Crear `examples/iacm-demo/dispatch-bot.ts` — DispatchBot extends IacmBotPlugin: DispatchVars, categories (weather-req, time-q, accept, reject, defer, demo) | ✅ | SDS-18 §6.1 |
| 298 | DispatchBot handlers: send REQUEST/QUESTION, receive REPORT/ANSWER/PROPOSAL/URGENT, send ACCEPT/REJECT/DEFER, demo flow | ✅ | SDS-18 §6.1 |
| 299 | DispatchBot commands() + menus() — 6 comandos + menú 3 páginas | ✅ | SDS-18 §6.1 |

### Fase AR · Approach 2 & 3 (JSON + arrow functions)
| # | Task | Status | Ref |
|---|------|--------|-----|
| 300 | Crear `examples/iacm-demo/categories/meteo-categories.json` — JSON declarativo con regex, entityMapping | ✅ | SDS-18 §7.1 |
| 301 | Crear `examples/iacm-demo/categories/dispatch-categories.json` — JSON declarativo | ✅ | SDS-18 §7.1 |
| 302 | Crear `examples/iacm-demo/handlers/weather-handler.ts` — arrow function standalone (REQUEST→REPORT) | ✅ | SDS-18 §8.1 |
| 303 | Crear `examples/iacm-demo/handlers/time-handler.ts` — arrow function standalone (QUESTION→ANSWER) | ✅ | SDS-18 §8.2 |
| 304 | Crear `examples/iacm-demo/handlers/protocol-handler.ts` — custom protocol overrides | ✅ | SDS-18 §8 |

### Fase AS · Entrypoint + SDK gaps
| # | Task | Status | Ref |
|---|------|--------|-----|
| 305 | Crear `examples/iacm-demo/main.ts` — bootBot × 2 bots | ✅ | SDS-18 §4.2 |
| 306 | SDK fix: self-message filter en AimlBotPlugin.onMessage (skip ctx.from.id === ctx.me.id) | ✅ | SDS-18 §9.1 |
| 307 | SDK fix: `abstract agentName: string` en IacmBotPlugin | ✅ | SDS-18 §9.2 |
| 308 | SDK fix: filtro `to_agent` en iacmProtocolHandler | ✅ | SDS-18 §9.3 |
| 309 | SDK: definir formato canónico de `formatIacmForChat()` alineado con patterns IACM | ✅ | SDS-18 §9.4 |
| 310 | SDK: crear `src/core/aiml-json-loader.ts` — `loadJsonCategories()` | ✅ | SDS-18 §9.5 |
| 311 | SDK: añadir `tokenEnvVar` param a bootBot options | ✅ | SDS-18 §9.6 |

### Fase AT · Docs & tests
| # | Task | Status | Ref |
|---|------|--------|-----|
| 312 | Crear `examples/iacm-demo/README.md` — quick-start, prerequisitos, 3 approaches | ✅ | SDS-18 §4.1 |
| 313 | Crear `examples/iacm-demo/flows/README.md` — diagramas de todos los flujos IACM | ✅ | SDS-18 §4.1 |
| 314 | Tests: `meteo-bot.test.ts` — categories, handlers con mock APIs | ✅ | SDS-18 §12 |
| 315 | Tests: `dispatch-bot.test.ts` — categories, handlers, accept/reject/defer | ✅ | SDS-18 §12 |
| 316 | Tests: `weather-api.test.ts` + `time-api.test.ts` — mock responses | ✅ | SDS-18 §12 |
| 317 | Tests: `json-loader.test.ts` — loadJsonCategories regex/wildcard/entity | ✅ | SDS-18 §12 |
| 318 | Tests: `integration.test.ts` — full flows REQUEST→REPORT, QUESTION→ANSWER, PROPOSAL→decision con 2 bots mock | ✅ | SDS-18 §12 |
| 319 | Full test suite verde + build ok | ✅ | SDS-18 §11 |

---

## Sprint 5c — SDK Hardening

| # | Story | Status |
|---|-------|--------|
| 94 | **Error boundary per plugin** — isolate plugin crashes from core | ✅ |
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

*Last updated: 2026-04-04 · Sprint 0 ✅ · Sprint 1 (specs) ✅ · Sprint 3 (SDK impl) ✅ · Sprint 4 (dashboard) ✅ · Sprint 4b (mock) ✅ · Sprint 4c (ConfigPanel) ✅ · Sprint 4d (paquetes) ✅ · Sprint 4e (UI bridge) ✅ · Sprint 4f Fase X (prompts-agents) ✅ · Sprint 4g (dark mode) ✅ · Sprint 4h + fix (mock cmd exec) ✅ · Sprint 4i (chat detail) ✅ · Sprint 4j (message persistence) ✅ · Sprint 4k (multi-scope sync + help + error resilience) ✅ · Sprint 5a (AIML intent engine) ✅ · Sprint 5b (IACM protocol) ✅ · Sprint 5d (IACM demo app) ✅ — 456 tests / 9 suites / 0 fail (excl. pre-existing) · next: Sprint 4f Fases Y-Z (agentes expertos) 🔲 · Sprint 2 (CI) 🔲*
