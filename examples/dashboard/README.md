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
│ chats: 3   commands: 5   plugins: 1                                     │
│                                                                         │
│ Plugins                                                                 │
│ [rb] RabbitBot  (5 cmds)                                                │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ [1] Overview  [2] Logs  [3] Chats  [Tab] Cycle  [q] Quit               │
└─────────────────────────────────────────────────────────────────────────┘
```

## Cómo correr

```bash
# Desde la raíz del repo. Necesitas .env con BOT_TOKEN.
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
├── store.ts          ← mini reactive store (getState/setState/subscribe)
├── state.ts          ← DashboardState, buffers, tipos
├── theme.ts          ← paleta de colores
├── emitter-bridge.ts ← conecta RuntimeEmitter → store
└── components/
    ├── StatusPanel.tsx ← panel Overview
    ├── LogViewer.tsx   ← panel Logs con filtros y scroll
    └── ChatList.tsx    ← panel Chats + stream de mensajes
```

### Flujo de datos

```
SDK core (Logger, ChatTracker, registerPlugins, syncCommands)
    ↓ emit RuntimeEvent
RuntimeEmitter
    ↓ emitter-bridge connectEmitterToStore()
Store<DashboardState>  (inmutable, setState con updater)
    ↓ subscribe → forceUpdate
Ink React tree re-render (<App> → panel activo)
```

El SDK **no sabe** que existe una UI. El `RuntimeEmitter` es un parámetro
opcional en todas las funciones de core — backwards compatible.
