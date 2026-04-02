# Console App — Minimal bot example

App de consola mínima para `heteronimos-semi-asistidos-sdk`. Demuestra cómo
arrancar un bot con un plugin real (`RabbitBot`) usando el SDK.

## Cómo correr

```bash
# Desde la raíz del repo — construir el SDK primero:
bun run build:sdk

# Luego, desde este directorio:
cd examples/console-app
bun install
bun run start        # single run
bun run dev          # watch mode
```

O usando los atajos del raíz:

```bash
bun run build:sdk && bun run examples:install
bun run dev          # watch mode
bun run start        # single run
```

## Modo Mock (sin BOT_TOKEN válido)

Al arrancar, el SDK (`bootBot()`) guía al usuario:

1. Si no existe `.env`, ofrece crearlo copiando `.env.example`.
2. Si `BOT_TOKEN` está vacío o ausente, ofrece arrancar en modo mock.
3. Si el token existe pero falla la conexión, también ofrece mock.

```
⚠  No se encontró .env — ¿Crear .env a partir de .env.example? (y/n): y
✔  .env creado. Edítalo con tu BOT_TOKEN de @BotFather.
⚠  BOT_TOKEN no está configurado — ¿Arrancar en modo mock? (y/n): y
[MOCK] Bot mock activo. Comandos registrados: rb_aleph, rb_join...
```

En modo mock:
- Todos los plugins se registran normalmente.
- Los comandos se sincronizan contra el mock (sin llamadas de red).
- No hay polling real — la app queda en estado "mock activo".
- Útil para probar la lógica de plugins sin conexión.

## Estructura

```
examples/console-app/
├── main.ts       ← entrypoint: arranque real + fallback mock
├── config.ts     ← variables opcionales (SOLANA_ADDRESS)
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
