# Console App — Minimal bot example

App de consola mínima para `heteronimos-semi-asistidos-sdk`. Demuestra cómo
arrancar un bot con un plugin real (`RabbitBot`) usando el SDK.

## Cómo correr

```bash
# Desde la raíz del repo. Necesitas .env con BOT_TOKEN.
bun run dev          # watch mode
bun run start        # single run
```

## Modo Mock (sin BOT_TOKEN válido)

Si Telegram rechaza el token o la red no está disponible, la app detecta el
error y pregunta:

```
¿Arrancar en modo mock (sin Telegram)? (y/n):
```

Respondiendo `y`, arranca un `MockTelegramBot` en proceso:
- Todos los plugins se registran normalmente.
- Los comandos se sincronizan contra el mock (sin llamadas de red).
- No hay polling real — la app queda en estado "mock activo".
- Útil para probar la lógica de plugins sin conexión.

## Estructura

```
examples/console-app/
├── main.ts       ← entrypoint: arranque real + fallback mock
├── config.ts     ← carga BOT_TOKEN y SOLANA_ADDRESS desde .env
└── rabbit-bot.ts ← plugin RabbitBot (pluginCode = "rb")
```

## Añadir un plugin propio

```ts
// 1. Implementa BotPlugin
export class MyBot implements BotPlugin {
  name = "my-bot";
  pluginCode = "mb";
  commands() { return [{ command: "hello", description: "Say hi", buildText: () => "Hi!" }]; }
}

// 2. Añádelo al array en main.ts
const plugins = [new RabbitBot(SOLANA_ADDRESS), new MyBot()];
```
