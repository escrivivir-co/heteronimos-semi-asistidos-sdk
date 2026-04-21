---
name: history-summary-broadcast
description: "Resume examples/dashboard/userdata/history/ en un mensaje DRY, chunked y transmisible por rb_alephs."
---

Genera un borrador listo para `examples/dashboard/userdata/summary.md`.

## Objetivo

Resumir `examples/dashboard/userdata/history/` en un **summary broadcast** que pueda enviarse con `/rb_alephs`.

## Reglas de salida

- Devuelve solo el contenido final para `summary.md`.
- Piensa en `3` a `6` chunks separados por una línea `---`.
- Cada chunk debe entenderse por sí solo en Telegram.
- Si un detalle ya vive en el repo, enlázalo con `github.com` en vez de repetirlo entero.
- Prioriza síntesis DRY: estado, evidencias clave, next step.
- Mantén nombres propios, ramas, comandos y rutas exactas.
- Evita tablas, fences, diagramas largos y dumps de datos.
- No repitas la misma URL si un enlace a carpeta o documento canónico ya cubre varios puntos.

## Qué leer antes de resumir

- `examples/dashboard/userdata/history/`
- `examples/dashboard/userdata/broadcast.md` para mantener tono y continuidad
- si hace falta, `README-SCRIPTORIUM.md` y `README.md` para validar naming

## Estructura sugerida

1. Apertura breve y continuidad con el histórico.
2. Estado actual o cambio operativo.
3. Evidencia DRY con enlaces GitHub.
4. Petición o siguiente paso concreto.

## Criterio editorial

- El summary no es un acta exhaustiva.
- Debe servir como mensaje transmisible por `/rb_alephs`, no como dossier.
- Usa enlaces a GitHub para offload de detalle cuando ayude a evitar repetición.