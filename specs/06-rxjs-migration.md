# SDS-06 · Migración de RuntimeEmitter a RxJS

> Reemplazar el wrapper sobre `node:events` por Subjects/Observables de RxJS.
> El SDK expone streams tipados; la dashboard los consume directamente o vía `scan`.

---

## Motivación

El `RuntimeEmitter` actual es un wrapper fino sobre `EventEmitter` con un único canal `"event"`.
Funciona, pero tiene limitaciones:

1. **No hay backpressure ni operadores**: los consumidores reciben todo y hacen switch/case manual.
2. **`BotRuntime`** está definido como interfaz pero nunca se materializa — no hay snapshot derivado.
3. **Buffer circular** se implementa ad-hoc en `emitter-bridge.ts` en vez de con operadores declarativos.
4. **Filtrado** se hace en el componente (LogViewer) en vez de en el stream.
5. **No hay `complete()`** — no hay forma de señalar que el emitter ya terminó.

RxJS resuelve todo esto con `Subject`, `scan`, `filter`, `shareReplay` y `takeUntil`.

---

## Dependencia: RxJS

| Campo | Valor |
|-------|-------|
| Paquete | `rxjs` (^7.8.0) |
| Ubicación | `peerDependencies` (el consumidor lo instala) |
| peerDepMeta | `optional: false` — el barrel importa `Observable` incondicionalmente |
| devDependencies | `rxjs: ^7.8.0` (para tests y dashboard) |

**Razón para peerDep no-opcional**: El barrel exporta `RuntimeEmitter` que usa `Observable<T>` en su superficie de tipos. Sin rxjs instalado el import del SDK falla.

---

## Diseño

### 1. `RuntimeEmitter` — nueva implementación

```typescript
import { Subject, Observable } from "rxjs";
import { filter, scan, shareReplay, map } from "rxjs/operators";

export class RuntimeEmitter {
  private subject = new Subject<RuntimeEvent>();

  /** Stream de todos los eventos. */
  readonly events$: Observable<RuntimeEvent> = this.subject.asObservable();

  /** Emite un evento al stream. */
  emit(event: RuntimeEvent): void {
    this.subject.next(event);
  }

  /**
   * Suscribe un listener A TODOS los eventos. Devuelve función unsub.
   * Mantiene la firma legacy para retrocompatibilidad.
   */
  on(listener: (event: RuntimeEvent) => void): () => void {
    const sub = this.subject.subscribe(listener);
    return () => sub.unsubscribe();
  }

  /**
   * Elimina un listener. Legacy compat.
   * Nota: con RxJS la forma canónica es usar el unsub devuelto por on().
   * Este método queda como no-op recomendando usar unsub.
   * Se eliminaría en v1.0.
   */
  off(_listener: (event: RuntimeEvent) => void): void {
    // No-op en la implementación RxJS.
    // Los consumidores deben usar el unsub devuelto por on().
    // Se puede logear un warn en dev si se quiere.
  }

  /** Señala fin del stream (shutdown). */
  complete(): void {
    this.subject.complete();
  }

  // --- Streams derivados de conveniencia ---

  /** Solo eventos de tipo "log". */
  readonly logs$: Observable<Extract<RuntimeEvent, { type: "log" }>> =
    this.events$.pipe(
      filter((e): e is Extract<RuntimeEvent, { type: "log" }> => e.type === "log")
    );

  /** Solo eventos de tipo "message". */
  readonly messages$: Observable<Extract<RuntimeEvent, { type: "message" }>> =
    this.events$.pipe(
      filter((e): e is Extract<RuntimeEvent, { type: "message" }> => e.type === "message")
    );

  /** Snapshot acumulado del estado del bot — emite tras cada evento relevante. */
  readonly snapshot$: Observable<BotRuntime> = this.events$.pipe(
    scan<RuntimeEvent, BotRuntime>(reduceRuntime, DEFAULT_BOT_RUNTIME),
    shareReplay(1)
  );
}
```

### 2. `reduceRuntime` — reducer puro para `BotRuntime`

```typescript
const DEFAULT_BOT_RUNTIME: BotRuntime = {
  status: "starting",
  startedAt: null,
  plugins: [],
  commands: [],
  chatCount: 0,
};

function reduceRuntime(state: BotRuntime, event: RuntimeEvent): BotRuntime {
  switch (event.type) {
    case "status-change":
      return { ...state, status: event.status };
    case "plugins-registered":
      return {
        ...state,
        plugins: event.plugins,
        status: "running",
        startedAt: state.startedAt ?? new Date(event.timestamp),
      };
    case "commands-synced":
      return { ...state, commands: /* derive from commandCount */ state.commands };
    case "chat-tracked":
      return { ...state, chatCount: event.total };
    default:
      return state;
  }
}
```

> El reducer `reduceRuntime` vive en `runtime-emitter.ts` junto a la clase.
> Es una función pura exportada para que los tests puedan validarla aisladamente.

### 3. Cambios en el barrel (`src/index.ts`)

Nuevas exportaciones:

```typescript
export { RuntimeEmitter, reduceRuntime, DEFAULT_BOT_RUNTIME } from "./core/runtime-emitter.js";
// Tipos ya exportados: BotRuntime, PluginInfo, RuntimeEvent (sin cambios)
```

### 4. Impacto en componentes core (Logger, ChatTracker, bot-handler)

**Ninguno.** Solo usan `emitter.emit(event)`, que mantiene la misma firma.

### 5. Impacto en la dashboard

#### `emitter-bridge.ts` — simplificación radical

El bridge actual tiene un `switch` de 7 ramas que reduce eventos a estado.
Con RxJS, la dashboard puede optar por:

**Opción A (recomendada): eliminar emitter-bridge, consumir desde streams**

```typescript
// main.tsx
import { scan } from "rxjs/operators";
import { LOG_BUFFER_SIZE, MSG_BUFFER_SIZE } from "./state.js";

// El store se alimenta directamente de los streams tipados:
emitter.snapshot$.subscribe(snapshot => {
  store.setState(prev => ({
    ...prev,
    botStatus: snapshot.status,
    startedAt: snapshot.startedAt,
    plugins: snapshot.plugins,
    commandCount: snapshot.commands.length,
    chatIds: /* ... */
  }));
});

emitter.logs$.subscribe(log => {
  store.setState(prev => ({
    ...prev,
    logs: [...prev.logs, { level: log.level, scope: log.scope, message: log.message, timestamp: log.timestamp }]
      .slice(-LOG_BUFFER_SIZE),
  }));
});

emitter.messages$.subscribe(msg => {
  store.setState(prev => ({
    ...prev,
    messages: [...prev.messages, { chatId: msg.chatId, username: msg.username, text: msg.text, timestamp: msg.timestamp }]
      .slice(-MSG_BUFFER_SIZE),
  }));
});
```

**Opción B (conservadora): mantener emitter-bridge pero usar `events$`**

```typescript
export function connectEmitterToStore(emitter: RuntimeEmitter, store: Store<DashboardState>): () => void {
  const sub = emitter.events$.subscribe(event => {
    store.setState(prev => reduceFromEvent(prev, event)); // mismo switch actual
  });
  return () => sub.unsubscribe();
}
```

**Decisión**: implementar opción B primero (mínimo cambio), con la opción A como mejora posterior.
Razón: B preserva la estructura actual y solo cambia el mecanismo de suscripción.

#### `App.tsx` — quitar prop `emitter`

El `emitter` se pasa a `App` pero no se usa. Eliminarlo de `AppProps`.

#### `main.tsx` — añadir `emitter.complete()` en cleanup

```typescript
process.on("SIGINT", () => {
  emitter.complete();
  unmount();
});
```

---

## Cambios de archivo

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `package.json` | EDITAR | Añadir `rxjs: ">=7.8.0"` a peerDependencies (optional: true) + devDeps |
| `src/core/runtime-emitter.ts` | REESCRIBIR | Subject + streams derivados + reduceRuntime + DEFAULT_BOT_RUNTIME |
| `src/index.ts` | EDITAR | Exportar `reduceRuntime`, `DEFAULT_BOT_RUNTIME` |
| `examples/dashboard/emitter-bridge.ts` | EDITAR | Usar `emitter.events$.subscribe()` en vez de `emitter.on()` |
| `examples/dashboard/App.tsx` | EDITAR | Quitar `emitter` de AppProps |
| `examples/dashboard/main.tsx` | EDITAR | Quitar `emitter` de `<App>`, añadir cleanup `emitter.complete()` |
| `tests/runtime-emitter.test.ts` | REESCRIBIR | Tests de Subject, streams, snapshot$, reduceRuntime, complete(), legacy on/off |

---

## Tests

### Unitarios (en `tests/runtime-emitter.test.ts`)

1. **`emit()` → `events$` recibe evento** — suscribir a `events$`, emitir, verificar llegada.
2. **`logs$` filtra solo eventos log** — emitir mix de log + message, verificar solo log llega.
3. **`messages$` filtra solo eventos message** — análogo.
4. **`snapshot$` mantiene estado acumulado** — emitir plugins-registered + chat-tracked, verificar snapshot final.
5. **`snapshot$` emite `DEFAULT_BOT_RUNTIME` inicialmente con `shareReplay(1)`** — suscribir tarde, recibir último valor.
6. **`reduceRuntime` es pura** — test directo del reducer con cada variante de evento.
7. **`complete()` termina el stream** — verificar que `events$` completa tras `complete()`.
8. **Legacy `on()` sigue funcionando** — compatibilidad con Logger/ChatTracker existentes.
9. **Legacy `on()` unsub funciona** — el retorno de `on()` silencia el listener.
10. **`off()` es no-op** — no lanza, se puede llamar sin efecto.

### Integración (existentes — deben seguir pasando sin cambios)

- `Logger + RuntimeEmitter integration` — usa `on()` → sigue funcionando.
- `ChatTracker + RuntimeEmitter integration` — usa `on()` → sigue funcionando.

---

## Criterios de aceptación

- [ ] `bun run lint` pasa.
- [ ] Todos los tests existentes siguen pasando (56 + nuevos).
- [ ] `bun run test` verde con al menos 10 tests nuevos para RxJS.
- [ ] `import { RuntimeEmitter } from "heteronimos-semi-asistidos-sdk"` expone `events$`, `logs$`, `messages$`, `snapshot$`.
- [ ] `emitter.complete()` termina todos los streams derivados.
- [ ] La dashboard funciona igual que antes (sin regressions visibles).
- [ ] `BotRuntime` se materializa como snapshot reactivo vía `scan`, no como interfaz muerta.
- [ ] No se rompe el barrel (sin side effects en import).

---

## Orden de implementación

1. Instalar rxjs en peerDeps + devDeps.
2. Reescribir `runtime-emitter.ts` con Subject + streams + reducer.
3. Actualizar barrel exports en `index.ts`.
4. Reescribir tests de `runtime-emitter.test.ts`.
5. Verificar que tests de integración (Logger, ChatTracker) pasan sin cambios.
6. Actualizar `emitter-bridge.ts` para usar `events$.subscribe`.
7. Limpiar `App.tsx` (quitar prop `emitter`).
8. Actualizar `main.tsx` (quitar prop, añadir complete en cleanup).
9. Run full test suite + lint.
