---
name: messages-summary-broadcast
description: "Resume examples/dashboard/.messages.json en un mensaje DRY, chunked y transmisible por rb_alephs."
---

Genera un borrador listo para `examples/dashboard/userdata/summary.md`.

## Objetivo

Resumir el hilo hablado persistido en `examples/dashboard/.messages.json` en un **summary broadcast** que pueda enviarse con `/rb_alephs`.

## Reglas de salida

- Devuelve solo el contenido final para `summary.md`.
- Piensa en `3` a `6` chunks separados por una línea `---`.
- Cada chunk debe entenderse por sí solo en Telegram.
- No describas el JSON ni enumeres campos técnicos salvo que aporten contexto real.
- Si un detalle ya vive en el repo, enlázalo con `github.com` en vez de repetirlo entero.
- Prioriza síntesis DRY: contexto, estado, evidencias clave, next step.
- Mantén nombres propios, ramas, comandos y rutas exactas.
- Evita tablas, fences, diagramas largos y dumps de mensajes.
- No repitas la misma URL si un enlace canónico ya cubre varios puntos.
- Filtra ruido conversacional: mensajes vacíos, tests triviales, repeticiones, errores ya corregidos y saludos sin contenido.

## Qué leer antes de resumir

- `examples/dashboard/.messages.json`
- `examples/dashboard/userdata/broadcast.md` para mantener tono y continuidad
- `examples/dashboard/userdata/summary.md` para no romper el formato esperado
- si hace falta, `README-SCRIPTORIUM.md` y `README.md` para validar naming

## Cómo seleccionar el hilo

- Usa `chatId`, `chatNames` y la continuidad temática para aislar un hilo coherente.
- Si hay varios chats, prioriza el chat que conecte con `broadcast.md` o el que concentre la conversación operativa más relevante.
- Ordena mentalmente por `timestamp` y resume la conversación como secuencia, no como dump.
- Integra respuestas de bots y comandos cuando cambien el estado real del hilo.

## Estructura sugerida

1. Apertura breve y continuidad del hilo.
2. Qué se descubrió o decidió.
3. Evidencia DRY con enlaces GitHub.
4. Estado actual y siguiente paso concreto.

## Criterio editorial

- El summary no es un acta exhaustiva.
- Debe servir como mensaje transmisible por `/rb_alephs`, no como dossier.
- Usa enlaces a GitHub para offload de detalle cuando ayude a evitar repetición.
- Si el hilo ya quedó cristalizado en `broadcast.md`, resume la conversación que llevó hasta ahí en vez de reescribir el broadcast completo.