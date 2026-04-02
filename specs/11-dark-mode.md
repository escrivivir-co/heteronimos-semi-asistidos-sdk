# SDS-11 · Light/Dark Mode Toggle — GH Pages

> **heteronimos-semi-asistidos-sdk** · Software Design Specification
> Estado: DRAFT · target: v0.2.0+

---

## 1. Objetivo

Añadir soporte de **light/dark mode con toggle** a todas las páginas de GH Pages (`docs/`), manteniendo la estética fanzine B/W y sin romper el diseño existente.

El modo claro es el actual (negro sobre blanco). El modo oscuro invierte la paleta base (blanco sobre negro/gris oscuro) manteniendo el contraste y la personalidad visual del proyecto.

---

## 2. Motivación

- La documentación se lee frecuentemente en entornos con poca luz (terminales, IDEs en dark mode).
- Los desarrolladores esperan soporte de dark mode como estándar en documentación técnica.
- La estética fanzine B/W se presta naturalmente a la inversión: el contraste se mantiene, solo cambia la polaridad.

---

## 3. Diseño

### 3.1 Arquitectura CSS: custom properties

Convertir todos los colores hardcoded de `fanzine.css` a CSS custom properties definidas en `:root`. Crear dos conjuntos de variables:

```css
:root {
  /* ── base palette ── */
  --fg:           #000;
  --fg-soft:      #111;
  --bg:           #fff;
  --bg-alt:       #f4f4f4;
  --bg-warm:      #f6f1e8;
  --bg-muted:     #fafafa;
  --bg-concept:   #f0f0f0;
  --border:       #000;
  --border-soft:  #111;

  /* ── inverted elements ── */
  --inv-bg:       #000;
  --inv-fg:       #fff;

  /* ── diagram (always inverted) ── */
  --diagram-bg:   #000;
  --diagram-fg:   #fff;

  /* ── misc ── */
  --tape-bg:      rgba(0,0,0,0.07);
  --shadow-soft:  rgba(0,0,0,0.04);
  --link:         #111;
  --link-hover-bg:#444;
}
```

**Dark theme** — activado vía `[data-theme="dark"]` en `<html>`:

```css
[data-theme="dark"] {
  --fg:           #e0e0e0;
  --fg-soft:      #ccc;
  --bg:           #1a1a1a;
  --bg-alt:       #252525;
  --bg-warm:      #2a2520;
  --bg-muted:     #222;
  --bg-concept:   #2a2a2a;
  --border:       #e0e0e0;
  --border-soft:  #aaa;

  --inv-bg:       #e0e0e0;
  --inv-fg:       #1a1a1a;

  --diagram-bg:   #e0e0e0;
  --diagram-fg:   #1a1a1a;

  --tape-bg:      rgba(255,255,255,0.07);
  --shadow-soft:  rgba(255,255,255,0.04);
  --link:         #ccc;
  --link-hover-bg:#666;
}
```

### 3.2 Reglas de sustitución en `fanzine.css`

Toda referencia a color literal se reemplaza por la variable correspondiente:

| Literal actual | Variable |
|---|---|
| `#000` (text, borders) | `var(--fg)` o `var(--border)` según contexto |
| `#111` (soft text, links) | `var(--fg-soft)` o `var(--border-soft)` |
| `#fff` (backgrounds) | `var(--bg)` |
| `#f4f4f4` (code blocks) | `var(--bg-alt)` |
| `#fafafa` (details bg) | `var(--bg-muted)` |
| `#f6f1e8` (warm boxes) | `var(--bg-warm)` |
| `#f0f0f0` (key-concept) | `var(--bg-concept)` |
| `rgba(0,0,0,0.07)` (tape) | `var(--tape-bg)` |
| `background: #000; color: #fff` (hl-box, kw-inv, badge, etc.) | `background: var(--inv-bg); color: var(--inv-fg)` |
| `.diagram` bg/fg | `var(--diagram-bg)` / `var(--diagram-fg)` |

### 3.3 Toggle button

Un botón fijo en la esquina superior derecha, coherente con la estética fanzine:

```
┌──────┐
│ ☀/☾  │  ← botón con borde sólido, tipografía Courier
└──────┘
```

- Posición: `position: fixed; top: 12px; right: 12px; z-index: 1000`
- Estilo: borde sólido, font monospace, padding mínimo, sin sombras
- Texto: `☀` en modo oscuro (para cambiar a claro), `☾` en modo claro (para cambiar a oscuro)
- Tamaño: compacto (~28×28px), no interfiere con el contenido

### 3.4 JavaScript: toggle + persistencia

Script inline mínimo (~20 líneas), inyectado en cada página vía snippet incluido al final del `<body>`:

```
1. Al cargar: leer localStorage("theme")
   - Si existe → aplicar
   - Si no → leer prefers-color-scheme del sistema
   - Aplicar data-theme="dark"|"light" en <html>
2. Al click en toggle:
   - Flipear data-theme
   - Guardar en localStorage
   - Actualizar icono del botón
```

**Anti-flash:** el script de detección debe ir en un `<script>` síncrono en el `<head>` (antes del render) para evitar el flash de tema incorrecto. El script del toggle button va al final del `<body>`.

```html
<!-- En <head>, ANTES de estilos -->
<script>
(function(){
  var t = localStorage.getItem('theme');
  if (!t) t = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
})();
</script>
```

### 3.5 Inline styles en cada página HTML

Cada página tiene `<style>` blocks con colores hardcoded (ej: `border: 2px solid #111`, `background: #111`, `color: #fff`). Estos deben migrar a las mismas custom properties.

### 3.6 Template actualizado

`docs/poster-template/template.html` debe incluir:
- El script anti-flash en `<head>`
- El botón toggle en `<body>`
- Comentario indicando el patrón para nuevas páginas

### 3.7 Print: sin cambios

En `@media print`, forzar el tema light para mantener la impresión B/W original:

```css
@media print {
  :root { /* forzar light */ }
}
```

---

## 4. Páginas afectadas

| Página | Inline styles con colores |
|---|---|
| `docs/index.html` | `#111`, `#fff`, `#444`, `#222`, `#f6f1e8` |
| `docs/quick-start.html` | `#111` |
| `docs/dashboard-guide.html` | `#000`, `#fff`, `#111`, `#f6f1e8` |
| `docs/prompts-agents.html` | `#111`, `#000`, `#fff`, `#f6f1e8` |
| `docs/poster-template/template.html` | (scaffold — adaptar) |
| `docs/poster-template/spec-template.html` | (scaffold — adaptar) |
| `docs/poster-template/fanzine.css` | **todas** las referencias de color |

---

## 5. Plan de implementación (Fases)

### Fase AA · CSS custom properties + dark theme en `fanzine.css`

1. Definir `:root` con todas las variables de §3.1
2. Definir `[data-theme="dark"]` con la paleta oscura
3. Sustituir **todos** los literales de color por `var(--xxx)` en `fanzine.css`
4. Añadir regla `@media print` que fuerce light theme
5. Verificar visualmente: en light mode la página se ve idéntica al estado actual

### Fase AB · Toggle button + script anti-flash

1. Añadir estilos del toggle button a `fanzine.css` (clase `.theme-toggle`)
2. Crear snippet de script anti-flash para `<head>`
3. Crear snippet de toggle button + script para final de `<body>`
4. Insertar ambos snippets en `docs/index.html`
5. Verificar: toggle funciona, persiste, respeta `prefers-color-scheme`

### Fase AC · Migrar inline styles de todas las páginas

1. `docs/index.html` — sustituir colores hardcoded en `<style>` por variables
2. `docs/quick-start.html` — ídem
3. `docs/dashboard-guide.html` — ídem
4. `docs/prompts-agents.html` — ídem
5. Verificar: las 4 páginas se ven bien en ambos modos

### Fase AD · Templates + docs

1. Actualizar `docs/poster-template/template.html` — incluir anti-flash + toggle
2. Actualizar `docs/poster-template/spec-template.html` — ídem
3. Actualizar `docs/poster-template/README.md` — documentar dark mode

---

## 6. Criterios de aceptación

1. **Light mode idéntico** — visualmente no hay regresión vs. el estado actual.
2. **Dark mode legible** — contraste mínimo WCAG AA (4.5:1 para texto normal).
3. **Toggle funcional** — un click cambia el tema, el icono se actualiza.
4. **Persistencia** — recargar la página mantiene la elección del usuario.
5. **System default** — sin preferencia guardada, respeta `prefers-color-scheme`.
6. **Anti-flash** — no hay parpadeo de tema incorrecto al cargar.
7. **Print** — `@media print` fuerza light mode.
8. **4 páginas** — index, quick-start, dashboard-guide, prompts-agents funcionan correctamente.
9. **Templates** — los scaffolds incluyen el patrón de dark mode.

---

## 7. Referencias

- `docs/poster-template/fanzine.css` — stylesheet actual (solo B/W)
- `docs/index.html` — página principal
- `docs/poster-template/template.html` — scaffold para nuevos posters
- MDN: [`prefers-color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
- WCAG 2.1 contrast ratios: [Understanding SC 1.4.3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
