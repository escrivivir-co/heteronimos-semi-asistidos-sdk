# SDS-07 · Mock Telegram — Fallback en proceso para desarrollo y tests

> **heteronimos-semi-asistidos-sdk** · Software Design Specification
> Estado: REVIEWED · target: v0.2.0

---

## 1. Objetivo

Añadir un módulo interno `MockTelegramBot` que implemente la superficie mínima que el SDK consume de `grammy.Bot`, de modo que:

1. Los **unit tests** puedan ejercitar `registerPlugins`, `syncCommandsWithTelegram`, `ChatTracker` y handlers sin depender de la API real de Telegram.
2. El **example console-app** pueda detectar un fallo de conexión al arrancar (token inválido, red caída) y ofrecer al usuario un modo mock interactivo con datos estáticos.

No es un mockserver HTTP ni una emulación completa de grammY. Es un doble en proceso que cubre exclusivamente la operativa que el SDK usa hoy.

---

## 2. Superficie mínima requerida

Analizando los cuatro módulos core que consumen `Bot`:

| Módulo | Lo que usa de Bot |
|--------|------------------|
| `bot-handler.ts` → `registerPlugins` | `bot.use(mw)`, `bot.on(\"message\", handler)` · ctx: `reply()`, `from`, `chat`, `message` |
| `command-handler.ts` → `registerCommands` | `bot.command(name, handler)` · ctx: `reply()`, `from`, `message.entities`, `match` |
| `command-handler.ts` → `syncCommandsWithTelegram` | `bot.api.getMyCommands()`, `bot.api.setMyCommands(cmds)` |
| `menu-handler.ts` → `registerMenu` | `bot.command(name, handler)`, `bot.callbackQuery(data, handler)` · ctx: `reply()`, `editMessageText()` |
| `chat-tracker.ts` → `register` | `bot.use(mw)` · ctx: `chat.id`, `next()` |
| `chat-tracker.ts` → `broadcast` | `bot.api.sendMessage(chatId, text)` |

### Contrato estructural del mock

```typescript
interface MockBotShape {
  use(middleware: Function): void;
  on(event: string, handler: Function): void;
  command(name: string, handler: Function): void;
  callbackQuery(data: string, handler: Function): void;
  start(): Promise<void>;
  stop(): Promise<void>;
  api: {
    getMyCommands(): Promise<BotCommand[]>;
    setMyCommands(commands: BotCommand[]): Promise<void>;
    sendMessage(chatId: number, text: string, options?: unknown): Promise<void>;
  };
}
```

> **No se introduce una interfaz formal `TelegramBotLike` en el SDK ni se cambian las firmas existentes.** El mock no implementa toda la superficie de `Bot` (filter queries, error handling, etc.), por lo que se pasa como `as any` en los call sites que aceptan `Bot`. Esto evita un refactor invasivo de todos los módulos core y mantiene la compatibilidad total con consumidores actuales.

---

## 3. Diseño del módulo

### 3.1 Ubicación

```
src/core/mock-telegram.ts   ← módulo nuevo (~150 líneas)
```

### 3.2 Clase `MockTelegramBot`

```typescript
export interface MockBotOptions {
  /** Comandos pre-cargados que getMyCommands devuelve. Default: [] */
  initialCommands?: BotCommand[];
}

export class MockTelegramBot {
  // --- Estado interno ---
  private middlewares: Function[];
  private commandHandlers: Map<string, Function>;
  private callbackHandlers: Map<string, Function>;
  private messageHandlers: Function[];
  private storedCommands: BotCommand[];
  private sentMessages: { chatId: number; text: string }[];

  // --- API mock ---
  readonly api: {
    getMyCommands(): Promise<BotCommand[]>;
    setMyCommands(commands: BotCommand[]): Promise<void>;
    sendMessage(chatId: number, text: string, options?: unknown): Promise<void>;
  };

  // --- Registro (compatible con Bot) ---
  use(middleware: Function): void;
  on(event: string, handler: Function): void;
  command(name: string, handler: Function): void;
  callbackQuery(data: string, handler: Function): void;
  start(): Promise<void>;  // no-op, resuelve inmediatamente
  stop(): Promise<void>;   // no-op, para cleanup seguro en shutdown

  // --- Simulación (API de testing) ---
  simulateMessage(text: string, opts?: { chatId?: number; userId?: number; username?: string }): Promise<void>;
  simulateCommand(name: string, opts?: { chatId?: number; userId?: number; username?: string }): Promise<void>;

  // --- Introspección ---
  getSentMessages(): { chatId: number; text: string }[];
  getRegisteredCommands(): string[];
  reset(): void;
}
```

### 3.3 Context mock para handlers

Los handlers de grammY reciben `Context`. El mock construye un contexto mínimo por cada simulación:

```typescript
function createMockContext(opts: {
  text: string;
  chatId: number;
  userId: number;
  username: string;
  commandMatch?: string;
  sentMessages: { chatId: number; text: string }[];
}): object {
  return {
    from: { id: opts.userId, first_name: opts.username },
    chat: { id: opts.chatId },
    message: { text: opts.text, entities: undefined },
    match: opts.commandMatch ?? "",  // grammY CommandContext.match
    reply: async (text: string, options?: unknown) => {
      opts.sentMessages.push({ chatId: opts.chatId, text });
    },
    editMessageText: async (text: string, options?: unknown) => {
      opts.sentMessages.push({ chatId: opts.chatId, text });
    },
  };
}
```

### 3.4 Middleware chain en simulación

`simulateMessage` y `simulateCommand` deben ejecutar la cadena completa:

1. **Middlewares** registrados vía `use()` (en orden de registro)
2. **Handlers** — `on("message")` para mensajes, `commandHandlers[name]` para comandos

Esto es necesario porque `ChatTracker.register()` usa `bot.use()` para trackear chats — si simulate no pasa los middlewares, los tests de integración fallan silentemente.

```typescript
async simulateMessage(text: string, opts?: SimulateOpts): Promise<void> {
  const ctx = createMockContext({ text, ...MOCK_FIXTURES, ...opts, sentMessages: this.sentMessages });
  // 1. Run middleware chain
  for (const mw of this.middlewares) await mw(ctx, async () => {});
  // 2. Run on("message") handlers
  for (const handler of this.messageHandlers) await handler(ctx);
}

async simulateCommand(name: string, opts?: SimulateOpts): Promise<void> {
  const handler = this.commandHandlers.get(name);
  if (!handler) throw new Error(`No handler registered for command: ${name}`);
  const ctx = createMockContext({
    text: `/${name}`, commandMatch: "", ...MOCK_FIXTURES, ...opts,
    sentMessages: this.sentMessages,
  });
  // 1. Run middleware chain (ChatTracker needs this)
  for (const mw of this.middlewares) await mw(ctx, async () => {});
  // 2. Run command handler
  await handler(ctx);
}
```

### 3.5 Datos estáticos / fixtures

Para el modo fallback interactivo del example, el mock arranca con una semilla de datos estáticos inspirados en `RabbitBot`:

```typescript
export const MOCK_FIXTURES = {
  chatId: 100001,
  userId: 42,
  username: "MockUser",
  initialCommands: [] as BotCommand[],
};
```

Estos fixtures deben ser deterministas y reutilizables tanto en tests como en el example.

---

## 4. Integración con tests

### 4.1 Patrón de uso

```typescript
import { MockTelegramBot } from "../src/core/mock-telegram";
import { registerPlugins, syncCommandsWithTelegram } from "../src/index";

const bot = new MockTelegramBot();
registerPlugins(bot as any, [plugin], tracker, emitter);
await syncCommandsWithTelegram(bot as any, commands, { autoConfirm: true });

// Simular interacción
await bot.simulateCommand("rb_aleph");
expect(bot.getSentMessages()).toHaveLength(1);
```

### 4.2 Tests nuevos a añadir

| Test file | Cobertura |
|-----------|-----------|
| `tests/mock-telegram.test.ts` | Clase MockTelegramBot: registro, simulación, api mock, reset |
| Ampliar `tests/bot-handler.test.ts` | `registerPlugins` sobre mock bot (handlers se registran correctamente) |
| Ampliar `tests/command-handler.test.ts` | `syncCommandsWithTelegram` contra api mock (diff, auto-confirm, set) |
| Ampliar `tests/chat-tracker.test.ts` | `ChatTracker.register` + `broadcast` sobre mock bot |

### 4.3 Relación con tests existentes

Los tests actuales de `command-handler.test.ts` ya usan dobles simples con `as any`. El mock formaliza ese patrón y lo hace reutilizable, pero **no obliga a migrar los tests existentes**: ambos enfoques coexisten.

---

## 5. Fallback interactivo en el example

### 5.1 Flujo de arranque modificado

```
┌─ main.ts ──────────────────────────────────────────────┐
│                                                         │
│  1. new Bot(TOKEN)                                      │
│  2. registerPlugins(bot, plugins, tracker)               │
│  3. try { await syncCommands(bot, plugins, tracker) }    │
│     catch (err) ──┐                                      │
│                    ▼                                      │
│  4. Log error (formatTelegramStartupError)               │
│  5. Prompt CLI: "¿Arrancar en modo mock? (y/n)"         │
│     ├─ y → new MockTelegramBot()                         │
│     │     registerPlugins(mockBot, plugins, tracker)      │
│     │     log "Mock mode active. Simulating..."          │
│     │     await mockBot.start()                           │
│     └─ n → process.exitCode = 1                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Indicadores en modo mock

- Logger emite `[MOCK]` como prefijo de scope en modo mock.
- El bot mock emite un `RuntimeEvent { type: "status-change", status: "running" }` al hacer `start()`.
- El prompt usa la función `confirm()` que ya existe en `logger.ts`.

---

## 6. Qué NO cubre este mock

| Aspecto | Motivo |
|---------|--------|
| Polling real / webhook | No hay networking |
| `answerCallbackQuery` | No lo invoca el SDK; documentar si plugins lo necesitan |
| `InlineKeyboard` rendering | Los menús se registran pero no se renderizan |
| Múltiples bots en un proceso | Fuera de scope |
| Rate limiting / errores transitorios | Mock siempre responde OK |
| `Context` completo de grammY | Solo los campos usados por handlers actuales |

---

## 7. Fases de implementación

| Fase | Entregable | Depende de |
|------|-----------|------------|
| **O-1** | `src/core/mock-telegram.ts` — clase + fixtures | — |
| **O-2** | `tests/mock-telegram.test.ts` — tests unitarios del mock | O-1 |
| **O-3** | Ampliar tests existentes con mock bot | O-1 |
| **O-4** | Fallback interactivo en `examples/console-app/main.ts` | O-1 |
| **O-5** | Fallback en `examples/dashboard/main.tsx` (mismo patrón que O-4) | O-1 |
| **O-6** | README de `examples/console-app/` — mock mode | O-4, O-5 |
| **O-7** | Actualizar barrel nota en README raíz: mencionar mock mode | O-6 |
| **O-8** | Actualizar `docs/index.html` stats + mock feature | O-6 |

---

## 8. Decisiones de alcance

- **Incluido**: mock en proceso, aislado, interno, reutilizable por tests y examples.
- **Incluido**: prompt interactivo en el arranque de ambos examples cuando falle Telegram.
- **Excluido**: mockserver HTTP, API REST, puertos.
- **Excluido**: refactor de firmas de core para introducir interfaz formal `TelegramBotLike`.
- **Excluido**: exportar el mock desde el barrel público del SDK.
- **Aplazado**: si consumidores externos necesitan el mock, se promueve a export o paquete separado.

---

## 9. Riesgos y mitigaciones

| Riesgo | Prob. | Mitigación |
|--------|-------|------------|
| Mock se desincroniza de la surface real | Media | Test de humo que verifica `registerPlugins(mockBot as any, ...)` compila |
| `as any` oculta roturas de contrato | Media | Tests de integración que ejercitan el flujo completo |
| Context mock incompleto para plugins complejos | Baja | Documentar campos soportados; extender bajo demanda |
| `editMessageText` needed by menus | Baja | Incluido en mock context (§3.3); no-op que registra en sentMessages |
| Prompt interactivo bloquea CI | Baja | El prompt solo vive en el example, no en el SDK core |
