# SDS-08 · Extracción de ejemplos como paquetes independientes

> **heteronimos-semi-asistidos-sdk** · Software Design Specification
> Estado: DRAFT · target: v0.2.0

---

## 1. Objetivo

Convertir `examples/console-app/` y `examples/dashboard/` en paquetes npm independientes que consuman el SDK mediante su nombre de paquete (`heteronimos-semi-asistidos-sdk`) en lugar de paths relativos (`../../src/index`).

**Por qué:**
- Valida que la superficie pública del barrel es suficiente para un consumidor real.
- El DevOps puede copiar un ejemplo, hacer `bun install` y tener un bot funcional sin conocer la estructura interna del SDK.
- Detecta roturas en exports, types o peerDeps antes de publicar a npm.

---

## 2. Estructura objetivo

```
heteronimos-semi-asistidos-sdk/        ← raíz del SDK
├── src/
├── dist/
├── package.json                       ← SDK package
├── tsconfig.json
├── tsconfig.build.json
└── examples/
    ├── console-app/
    │   ├── package.json               ← NUEVO
    │   ├── tsconfig.json              ← NUEVO
    │   ├── config.ts
    │   ├── rabbit-bot.ts
    │   └── main.ts
    └── dashboard/
        ├── package.json               ← NUEVO
        ├── tsconfig.json              ← NUEVO
        ├── config.ts                  ← NUEVO (copia local)
        ├── rabbit-bot.ts             ← NUEVO (copia local)
        ├── main.tsx
        ├── App.tsx
        ├── emitter-bridge.ts
        ├── state.ts
        ├── store.ts
        ├── theme.ts
        └── components/
```

---

## 3. Decisiones de diseño

### 3.1 `file:` protocol — sin workspaces

Cada ejemplo instala el SDK con:

```json
"dependencies": {
  "heteronimos-semi-asistidos-sdk": "file:../../"
}
```

**No usamos Bun workspaces** porque el objetivo es simular la experiencia de un consumidor que haría `bun add heteronimos-semi-asistidos-sdk`. El `file:` protocol crea un symlink al `dist/` del SDK pero resuelve imports a través del `exports` map del `package.json` raíz — exactamente como lo haría npm.

**Prerequisito:** el SDK debe estar construido (`bun run build:sdk`) antes de instalar los ejemplos. Documentar esto en cada README.

### 3.2 Eliminación de imports cruzados entre ejemplos

Actualmente el dashboard importa de `../console-app/`:

```typescript
import { SOLANA_ADDRESS } from "../console-app/config.js";
import { RabbitBot } from "../console-app/rabbit-bot.js";
```

Esto rompe la independencia. Solución: **duplicar `rabbit-bot.ts` y `config.ts` en el dashboard.** Son archivos de demo (no del SDK), pequeños (~30 líneas cada uno), y la duplicación es intencional — cada ejemplo debe ser autocontenido para que un DevOps pueda copiar un directorio entero y que funcione.

> Si en el futuro se acumulan más plugins compartidos, se puede crear un tercer paquete `examples/shared-plugins/`. No hacerlo ahora — YAGNI.

### 3.3 Imports: nombre de paquete, no paths relativos

Todos los imports al SDK cambian de:

```typescript
// ANTES
import { Logger, bootBot } from "../../src/index";
import type { RuntimeEmitter } from "../../src/index.js";
```

a:

```typescript
// DESPUÉS
import { Logger, bootBot } from "heteronimos-semi-asistidos-sdk";
import type { RuntimeEmitter } from "heteronimos-semi-asistidos-sdk";
```

### 3.4 Verificación del barrel — exports faltantes

De los imports actuales, todo está en el barrel público:

| Símbolo | Barrel? | Usado por |
|---------|---------|-----------|
| `Logger` | ✅ | ambos |
| `bootBot` | ✅ | ambos |
| `RuntimeEmitter` | ✅ | dashboard |
| `RuntimeEvent` (type) | ✅ | dashboard |
| `PluginInfo` (type) | ✅ | dashboard |
| `BotPlugin` (type) | ✅ | rabbit-bot |
| `CommandDefinition` (type) | ✅ | rabbit-bot |
| `MenuDefinition` (type) | ✅ | rabbit-bot |

No se necesitan nuevos exports en el barrel.

---

## 4. Archivos nuevos — detalle

### 4.1 `examples/console-app/package.json`

```json
{
  "name": "example-console-app",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "bun run main.ts",
    "dev": "bun --watch run main.ts"
  },
  "dependencies": {
    "heteronimos-semi-asistidos-sdk": "file:../../",
    "grammy": "^1.11.2",
    "rxjs": "^7.8.2"
  }
}
```

**`grammy` y `rxjs`** se declaran como deps directas porque son `peerDependencies` del SDK — el consumidor es responsable de instalarlas, exactamente como en npm real.

### 4.2 `examples/dashboard/package.json`

```json
{
  "name": "example-dashboard",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "bun run main.tsx",
    "dev": "bun --watch run main.tsx"
  },
  "dependencies": {
    "heteronimos-semi-asistidos-sdk": "file:../../",
    "grammy": "^1.11.2",
    "rxjs": "^7.8.2",
    "ink": "5",
    "react": "19"
  },
  "devDependencies": {
    "@types/react": "19"
  }
}
```

### 4.3 `examples/console-app/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["bun-types"],
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  },
  "include": ["."]
}
```

### 4.4 `examples/dashboard/tsconfig.json`

Idéntico al de console-app. El dashboard necesita `jsx` por Ink/React.

---

## 5. Cambios en archivos existentes

### 5.1 `examples/console-app/main.ts`

```diff
-import { Logger, bootBot } from "../../src/index";
+import { Logger, bootBot } from "heteronimos-semi-asistidos-sdk";
```

### 5.2 `examples/console-app/rabbit-bot.ts`

```diff
-import type { BotPlugin, CommandDefinition, MenuDefinition } from "../../src/index";
+import type { BotPlugin, CommandDefinition, MenuDefinition } from "heteronimos-semi-asistidos-sdk";
```

### 5.3 `examples/dashboard/main.tsx`

```diff
-import { RuntimeEmitter, Logger, bootBot } from "../../src/index.js";
-import { SOLANA_ADDRESS } from "../console-app/config.js";
-import { RabbitBot } from "../console-app/rabbit-bot.js";
+import { RuntimeEmitter, Logger, bootBot } from "heteronimos-semi-asistidos-sdk";
+import { SOLANA_ADDRESS } from "./config.js";
+import { RabbitBot } from "./rabbit-bot.js";
```

### 5.4 `examples/dashboard/emitter-bridge.ts`

```diff
-import type { RuntimeEmitter, RuntimeEvent } from "../../src/index.js";
+import type { RuntimeEmitter, RuntimeEvent } from "heteronimos-semi-asistidos-sdk";
```

### 5.5 `examples/dashboard/state.ts`

```diff
-import type { PluginInfo } from "../../src/index.js";
+import type { PluginInfo } from "heteronimos-semi-asistidos-sdk";
```

### 5.6 Archivos nuevos en dashboard (copias desde console-app)

- `examples/dashboard/config.ts` — copia exacta de `examples/console-app/config.ts`
- `examples/dashboard/rabbit-bot.ts` — copia de `examples/console-app/rabbit-bot.ts` con import ya cambiado a nombre de paquete

### 5.7 `scripts/build-bot-father-settings.ts`

Este script importa `RabbitBot` desde el ejemplo:

```typescript
// ANTES
import { RabbitBot } from "../examples/console-app/rabbit-bot";
import type { BotPlugin } from "../src/index";
import { collectPluginFatherSettings, toBotFatherFormat, Logger } from "../src/index";
```

El script vive en `scripts/` (raíz del SDK), no dentro de un ejemplo. Los imports al barrel desde `../src/index` siguen funcionando porque `scripts/` no es un paquete independiente. Pero el import a `../examples/console-app/rabbit-bot` ahora cruza la frontera hacia un paquete con su propio `node_modules`.

**Solución**: mantener el import relativo tal cual — el script ejecuta desde la raíz del repo donde `examples/console-app/rabbit-bot.ts` sigue existiendo como archivo TS. Bun resuelve el import directamente (no pasa por `node_modules` del ejemplo). **No requiere cambio.**

> Nota: si el ejemplo cambiara su `rabbit-bot.ts` para importar del paquete (`heteronimos-semi-asistidos-sdk`) en vez de path relativo, el archivo sigue siendo importable desde `scripts/` porque Bun transpila TS al vuelo.

### 5.8 `tests/dashboard.test.ts`

Los tests importan módulos puros del dashboard via path relativo:

```typescript
import { createStore } from "../examples/dashboard/store";
import { getDefaultDashboardState, ... } from "../examples/dashboard/state";
import { connectEmitterToStore } from "../examples/dashboard/emitter-bridge";
import { RuntimeEmitter } from "../src/index";
```

Estos módulos (`store.ts`, `state.ts`, `emitter-bridge.ts`) no importan del SDK ellos mismos (salvo `state.ts` que importa `PluginInfo` type y `emitter-bridge.ts` que importa `RuntimeEmitter` type). Tras la extracción, esos imports de tipos pasarán a `"heteronimos-semi-asistidos-sdk"`.

**Problema**: cuando los tests corren desde la raíz (`bun test ./tests`), `../examples/dashboard/state.ts` importará `PluginInfo` de `"heteronimos-semi-asistidos-sdk"`. Bun resolverá esto buscando en `examples/dashboard/node_modules/` — que necesita existir (el ejemplo debe haber hecho `bun install`).

**Solución**: añadir `bun install` de los ejemplos como paso previo al test, o como parte del script `test` del raíz. Propuesta:

```json
"pretest": "bun run build:sdk && cd examples/console-app && bun install && cd ../dashboard && bun install",
"test": "bun test ./tests"
```

Los imports relativos en el test **no cambian** — `../examples/dashboard/store` sigue siendo un path válido desde `tests/`.

---

## 6. Scripts en `package.json` raíz

Todos los scripts que referencian `examples/` necesitan revisión:

### 6.1 Scripts de ejecución

```diff
-"start": "bun run ./examples/console-app/main.ts",
-"dev": "bun --watch run ./examples/console-app/main.ts",
-"dev:verbose": "LOG_LEVEL=debug bun --watch run ./examples/console-app/main.ts",
-"dev:dashboard": "bun --watch run ./examples/dashboard/main.tsx",
+"start": "cd examples/console-app && bun run start",
+"dev": "cd examples/console-app && bun run dev",
+"dev:verbose": "cd examples/console-app && LOG_LEVEL=debug bun run dev",
+"dev:dashboard": "cd examples/dashboard && bun run dev",
```

### 6.2 Script de build de ejemplo

```diff
-"build:example": "bun build ./examples/console-app/main.ts --outdir ./dist-example --target node",
+"build:example": "cd examples/console-app && bun build main.ts --outdir ../../dist-example --target node",
```

### 6.3 Scripts de test — añadir bootstrap de ejemplos

```diff
-"test": "bun run build:sdk && bun test ./tests",
-"test:report": "bun run build:sdk && bun test ./tests --reporter=junit --reporter-outfile=test-results.xml",
-"test:coverage": "bun run build:sdk && bun test ./tests --coverage",
+"examples:install": "cd examples/console-app && bun install && cd ../dashboard && bun install",
+"test": "bun run build:sdk && bun run examples:install && bun test ./tests",
+"test:report": "bun run build:sdk && bun run examples:install && bun test ./tests --reporter=junit --reporter-outfile=test-results.xml",
+"test:coverage": "bun run build:sdk && bun run examples:install && bun test ./tests --coverage",
```

### 6.4 Script de bot-father-settings — sin cambios

`"bot-father-settings": "bun run ./scripts/build-bot-father-settings.ts"` — no cambia (ver §5.7).

---

## 7. Documentación — cambios requeridos

### 7.1 `.gitignore`

Añadir:

```
examples/*/node_modules
```

### 7.2 `README.md`

Secciones afectadas:

- **Quick Start / Scripts table**: actualizar `bun run dev`, `bun run dev:dashboard`, `bun run start` para indicar que delegan al paquete del ejemplo. Documentar que el primer uso requiere `bun run build:sdk && bun run examples:install`.
- **Project structure tree** (línea ~135): la carpeta `examples/` ya figura. Añadir mención de que cada ejemplo es un paquete npm independiente (`package.json` propio).
- **Demo: RabbitBot section** (línea ~253): el snippet de código debe usar import de nombre de paquete, no path relativo.

### 7.3 `examples/console-app/README.md`

Actualizar instrucciones de ejecución:

```diff
-bun run dev
+cd examples/console-app
+bun install
+bun run start
```

Documentar prerequisito: `bun run build:sdk` en la raíz.

### 7.4 `examples/dashboard/README.md`

Actualizar:

```diff
-bun run dev:dashboard
+cd examples/dashboard
+bun install
+bun run start
```

### 7.5 `CONTRIBUTING.md`

- Línea 68: el árbol de estructura ya muestra `examples/`. Añadir nota de que son paquetes independientes.
- Línea 81: cambiar `see examples/console-app/rabbit-bot.ts as a working example plugin` → mantener la referencia pero aclarar que los imports en el ejemplo usan el nombre del paquete.

### 7.6 `docs/index.html`

- Línea 121: las menciones a `examples/console-app/` y `examples/dashboard/` son meramente navegacionales ("ver esta carpeta"). **No requieren cambio** — los paths siguen siendo válidos.
- Línea 204: snippet de código con `# examples/console-app/main.ts`. Mantener como referencia contextual.

### 7.7 `docs/dashboard-guide.html`

Éste es el más afectado — es un tutorial paso a paso que muestra código con imports obsoletos:

| Línea | Contenido obsoleto | Cambio |
|-------|-------------------|--------|
| 171 | "Crea la carpeta de tu app dentro de `examples/`" | Añadir: "Cada ejemplo es un paquete npm independiente con su propio `package.json`" |
| 218 | `"dev:dashboard": "bun --watch run ./examples/dashboard/main.tsx"` | Cambiar a `"dev:dashboard": "cd examples/dashboard && bun run dev"` |
| 667 | `import { RabbitBot } from "../console-app/rabbit-bot.js"` | Cambiar a `import { RabbitBot } from "./rabbit-bot.js"` |
| 660-667 | Bloque completo de imports con `../../src/index.js` y `../console-app/` | Actualizar a imports de paquete + locales |
| 686 | `const plugins = [new RabbitBot()]` | Sin cambio (el uso no cambia) |
| 741 | `bun run dev:dashboard` | Sin cambio (el script sigue existiendo como atajo) |

---

## 8. Workflow de desarrollo

```
1. Editar src/**                     ← cambiar el SDK
2. bun run build:sdk                 ← compilar a dist/
3. cd examples/console-app
4. bun install                       ← re-link al dist/ actualizado
5. bun run start                     ← probar con SDK empaquetado
```

Atajos desde la raíz:

```bash
bun run examples:install             # instala ambos ejemplos
bun run dev                           # ejecuta console-app
bun run dev:dashboard                 # ejecuta dashboard
```

---

## 9. Checklist de implementación

### Fase A · Infraestructura (blocker)

| # | Tarea | Prioridad |
|---|-------|-----------|
| 1 | `bun run build:sdk` — verificar que `dist/` está completo y `.d.ts` se generan | blocker |
| 2 | Agregar `examples/*/node_modules` al `.gitignore` | P0 |

### Fase B · Console-app

| # | Tarea | Prioridad |
|---|-------|-----------|
| 3 | Crear `examples/console-app/package.json` | P0 |
| 4 | Crear `examples/console-app/tsconfig.json` | P0 |
| 5 | Cambiar imports en `console-app/main.ts` y `rabbit-bot.ts` | P0 |
| 6 | `cd examples/console-app && bun install && bun run start` — verificar arranque | P0 |

### Fase C · Dashboard

| # | Tarea | Prioridad |
|---|-------|-----------|
| 7 | Copiar `config.ts` y `rabbit-bot.ts` a `examples/dashboard/` (con import de paquete) | P0 |
| 8 | Crear `examples/dashboard/package.json` | P0 |
| 9 | Crear `examples/dashboard/tsconfig.json` | P0 |
| 10 | Cambiar imports en `dashboard/main.tsx`, `emitter-bridge.ts`, `state.ts` | P0 |
| 11 | `cd examples/dashboard && bun install && bun run start` — verificar arranque | P0 |

### Fase D · Scripts y tests

| # | Tarea | Prioridad |
|---|-------|-----------|
| 12 | Actualizar scripts en `package.json` raíz (§6.1–6.3) | P0 |
| 13 | Verificar `bun test ./tests` pasa — especialmente `dashboard.test.ts` | P0 |
| 14 | Verificar `bun run bot-father-settings` sigue funcionando | P1 |

### Fase E · Documentación

| # | Tarea | Prioridad |
|---|-------|-----------|
| 15 | `README.md` — scripts table, project tree, demo snippet (§7.2) | P1 |
| 16 | `examples/console-app/README.md` — instrucciones de ejecución (§7.3) | P1 |
| 17 | `examples/dashboard/README.md` — instrucciones de ejecución (§7.4) | P1 |
| 18 | `CONTRIBUTING.md` — nota sobre paquetes independientes (§7.5) | P1 |
| 19 | `docs/dashboard-guide.html` — imports, scripts, tutorial (§7.7) | P1 |
| 20 | Verificación final: `bun run build:sdk && bun run examples:install && bun test ./tests` | P0 |

---

## 10. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| `file:` no resuelve types correctamente | Los imports compilan pero sin IntelliSense | `declarationMap: true` ya está en tsconfig.build.json — Bun sigue los source maps |
| El dev olvida `build:sdk` antes de probar | Imports apuntan a `dist/` viejo | Documentar en README; el script `test` ya incluye `build:sdk` |
| `bun install` no hace symlink en Windows | `node_modules` tiene una copia en lugar de link | En Windows Bun usa junctions — funciona. Verificar en CI. |
| Duplicación de `rabbit-bot.ts` diverge | Las copias se desincronzan | Aceptable — son demos, no librería. Si crece, extraer a paquete compartido. |
| `dashboard.test.ts` falla sin `examples:install` | Tests CI rotos | `test` script incluye `examples:install` como paso previo |
| `docs/dashboard-guide.html` queda obsoleto | Tutorial muestra imports viejos, confunde al lector | Checklist Fase E incluye actualización explícita de la guía |

---

## 11. Fuera de alcance

- **Bun workspaces**: añadiría complejidad sin beneficio para el objetivo de simular consumidor externo.
- **Monorepo tooling** (turborepo, nx): overkill para 2 ejemplos.
- **Publicación a npm**: es el siguiente paso natural pero no entra en esta spec.
- **Subpath exports** del SDK (`heteronimos-semi-asistidos-sdk/mock`): MockTelegramBot se mantiene interno. Si un consumidor lo necesita, abrir una spec nueva.
