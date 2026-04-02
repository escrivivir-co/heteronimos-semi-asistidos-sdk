# SDS-04 · Plan de Migración

> Del plan original (14 pasos) a fases implementables con criterios de aceptación.
> Cada fase produce un commit verificable. Ningún paso rompe tests existentes.

---

## Relación con el plan original

| Fase SDS | Steps del plan original | Descripción |
|----------|------------------------|-------------|
| Fase A | Steps 1, 2, 3, 4 | Barrel público + frontera SDK/app |
| Fase B | Steps 5, 6 | Desacoplo de ChatTracker, Logger, confirm |
| Fase C | Steps 7 | Mover RabbitBot a examples/ |
| Fase D | Steps 8, 9, 10 | Build publicable + tsconfig dual |
| Fase E | Steps 11, 12 | App de consola como consumidor |
| Fase F | Steps 13, 14 | Tests adaptados + smoke test de empaquetado |

---

## Fase A · Barrel público + frontera SDK/app

**Objetivo**: Crear `src/index.ts` y definir qué es público sin mover archivos todavía.

### Tareas

1. Crear `src/index.ts` con los re-exports definidos en [SDS-02 §1](02-type-surface.md#1-barrel-público-srcindexts).
2. Re-exportar `Bot` y `type Context` desde grammY.
3. Mover grammY de `dependencies` a `peerDependencies` + añadir `peerDependenciesMeta` para install warnings.
4. Verificar que `import * from "./index"` no tiene side effects (no lee env, no abre fs).

### Criterios de aceptación

- [ ] `bun run lint` pasa.
- [ ] Los 27 tests siguen pasando (no se toca core).
- [ ] Un fichero temporal de test puede hacer `import { BotPlugin, Bot } from "../src/index"` sin error.
- [ ] `config.ts` no aparece en ningún import transitivo desde `index.ts`.

### Cambios de archivo

| Archivo | Acción |
|---------|--------|
| `src/index.ts` | CREAR |
| `package.json` | EDITAR (peerDependencies) |

---

## Fase B · Desacoplo de componentes core

**Objetivo**: Eliminar las dependencias hard a filesystem, TTY y process.env en los módulos core.

### Tareas

1. **ChatTracker**: Definir `ChatStore` interface. Implementar `FileChatStore` y `MemoryChatStore`. Refactorizar constructor de `ChatTracker` para aceptar `ChatStore?`.
2. **syncCommandsWithTelegram**: Añadir `SyncOptions` (autoConfirm, confirmFn). Default sigue siendo readline prompt.
3. **Logger**: Añadir `LoggerOptions` al constructor (level, transport, colors). Default sigue leyendo process.env.
4. **registerPlugins**: Hacer `tracker` opcional.
5. Exportar nuevos tipos desde `src/index.ts`: `ChatStore`, `FileChatStore`, `MemoryChatStore`, `SyncOptions`, `LoggerOptions`, `LogEntry`.

### Criterios de aceptación

- [ ] `bun run lint` pasa.
- [ ] 27 tests pasan sin modificar (backwards compat).
- [ ] Test nuevo: `ChatTracker` con `MemoryChatStore` funciona sin fs.
- [ ] Test nuevo: `syncCommandsWithTelegram` con `{ autoConfirm: true }` no cuelga.
- [ ] Test nuevo: `registerPlugins(bot, plugins)` sin tracker no lanza.
- [ ] Test nuevo: `new Logger("x", { level: "error" })` ignora process.env.

### Cambios de archivo

| Archivo | Acción |
|---------|--------|
| `src/core/chat-tracker.ts` | EDITAR (ChatStore, constructor con options) |
| `src/core/command-handler.ts` | EDITAR (SyncOptions en syncCommandsWithTelegram) |
| `src/core/logger.ts` | EDITAR (LoggerOptions en constructor) |
| `src/core/bot-handler.ts` | EDITAR (tracker? opcional) |
| `src/index.ts` | EDITAR (nuevos exports) |
| `tests/chat-tracker.test.ts` | CREAR |
| `tests/sync-options.test.ts` | CREAR |

---

## Fase C · Mover RabbitBot a examples/

**Objetivo**: RabbitBot deja de estar en `src/` y se convierte en ejemplo de consumo.

### Tareas

1. Crear `examples/console-app/` con:
   - `rabbit-bot.ts` (movido desde `src/bots/`)
   - `config.ts` (movido desde `src/config.ts`)
   - `main.ts` (movido desde `src/main.ts`, imports cambiados al barrel)
2. Actualizar `tests/rabbit-bot.test.ts` para importar desde `examples/`.
3. Eliminar `src/bots/` y `src/config.ts` y `src/main.ts`.
4. Actualizar scripts en `package.json`:
   - `start` / `dev` / `dev:verbose` → `./examples/console-app/main.ts`
   - `build` → del SDK, no del ejemplo.

### Criterios de aceptación

- [ ] `bun run lint` pasa.
- [ ] Tests pasan (rutas de import actualizadas).
- [ ] `bun run dev` arranca el ejemplo (con BOT_TOKEN en .env).
- [ ] `src/` contiene solo `core/` e `index.ts` — nada app-specific.
- [ ] `src/index.ts` no importa nada de `examples/`.

### Layout resultante

```
src/
├── index.ts          ← barrel público del SDK
└── core/
    ├── bot-handler.ts
    ├── command-handler.ts
    ├── menu-handler.ts
    ├── chat-tracker.ts
    └── logger.ts
examples/
└── console-app/
    ├── main.ts       ← entrypoint de ejemplo
    ├── config.ts     ← carga de env vars local
    └── rabbit-bot.ts ← plugin demo
tests/
scripts/
docs/
```

---

## Fase D · Build publicable

**Objetivo**: Emitir JS ESM + `.d.ts` desde `src/core/` + `src/index.ts`, sin bun-types en la API pública.

### Tareas

1. Crear `tsconfig.build.json` que:
   - Extiende `tsconfig.json`.
   - `rootDir: "src"`, `outDir: "dist"`.
   - `include: ["src"]` (excluye examples, tests, scripts).
   - `declaration: true`, `declarationMap: true`.
   - `types: []` (sin bun-types en el build de librería).
2. Actualizar `package.json`:
   - `main: "dist/index.js"`
   - `types: "dist/index.d.ts"`
   - `exports: { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } }`
   - `files: ["dist"]`
3. Script `build:sdk`: `tsc -p tsconfig.build.json`.
4. Script `build:example`: `bun build ./examples/console-app/main.ts --outdir ./dist-example --target node`.
5. Verificar que `dist/index.d.ts` no contiene referencias a `bun-types`.

### Criterios de aceptación

- [ ] `bun run build:sdk` emite `dist/index.js` + `dist/index.d.ts` + módulos de core.
- [ ] `dist/index.d.ts` no importa `bun-types`.
- [ ] `grep -r "bun" dist/*.d.ts` no encuentra nada.
- [ ] Los `.d.ts` generados exponen exactamente los tipos del barrel.

---

## Fase E · App de consola como consumidor real

**Objetivo**: `examples/console-app/main.ts` importa desde el barrel exactamente como lo haría un consumidor externo.

### Tareas

1. En `examples/console-app/main.ts`, cambiar imports:
   ```ts
   // ANTES
   import { registerPlugins } from "../../src/core/bot-handler";
   // DESPUÉS
   import { Bot, registerPlugins, syncCommands, ChatTracker, FileChatStore }
     from "../../src/index";
   ```
2. Verificar que el ejemplo funciona con `bun run dev`.
3. Documentar en README la separación "Quick Start (repo)" vs "Quick Start (consumidor npm)".

### Criterios de aceptación

- [ ] `examples/console-app/main.ts` no tiene deep imports a `src/core/`.
- [ ] `bun run dev` arranca correctamente.
- [ ] README tiene dos secciones de Quick Start.

---

## Fase F · Tests adaptados + smoke test de empaquetado

**Objetivo**: Los tests cubren el SDK como paquete y el ejemplo como consumidor.

### Tareas

1. **Tests de core** (`tests/command-handler.test.ts`, `tests/bot-handler.test.ts`, `tests/logger.test.ts`):
   - Cambiar imports a barrel: `from "../src/index"`.
   - Esto valida que el barrel exporta todo lo necesario.
2. **Tests de ejemplo** (`tests/rabbit-bot.test.ts`):
   - Importar desde `../examples/console-app/rabbit-bot`.
3. **Smoke test del barrel** (`tests/barrel.test.ts`):
   - Verificar que `import * as SDK from "../src/index"` exporta los símbolos esperados.
   - Verificar que no tiene side effects (no lanza, no escribe en fs).
4. **Smoke test del paquete** (`tests/package.test.ts`):
   - Verificar que `dist/index.d.ts` existe tras build.
   - Verificar que no contiene `bun-types`.

### Criterios de aceptación

- [ ] Todos los tests usan barrel o example imports (no deep imports a core).
- [ ] `bun run test` sigue verde.
- [ ] `bun run build:sdk && bun run test` sigue verde.

---

## Resumen de riesgo por fase

| Fase | Riesgo de breaking | Reversibilidad |
|------|-------------------|----------------|
| A | 🟢 Nulo (additive) | Borrar `index.ts` |
| B | 🟡 Bajo (nuevos params opcionales) | Revertir params |
| C | 🟠 Medio (mover archivos) | `git mv` inverso |
| D | 🟡 Bajo (nuevo tsconfig) | Borrar tsconfig.build |
| E | 🟢 Nulo (solo imports de ejemplo) | Revertir imports |
| F | 🟢 Nulo (solo tests) | Revertir tests |

---

## Dependencias entre fases

```
A (barrel) ──→ B (desacoplo) ──→ C (mover ejemplo) ──→ D (build) ──→ E (consumidor) ──→ F (tests)
                                                            │
                                                            └──→ F (puede empezar smoke tests)
```

A y B son las fases estructurales. C es el punto de no retorno organizativo. D-E-F son refinamiento y verificación.
