---
name: broadcast-ops
description: "Broadcast Operations: guía rápida para los sistemas de broadcast del dashboard (rb_aleph y rb_alephs)."
---

Guía operativa de los sistemas de **broadcast** de este repo. Úsala cuando necesites entender, enviar o depurar broadcasts.

## Arquitectura del broadcast

El sistema vive en `examples/dashboard/` y tiene tres piezas activas y un indice complementario en el dossier raiz:

1. **`rabbit-bot.ts`** — `RabbitBot` plugin. Registra los comandos `/rb_aleph` y `/rb_alephs`.
      - `rb_aleph` lee `userdata/broadcast.md`, lo parte por `---` en chunks y lo archiva en `userdata/history/`.
      - `rb_alephs` lee `userdata/summary.md`, lo parte por `---` en chunks y lo archiva en `userdata/summary-history/`.
      - Tras enviar, el archivo activo queda reemplazado automáticamente por su plantilla.

2. **`main.tsx`** — conecta `RabbitBot.setBroadcast(result.broadcast)` con el `ChatTracker.broadcast()` del SDK.

3. **SDK core** (`src/core/`):
   - `boot.ts` → `bootBot()` retorna `broadcast: (msg) => tracker.broadcast(bot, msg)` en `BootResult`.
   - `persistence/chat-tracker.ts` → `ChatTracker.broadcast(bot, msg)` itera `.chats.json` y envía a cada chat.
   - `runtime-emitter.ts` → emite evento `{ type: "broadcast", chatCount, message, timestamp }` por chunk.

4. **`sala/dossiers/scriptorium-bot-hub-integration/archivo/broadcast/proxy-retro.md`** — indice humano opcional para offload de contexto.
      - No lo leen ni `/rb_aleph` ni `/rb_alephs`.
      - Sirve para apuntar desde `broadcast.md` a evidencia, dossier, onboarding y anexos sin inflar el mensaje transmitido.

## Flujo completo de un broadcast

```
operador edita userdata/broadcast.md o userdata/summary.md
      ↓
/rb_aleph o /rb_alephs (Telegram o TUI panel 5)
      ↓
readQueuedMessageFile() → split por "---" → chunks[]
      ↓
for each chunk → broadcastFn(chunk) → ChatTracker.broadcast(bot, chunk)
      ↓
for each chatId in .chats.json → bot.api.sendMessage(chatId, chunk)
      ↓
archiveQueuedMessage() → mueve al directorio de archivo correspondiente con timestamp y deja template
      ↓
"✅ ... sent (N messages) — archived as <filename>"
```

## Cómo enviar un broadcast

1. Editar `examples/dashboard/userdata/broadcast.md` o `examples/dashboard/userdata/summary.md` con el contenido.
2. Separar secciones con `---` en línea propia si quieres mensajes múltiples.
3. Arrancar el dashboard: `cd examples/dashboard && bun run start`.
4. Ejecutar `/rb_aleph` para updates o `/rb_alephs` para summaries (Telegram DM al bot, o TUI: tecla `5` → seleccionar comando → Enter).
5. El archivo se archiva automáticamente en `userdata/history/` o `userdata/summary-history/`.

## Ficheros clave

| Fichero | Rol |
|---------|-----|
| `examples/dashboard/userdata/broadcast.md` | Mensaje activo (se lee y se archiva al enviar) |
| `examples/dashboard/userdata/summary.md` | Summary activo para `rb_alephs` |
| `sala/dossiers/scriptorium-bot-hub-integration/archivo/broadcast/proxy-retro.md` | Indice complementario para lectores humanos; no lo consume el bot |
| `examples/dashboard/userdata/history/` | Archivo de broadcasts enviados (con timestamp) |
| `examples/dashboard/userdata/summary-history/` | Archivo de summaries enviados (con timestamp) |
| `examples/dashboard/rabbit-bot.ts` | Plugin con comando `/rb_aleph` |
| `examples/dashboard/main.tsx` | Wiring broadcast → ChatTracker |
| `src/core/boot.ts` | `BootResult.broadcast` |
| `src/core/persistence/chat-tracker.ts` | `ChatTracker.broadcast()` |
| `tests/aleph-broadcast.test.ts` | Tests del broadcast |
| `.github/prompts/history-summary-broadcast.prompt.md` | Prompt para sintetizar `userdata/history/` a `summary.md` |

## Notas para agentes

- Los paths activos son hardcoded: `userdata/broadcast.md` y `userdata/summary.md`.
- El proxy RETRO vive en el dossier raiz; puedes enlazarlo desde `broadcast.md`, pero no se envia automaticamente.
- `.chats.json` se crea automáticamente al recibir el primer mensaje. En mock mode se auto-trackea el chat 100001.
- Los mensajes NO se auto-consumen al arrancar. Solo se disparan con `/rb_aleph` o `/rb_alephs`.
- Tras enviar, el archivo original se mueve al directorio de archivo correspondiente con sufijo timestamp ISO (sin caracteres ilegales para filesystem).
- Si el fichero activo solo contiene su template mínima, el comando avisa de que no hay contenido real.

## Criterio editorial para `userdata/broadcast.md` y `userdata/summary.md`

- Usa una línea `---` solo cuando quieras abrir un mensaje nuevo.
- Cada bloque debe entenderse por sí solo al llegar a Telegram.
- Prioriza 4-6 bloques, títulos cortos y cierre operativo.
- Evita tablas, diagramas ASCII largos y fences si el mensaje va a chat.
- Si el broadcast trata la federación del dashboard, incluye la capa Scriptorium: submódulo `BotHubSDK` + plugin `bot-hub-sdk` + conexión de Rabbit, Spider y Horse al ecosistema.
- Para summaries, usa enlaces `github.com` para puntos ya archivados y evita repetir bloques largos del histórico.

## Upgrade de broadcast ya enviado

Cuando necesites emitir una revision de un broadcast ya archivado, usa este patron minimo:

1. Anuncia explicitamente que se revisa el mensaje ya enviado y cita la ruta de archivo.
      Ejemplo canonico: `examples/dashboard/userdata/history/broadcast-2026-04-21T20-16-41-950Z.md`.
2. Explica en una o dos lineas el reenfoque.
      Caso tipo de este dossier: pasar de una lectura centrada en "puerta federada" o "white paper" a una lectura centrada en sesion IACM, pareja `grafo-sdk` / `grafo-legalista-sdk`, y protocolo `REQUEST -> ACKNOWLEDGE -> REPORT`.
3. Si DocumentMachineSDK es parte central del mensaje, eleva `para-la-voz-sdk` a ciudadano de primera categoria.
      Usa al menos una de estas dos entradas:
      - `https://escrivivir-co.github.io/para-la-voz-sdk/engine/` para mostrar la maquina completa y ubicar el slot grafo en el proceso.
      - `https://escrivivir-co.github.io/para-la-voz-sdk/` como landing publica del SDK hoy visible desde `mod/restitutiva`.
4. El tono debe ser profesional y no defensivo: no presentar la revision como correccion vergonzante, sino como maduracion editorial del material ya enviado.

### Formula editorial recomendada

Puedes reutilizar una formulacion de este estilo cuando el contexto lo pida:

`Revisamos y reenfocamos el broadcast ya enviado para hacer mas legible el objeto real de trabajo. La ayuda de RETRO sigue siendo clave, no solo para el canal IACM, sino para la nueva superficie publica de DocumentMachineSDK que ya estamos mostrando en gh-pages como para-la-voz-sdk.`

### Recordatorio DRY

- El detalle tecnico extenso debe seguir viviendo en el dossier raiz y en `proxy-retro.md`.
- El broadcast activo solo debe cargar el titular de revision, el reenfoque y el CTA operativo.
- Si promocionas `para-la-voz-sdk`, enlazalo como producto hermano o superficie publica de DocumentMachineSDK, no como sustituto del dossier tecnico.
