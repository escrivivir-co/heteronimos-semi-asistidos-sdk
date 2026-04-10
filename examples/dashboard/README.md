# Dashboard — Console TUI

App de consola interactiva para `heteronimos-semi-asistidos-sdk`. Muestra el
estado del bot en tiempo real usando [Ink](https://github.com/vadimdemedes/ink)
(React para terminales).

## Vista previa

```
┌─────────────────────────────────────────────────────────────────────────┐
│ heteronimos-semi-asistidos-sdk · dashboard · [Overview] [Logs] [Chats]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Bot Status                                                              │
│ ● RUNNING   uptime: 4m 32s                                              │
│                                                                         │
│ Stats                                                                   │
│ chats: 3   commands: 32   plugins: 3                                    │
│                                                                         │
│ Plugins                                                                 │
│ [rb] RabbitBot   (5 cmds)   broadcast · sync events                     │
│ [sp] SpiderBot   (12 cmds)  RNFP federation protocol                    │
│ [hr] HorseBot    (15 cmds)  IACM structured messaging                   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ [1] Overview  [2] Logs  [3] Chats  [Tab] Cycle  [q] Quit               │
└─────────────────────────────────────────────────────────────────────────┘
```

## Cómo correr

```bash
# Desde la raíz del repo — construir el SDK primero:
bun run build:sdk

# Luego, desde este directorio:
cd examples/dashboard
bun install
bun run start
```

O usando el atajo del raíz:

```bash
bun run build:sdk && bun run examples:install
bun run dev:dashboard
```

La dashboard arranca el bot **y** la interfaz TUI en el mismo proceso.

## Paneles

| Tecla | Panel | Qué muestra |
|-------|-------|-------------|
| `1` | **Overview** | Estado del bot, uptime, plugins cargados, stats |
| `2` | **Logs** | Tail en vivo de logs del SDK con filtros por nivel |
| `3` | **Chats** | Chat IDs conocidos + stream de mensajes recientes |
| `Tab` | — | Ciclado de paneles |
| `q` | — | Salir |

### Panel Logs — filtros de nivel
Mientras estás en el panel Logs: `a` = all · `d` = debug · `i` = info · `w` = warn · `e` = error.
Flechas `↑↓` para hacer scroll en el historial.

## Arquitectura

```
examples/dashboard/
├── main.tsx          ← entrypoint: bot + TUI arrancan en paralelo
├── App.tsx           ← componente raíz: header, panel activo, footer
├── config.ts         ← variables opcionales de la app
├── rabbit-bot.ts     ← RabbitBot (rb_) — broadcast + sync events
├── spider-bot.ts     ← SpiderBot (sp_) — RNFP federation protocol
├── horse-bot.ts      ← HorseBot (hr_) — IACM structured messaging
├── state.ts          ← DashboardState extends BaseRuntimeState (campos propios)
├── theme.ts          ← paleta de colores
└── components/
    ├── StatusPanel.tsx ← panel Overview
    ├── LogViewer.tsx   ← panel Logs con filtros y scroll
    ├── ChatList.tsx    ← panel Chats + stream de mensajes
    ├── ConfigPanel.tsx ← panel Config (modo mock / setup token)
    └── CommandPanel.tsx ← panel Commands (ejecutar comandos en modo mock)
```

Las piezas genéricas (`Store<T>`, `createStore`, `connectEmitterToStore`, `LogEntry`, `MessageEntry`) viven en el SDK y se importan directamente:

```ts
import { createStore, connectEmitterToStore } from "heteronimos-semi-asistidos-sdk";
```

### Flujo de datos

```
SDK core (Logger, ChatTracker, registerPlugins, syncCommands)
    ↓ emit RuntimeEvent
RuntimeEmitter
    ↓ connectEmitterToStore()  ← SDK
Store<DashboardState>  (inmutable, setState con updater)
    ↓ subscribe → forceUpdate
Ink React tree re-render (<App> → panel activo)
```

El SDK **no sabe** que existe una UI. El `RuntimeEmitter` es un parámetro
opcional en todas las funciones de core — backwards compatible.
