# SDS-05 · Console UI — App de Dashboard TUI

> **heteronimos-semi-asistidos-sdk** · Software Design Specification
> Estado: DONE · Implementada en Sprint 4 (Fases G–N)

---

## 1. Contexto

Tras completar la extracción del SDK (Sprints 0–3), la app de ejemplo en `examples/console-app/` quedó como un smoke consumer mínimo con polling. Se identificó la necesidad de una segunda app de ejemplo — un **dashboard interactivo TUI** — que demostrase la capa de observabilidad del SDK y sirviera como referencia de integración avanzada.

**Fuentes de diseño:**
- `docs/ui-research.md` — spike conceptual con propuesta de paneles y flujo de datos.
- `reference-console-app/` — submódulo con una app TUI completa (Ink, React, keybindings, virtualización).

---

## 2. Decisiones de diseño

| Decisión | Resultado |
|----------|-----------|
| Stack TUI | Ink 5 + React 19 (no copiar renderer custom del submódulo) |
| Alcance | 3 paneles: Overview, Logs, Chats — sin vim input ni virtual lists |
| Frontera SDK / UI | SDK expone `RuntimeEmitter` + `RuntimeEvent`; la UI suscribe vía `emitter-bridge.ts` |
| Estado | Mini-store reactivo propio (~30 líneas), no Redux ni Zustand |
| Navegación | Tabs 1/2/3 + Tab/Shift+Tab; q/Ctrl+C para salir |

---

## 3. Entregables realizados

### Fase G · SDK: capa de observabilidad
- `BotRuntime` interface, `RuntimeEvent` union type, `RuntimeEmitter` sobre RxJS Subject.
- Logger, ChatTracker, registerPlugins y syncCommands conectados al emitter.
- Exportados desde barrel.

### Fase H · Scaffold
- `examples/dashboard/` con entrypoint, store, theme, bridge.
- Script `dev:dashboard` en root.

### Fase I · Panel Overview
- `<StatusPanel>`, `<PluginList>`, `<StatsBar>`, `useRuntimeState` hook.

### Fase J · Panel Logs
- `<LogViewer>` con tail, buffer circular (200), filtro por nivel, scroll.

### Fase K · Panel Chats
- `<ChatList>`, `<MessageStream>`, buffer de mensajes (100).

### Fase L · Navegación
- Sistema de tabs, `<Header>`, `<Footer>`, keybinding q/Ctrl+C.

### Fase M · Integración
- Arranque conjunto bot + TUI, tests smoke, README, docs actualizados.

### Fase N · Migración RxJS
- Detalle en [SDS-06](06-rxjs-migration.md).

---

## 4. Archivos principales

```
examples/dashboard/
├── App.tsx              ← layout raíz con tabs
├── emitter-bridge.ts    ← RxJS stream → store
├── main.tsx             ← entrypoint Ink
├── state.ts             ← tipos de estado + buffers
├── store.ts             ← mini-store reactivo
├── theme.ts             ← paleta y estilos
└── components/          ← StatusPanel, LogViewer, ChatList, etc.
```

---

## 5. Qué se dejó fuera (referencia del submódulo)

| Feature del submódulo | Decisión |
|-----------------------|----------|
| Vim-style text input | Aplazado → Icebox #109 |
| Virtual message list | Aplazado |
| Fullscreen custom renderer | Descartado (Ink cubre suficiente) |
| Keybinding provider complejo | Simplificado a useInput de Ink |
