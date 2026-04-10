# Integración con ALEPH Scriptorium

> **Submódulo**: `BotHubSDK`  
> **Plugin Scriptorium**: `bot-hub-sdk`  
> **Rama de integración**: `integration/beta/scriptorium` (tracking `origin/feat/sds_iacm`)  
> **Fecha**: 2026-04-05

---

## Arquitectura del Submódulo

```
BotHubSDK/
├── src/
│   ├── index.ts                    ← barrel público del SDK
│   └── core/
│       ├── bot-handler.ts          ← BotPlugin interface + orquestador
│       ├── command-handler.ts      ← registro de comandos + sync con Telegram
│       ├── menu-handler.ts         ← inline keyboards declarativos
│       ├── chat-tracker.ts         ← persistencia de chats + broadcast
│       ├── logger.ts               ← Logger con LOG_LEVEL
│       ├── runtime-emitter.ts      ← bus de eventos RxJS
│       ├── store.ts                ← store reactivo genérico
│       ├── emitter-bridge.ts       ← RuntimeEmitter → Store
│       ├── boot.ts                 ← bootBot() — orquestador de arranque
│       ├── startup.ts              ← ensureEnv() — gestión .env
│       ├── mock-telegram.ts        ← MockTelegramBot para tests
│       ├── aiml/                   ← Motor de intents AIML (SDS-16)
│       │   ├── aiml-types.ts
│       │   ├── intent-engine.ts
│       │   └── aiml-bot-plugin.ts
│       └── iacm/                   ← Protocolo IACM (SDS-17) ← RAMA ACTIVA
│           ├── iacm-types.ts       ← 11 message types + IacmMeta
│           ├── iacm-templates.ts   ← builders (buildRequest, buildReport…)
│           ├── iacm-parser.ts      ← parseIacmMessage, detectsIacmMessage
│           └── iacm-bot-plugin.ts  ← IacmBotPlugin extends AimlBotPlugin
├── examples/
│   ├── console-app/                ← arquetipo headless (Node/Docker)
│   ├── dashboard/                  ← arquetipo interactivo (TUI Ink/React)
│   └── iacm-demo/                  ← demo protocolo IACM inter-agente
├── specs/                          ← Software Design Specifications (SDS-1…18)
│   ├── 17-iacm-protocol.md         ← spec IACM pipeline
│   └── 18-iacm-demo-app.md         ← spec demo app IACM
├── templates/
│   └── IACM_FORMAT_SPECIFICATION.md ← spec completa del protocolo IACM v1.0
└── tests/                          ← 170 tests (14 suites + iacm-*)
```

---

## Tecnologías

- **Runtime**: Bun ≥1.1
- **Framework bot**: grammY
- **Tipado**: TypeScript (ESM nativo)
- **UI interactiva**: Ink 6 + React 19 + RxJS
- **Tests**: Bun test runner (165+ tests)
- **Build**: `tsc -p tsconfig.build.json` → `dist/`

---

## Mapeo Ontológico

| Componente BotHubSDK | Agente Scriptorium | Rol |
|----------------------|-------------------|-----|
| `BotPlugin` interface | @aleph / agentes UI | Patrón de extensión de bots |
| `IacmBotPlugin` | Cualquier agente Scriptorium | Participación en comunicación inter-agente |
| `IntentEngine` (AIML) | @ox (clasificación) | Motor de intents para clasificar inputs |
| `bootBot()` | @vestibulo | Orquestador de arranque  |
| `RuntimeEmitter` (RxJS) | @indice (observabilidad) | Bus de eventos del sistema |
| `ChatTracker` | @ox / @scrum | Tracking de chats activos + broadcast |
| Protocolo IACM | Todos los agentes | Estándar de mensajería inter-agente |
| Demo `an_aleph_zero_rabit_23_bot` | @aleph | Bot de demostración activo en Telegram |

---

## Protocolo IACM — Relevancia para el Scriptorium

La rama `feat/sds_iacm` implementa el **protocolo IACM v1.0** (Inter-Agent Communication Message):

| Categoría | Tipos de mensaje |
|-----------|-----------------|
| Directivos | `REQUEST`, `QUESTION` |
| Informativos | `REPORT`, `FYI`, `ANSWER` |
| Compromisivos | `PROPOSAL`, `ACCEPT`, `DEFER` |
| Cierre | `ACKNOWLEDGE`, `REJECT` |
| Escalación | `URGENT` |

**Pipeline de integración con Scriptorium**:
```
Agente Scriptorium
      │ genera IacmMessage via buildRequest() / buildReport() / etc.
      ▼
BotHubSDK IacmBotPlugin
      │ envía a grupo Telegram con formato IACM
      ▼
Otro bot (IacmBotPlugin)
      │ parseIacmMessage() → detecta tipo
      │ IntentEngine clasifica → IacmProtocolHandler
      ▼
Respuesta estructurada ACK / ANSWER / REPORT
```

---

## Dependencias Externas

| Dep | Versión | Instrucciones |
|-----|---------|--------------|
| Bun | ≥1.1 | `curl -fsSL https://bun.sh/install \| bash` |
| BOT_TOKEN | - | Crear bot en @BotFather, copiar en `.env` |
| grammY | peer dep | Se instala con `bun install` |

---

## Supuestos y Gaps

- La rama `feat/sds_iacm` es la que contiene el protocolo IACM más avanzado. `main` tiene la base estable pero SIN IACM.
- El ejemplo `iacm-demo/` parece estar en desarrollo según `examples:install` en `package.json`.
- No hay release publicado (pre-kick-off); el SDK está publicado como paquete npm `heteronimos-semi-asistidos-sdk` en versionado `0.0.0`.
- La integración con Scriptorium vía `IacmBotPlugin` es la vía primaria. Los agentes (@aleph, @ox, etc.) podrían usar el SDK para comunicarse via Telegram en grupos.
- Requiere `BOT_TOKEN` real de Telegram para funcionar fuera de modo mock.
