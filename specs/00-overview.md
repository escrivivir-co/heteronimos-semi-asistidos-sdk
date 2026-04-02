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
| `LogEntry`, `MessageEntry`, buffer constants | |

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

## 5. Restricciones

- No convertir a monorepo en esta iteración.
- Mantener Bun para dev/test, pero emitir JS ESM + `.d.ts` estándar.
- grammY como `peerDependency` (el consumidor controla la versión).
- No romper los 27 tests existentes en ningún paso intermedio.
- Cada fase debe ser commitable y verificable de forma independiente.
