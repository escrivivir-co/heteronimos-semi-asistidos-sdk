# SDS-10 · Prompts & Agentes Expertos — GH Pages + Sistema de Prompts

> **heteronimos-semi-asistidos-sdk** · Software Design Specification
> Estado: ACTIVE · target: v0.2.0+

---

## 1. Objetivo

Formalizar el uso de **prompts de IA caracterizados** como artefactos de primera clase del proyecto, acompañados de una **página GH Pages dedicada** que explique y documente cada prompt.

Los prompts viven en `.github/prompts/` y son plantillas de personalidad: cuando se invocan, el agente adopta un rol específico y se especializa según el **lore y datos extras** que el usuario añade al final del prompt. Sin datos extra, el agente actúa como *codebase owner* general; con contexto adicional, acota y profundiza en ese área.

---

## 2. Motivación

El prompt `hacker-devops` ya existía pero no estaba documentado ni enlazado desde las puertas de entrada públicas del proyecto (README, GH Pages). Nuevos colaboradores no saben:

1. Que existe este recurso.
2. Que hay que añadir lore para especializarlo.
3. Cómo crear sus propios prompts.
4. Qué otros agentes expertos están disponibles.

---

## 3. Diseño

### 3.1 Estructura del sistema de prompts

```
.github/
└── prompts/
    ├── hacker-devops.prompt.md     ← já existe (flagship)
    ├── arquitecto-sdk.prompt.md    ← futuro
    ├── qa-tester.prompt.md         ← futuro
    ├── plugin-developer.prompt.md  ← futuro
    └── dashboard-builder.prompt.md ← futuro
```

Cada archivo `.prompt.md` sigue la estructura:

```markdown
---
name: <slug>
description: "<one-liner del rol>"
---

[personalidad + fuentes de verdad + fases de la sesión]

## Información adicional para esta sesión
[placeholder: el usuario pega su lore aquí]
```

**Principio clave:** las fases del prompt deben referenciar explícitamente las fuentes de verdad del proyecto (`BACKLOG.md`, `specs/`, `git log`, barrel `src/index.ts`, `examples/`). El agente no puede asumir el estado sin consultarlas.

### 3.2 Página GH Pages: `docs/prompts-agents.html`

Página fanzine (usando `poster-template/fanzine.css`) con:

- **Bloque "¿Cómo funciona?"** — explica el mecanismo de caracterización vía lore.
- **Stats bar** — número de prompts disponibles, fases, etc.
- **Card por prompt** — nombre, descripción, fases, fuentes de verdad, ejemplo de uso con lore, enlace al archivo en GitHub.
- **Sección de Agentes Expertos** — con placeholders para los agentes futuros (por área del SDK).
- **Guía de creación** — cómo añadir tu propio prompt.

### 3.3 Integración en `docs/index.html`

- Botón **☞ PROMPTS & AGENTES** en la sección Quick Start.
- Card dedicada (badge `AI`) antes de Contributing con resumen del hacker-devops y tip de uso.

---

## 4. Prompt `hacker-devops` — descripción del comportamiento

**Rol:** Hacker DevOps experimentado, asertivo, crítico constructivo, que acaba de descubrir la codebase.

**Fuentes de verdad que consulta:**
| Fuente | Qué valida |
|--------|-----------|
| `BACKLOG.md` | Estado real de tareas (✅/🔲/💡) |
| `specs/` (SDS-00 a SDS-0N) | Decisiones de arquitectura ya tomadas |
| `git log --oneline -20` | Que docs y código estén sincronizados |
| `src/index.ts` | Superficie pública real del SDK |
| `examples/` | Consumidores reales del SDK |

**Fases de la sesión (5 pasos, un turno por fase):**

| Fase | Nombre | Objetivo |
|------|--------|---------|
| 1 | La Revisión Inquisitiva | Analiza puertas de entrada vs realidad del barrel y backlog |
| 2 | Adaptación y Refactorización | El usuario asigna un rol; rescaneo desde esa perspectiva |
| 3 | Definición del Plan de Ataque | Identifica tareas del backlog, propone iniciativa concreta |
| 4 | El Offboarding / Salida Limpia | Valida que la codebase explica cómo probar, compilar y salir |
| 5 | El Cierre Definitivo | Aplica mejoras, actualiza backlog, cierra sesión |

**Parámetro lore:** cualquier bloque de texto añadido al final del prompt antes de enviar. El agente detecta si hay info extra y acota su análisis a ella.

---

## 5. Agentes expertos futuros

Configuraciones especializadas del patrón hacker-devops con lore preembebido:

| Slug | Foco | Specs relevantes |
|------|------|-----------------|
| `arquitecto-sdk` | Diseño de capas, frontera SDK/app, acoplamiento | SDS-00, SDS-02, SDS-03 |
| `qa-tester` | Cobertura de tests, criterios de aceptación, regresiones | SDS-04 Fase F, tests/ |
| `plugin-developer` | Ciclo de vida BotPlugin, commands, menus, onMessage | SDS-01, SDS-02 §1 |
| `dashboard-builder` | TUI Ink, store reactivo, emitter bridge, UI Bridge Layer | SDS-05, SDS-06, SDS-09 |

---

## 6. Criterios de aceptación

- [ ] `docs/prompts-agents.html` existe, usa `fanzine.css`, es navegable desde `docs/index.html`.
- [ ] `docs/index.html` tiene enlace y card con descripción del hacker-devops.
- [ ] Cada prompt card explica que acepta lore al final y muestra un ejemplo.
- [ ] Cada prompt card enlaza al archivo `.prompt.md` en GitHub.
- [ ] La sección de agentes expertos tiene placeholders claros para los futuros.
- [ ] La guía de creación permite a cualquier contribuidor añadir su propio prompt.

---

## 7. Archivos afectados

| Archivo | Acción |
|---------|--------|
| `docs/prompts-agents.html` | NUEVO |
| `docs/index.html` | Añadir enlace + card |
| `specs/10-prompts-agents.md` | NUEVO (este archivo) |
| `BACKLOG.md` | Nuevo sprint con tareas |
| `.github/prompts/hacker-devops.prompt.md` | Ya existe (sin cambios en esta fase) |
| `.github/prompts/arquitecto-sdk.prompt.md` | FUTURO |
| `.github/prompts/qa-tester.prompt.md` | FUTURO |
| `.github/prompts/plugin-developer.prompt.md` | FUTURO |
| `.github/prompts/dashboard-builder.prompt.md` | FUTURO |
