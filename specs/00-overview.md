# SDS-00 · Visión General del SDK

> **heteronimos-semi-asistidos-sdk** · Software Design Specification
> Estado: DRAFT · v0.0.0 → v0.1.0

---

## 1. Objetivo

Transformar el runtime actual (un bot monolítico que corre en consola) en una **librería TypeScript publicable** que permita a distintos perfiles de consumidor montar, componer y operar bots de Telegram desde sus propios servicios, sin asumir Bun, una TTY, ni un sistema de ficheros local.

El SDK debe funcionar como un paquete npm estándar: `import { BotPlugin, registerPlugins } from "heteronimos-semi-asistidos-sdk"`.

## 2. Principio rector

**Uso selectivo por capas.** El consumidor importa solo lo que necesita. Un plugin author no necesita saber de `ChatTracker`. Un pipeline CI no necesita `Bot`. Un MCP server no tiene TTY.

```
┌─────────────────────────────────────────────────────────┐
│  Capa 4 · UI Bridge                                    │
│  Store<T> · createStore · connectEmitterToStore         │
│  BaseRuntimeState · LogEntry · MessageEntry             │
│  → App con interfaz (TUI, web, Electron)                │
├─────────────────────────────────────────────────────────┤
│  Capa 3 · Orquestación                                 │
│  registerPlugins · syncCommands · ChatTracker           │
│  → Integrador / DevOps                                  │
├─────────────────────────────────────────────────────────┤
│  Capa 2 · Definición                                    │
│  BotPlugin · CommandDefinition · MenuDefinition         │
│  → Plugin Author                                        │
├─────────────────────────────────────────────────────────┤
│  Capa 1 · Infraestructura                               │
│  Logger · confirm · tipos base                          │
│  → Todos                                                │
└─────────────────────────────────────────────────────────┘
```

## 3. Qué entra en el SDK y qué no

| Dentro del SDK (publicable) | Fuera del SDK (ejemplo / app) |
|-|-|
| `BotPlugin` interface | `config.ts` (carga de env vars) |
| `CommandDefinition`, `BotCommand` | `main.ts` (entrypoint de consola) |
| `MenuDefinition`, `MenuPage`, `MenuButton` | `RabbitBot` (plugin demo) |
| `registerPlugins`, `syncCommands` | `GEvent` (tipo específico del ejemplo) |
| `registerCommands`, `handleCommand` | `.env` / `.env.example` |
| `registerMenu` | |
| `toBotFatherFormat`, `toBotCommands` | |
| `commandsMatch`, `syncCommandsWithTelegram` | |
| `ChatTracker` (con persistencia configurable) | |
| `Logger`, `LogLevel`, `confirm` | |
| Re-exports de grammY: `Bot`, `Context` | |
| `Store<T>`, `createStore` | |
| `BaseRuntimeState`, `connectEmitterToStore` | |
| `LogEntry`, `MessageEntry`, `CommandResponseEntry`, buffer constants | |
| `MockTelegramBot`, `SentMessage`, `SimulateOpts` | |
| `PluginCommandInfo`, `CMD_BUFFER_SIZE` | |
| `AimlBotPlugin`, `ConversationEngine`, tipos AIML | |
| `IacmBotPlugin`, builders, parser, tipos IACM | |

## 4. Entregables de esta especificación

| Doc | Contenido |
|-----|-----------|
| [SDS-01](01-consumer-segments.md) | Segmentos de consumidor y casos de uso |
| [SDS-02](02-type-surface.md) | Superficie de tipos: diseño, imports por segmento |
| [SDS-03](03-coupling-analysis.md) | Análisis de acoplamiento y propuestas de desacoplo |
| [SDS-04](04-migration-path.md) | Plan de migración faseado (del plan original a implementación) |
| [SDS-05](05-console-ui.md) | Spec del dashboard TUI (Ink/React) |
| [SDS-06](06-rxjs-migration.md) | Migración de RuntimeEmitter a RxJS |
| [SDS-07](07-mock-telegram.md) | MockTelegramBot para tests y fallback |
| [SDS-08](08-example-packages.md) | Extracción de ejemplos como paquetes independientes |
| [SDS-09](09-ui-bridge-layer.md) | Capa de UI Bridge: Store, emitter-bridge, tipos de buffer |
| [SDS-10](10-prompts-agents.md) | Prompts & Agentes Expertos — sistema de prompts + página GH Pages |
| [SDS-11](11-dark-mode.md) | Light/Dark Mode Toggle para GH Pages |
| [SDS-12](12-mock-command-execution.md) | Mock Command Execution from Dashboard |
| [SDS-13](13-chat-detail-view.md) | Chat Detail View para pestaña Chats |
| [SDS-14](14-message-persistence.md) | Persistencia de mensajes entre reinicios |
| [SDS-15](15-group-command-sync.md) | Multi-Scope Command Sync (Groups) |
| [SDS-16](16-aiml-bot-plugin.md) | AIML Bot Plugin Pack — motor conversacional + clase base |
| [SDS-17](17-iacm-protocol.md) | IACM Protocol Integration — tipos, builders, parser, plugin |
| [SDS-18](18-iacm-demo-app.md) | IACM Demo App — boilerplate de referencia con 2 bots, 11 message types, 3 approaches |
| [SDS-19](19-cyborg-federation-protocol.md) | Cyborg Federation Protocol Layer — UCC + RNFP sobre IACM, con integración docs-first |

## 5. Sistema de prompts

Los prompts de IA son artefactos de primera clase del proyecto, alojados en `.github/prompts/`. Cada prompt genera un **agente especializado** que adopta un rol para explorar y contribuir a la codebase:

| Prompt | Foco |
|--------|------|
| `hacker-devops` | Revisión general: puertas de entrada, DRY, offboarding |
| `arquitecto-sdk` | Capas, acoplamiento, barrel coherence, extensibilidad |
| `qa-tester` | Cobertura de tests, criterios de aceptación, mocks |
| `plugin-developer` | Ciclo de vida BotPlugin → AimlBotPlugin → IacmBotPlugin |
| `dashboard-builder` | TUI Ink, store reactivo, emitter bridge, UI Bridge Layer |

Documentación completa: [SDS-10](10-prompts-agents.md) · Página: `docs/prompts-agents.html`.

## 6. Restricciones

- No convertir a monorepo en esta iteración.
- Mantener Bun para dev/test, pero emitir JS ESM + `.d.ts` estándar.
- grammY como `peerDependency` (el consumidor controla la versión).
- No romper los 27 tests existentes en ningún paso intermedio.
- Cada fase debe ser commitable y verificable de forma independiente.
