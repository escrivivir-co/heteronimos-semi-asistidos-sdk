---
name: broadcast-ops
description: "Broadcast Operations: guía rápida para el sistema de broadcast del dashboard (rb_aleph)."
---

Guía operativa del sistema de **broadcast** de este repo. Úsala cuando necesites entender, enviar o depurar broadcasts.

## Arquitectura del broadcast

El sistema vive en `examples/dashboard/` y tiene tres piezas:

1. **`rabbit-bot.ts`** — `RabbitBot` plugin. Registra el comando `/rb_aleph`.
   - `readBroadcastFile()` lee `userdata/broadcast.md`, lo parte por `---` en chunks.
   - `archiveBroadcast()` mueve el archivo a `userdata/history/<nombre>-<timestamp>.md` y deja una plantilla vacía.
   - Tras enviar, el archivo queda archivado automáticamente.

2. **`main.tsx`** — conecta `RabbitBot.setBroadcast(result.broadcast)` con el `ChatTracker.broadcast()` del SDK.

3. **SDK core** (`src/core/`):
   - `boot.ts` → `bootBot()` retorna `broadcast: (msg) => tracker.broadcast(bot, msg)` en `BootResult`.
   - `persistence/chat-tracker.ts` → `ChatTracker.broadcast(bot, msg)` itera `.chats.json` y envía a cada chat.
   - `runtime-emitter.ts` → emite evento `{ type: "broadcast", chatCount, message, timestamp }` por chunk.

## Flujo completo de un broadcast

```
operador edita userdata/broadcast.md
      ↓
/rb_aleph (Telegram o TUI panel 5)
      ↓
readBroadcastFile() → split por "---" → chunks[]
      ↓
for each chunk → broadcastFn(chunk) → ChatTracker.broadcast(bot, chunk)
      ↓
for each chatId in .chats.json → bot.api.sendMessage(chatId, chunk)
      ↓
archiveBroadcast() → mueve a userdata/history/ con timestamp, deja template
      ↓
"✅ Broadcast sent (N messages) — archived as <filename>"
```

## Cómo enviar un broadcast

1. Editar `examples/dashboard/userdata/broadcast.md` con el contenido.
2. Separar secciones con `---` en línea propia si quieres mensajes múltiples.
3. Arrancar el dashboard: `cd examples/dashboard && bun run start`.
4. Ejecutar `/rb_aleph` (Telegram DM al bot, o TUI: tecla `5` → seleccionar `rb_aleph` → Enter).
5. El archivo se archiva automáticamente en `userdata/history/`.

## Ficheros clave

| Fichero | Rol |
|---------|-----|
| `examples/dashboard/userdata/broadcast.md` | Mensaje activo (se lee y se archiva al enviar) |
| `examples/dashboard/userdata/history/` | Archivo de broadcasts enviados (con timestamp) |
| `examples/dashboard/rabbit-bot.ts` | Plugin con comando `/rb_aleph` |
| `examples/dashboard/main.tsx` | Wiring broadcast → ChatTracker |
| `src/core/boot.ts` | `BootResult.broadcast` |
| `src/core/persistence/chat-tracker.ts` | `ChatTracker.broadcast()` |
| `tests/aleph-broadcast.test.ts` | Tests del broadcast |

## Notas para agentes

- El path del broadcast es hardcoded: `userdata/broadcast.md` (constante `BROADCAST_FILE` en `rabbit-bot.ts`).
- `.chats.json` se crea automáticamente al recibir el primer mensaje. En mock mode se auto-trackea el chat 100001.
- El broadcast NO se auto-consume al arrancar. Solo se dispara con `/rb_aleph`.
- Tras enviar, el archivo original se mueve a `userdata/history/` con sufijo timestamp ISO (sin caracteres ilegales para filesystem).
- Si `userdata/broadcast.md` solo contiene la template mínima (empieza con `<!-- BROADCAST TEMPLATE -->`), el comando avisa de que no hay contenido real.

## Criterio editorial para `userdata/broadcast.md`

- Usa una línea `---` solo cuando quieras abrir un mensaje nuevo.
- Cada bloque debe entenderse por sí solo al llegar a Telegram.
- Prioriza 4-6 bloques, títulos cortos y cierre operativo.
- Evita tablas, diagramas ASCII largos y fences si el mensaje va a chat.
- Si el broadcast trata la federación del dashboard, incluye la capa Scriptorium: submódulo `BotHubSDK` + plugin `bot-hub-sdk` + conexión de Rabbit, Spider y Horse al ecosistema.
