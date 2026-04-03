/**
 * MockTelegramBot — doble en proceso del SDK.
 *
 * Implementa la superficie mínima de grammy.Bot que consumen los módulos core
 * (registerPlugins, syncCommandsWithTelegram, ChatTracker, registerMenu).
 * No hay networking. Útil en unit tests y como fallback interactivo cuando
 * Telegram no está disponible.
 *
 * USO en tests:
 *   const bot = new MockTelegramBot();
 *   registerPlugins(bot as any, plugins, tracker);
 *   await bot.simulateCommand("rb_aleph");
 *   expect(bot.getSentMessages()).toHaveLength(1);
 */

import type { BotCommand } from "./command-handler.js";
import type { RuntimeEmitter } from "./runtime-emitter.js";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface MockBotOptions {
  /** Comandos pre-cargados que getMyCommands devuelve. Default: [] */
  initialCommands?: BotCommand[];
  /** RuntimeEmitter para emitir command-executed y command-response. Opcional. */
  emitter?: RuntimeEmitter;
}

export interface SimulateOpts {
  chatId?: number;
  chatType?: "private" | "group" | "supergroup" | "channel";
  chatTitle?: string;
  userId?: number;
  username?: string;
}

export type SentMessage = { chatId: number; text: string };

// ---------------------------------------------------------------------------
// Fixtures deterministas para tests y modo fallback
// ---------------------------------------------------------------------------

export const MOCK_FIXTURES = {
  chatId: 100001,
  userId:  42,
  username: "MockUser",
  initialCommands: [] as BotCommand[],
};

// ---------------------------------------------------------------------------
// Context mínimo que satisface a los handlers grammY del SDK
// ---------------------------------------------------------------------------

function createMockContext(opts: {
  updateType?: "message" | "my_chat_member" | "chat_member";
  text: string;
  chatId: number;
  chatType?: "private" | "group" | "supergroup" | "channel";
  chatTitle?: string;
  userId: number;
  username: string;
  commandMatch?: string;
  sentMessages: SentMessage[];
}): object {
  const chatType = opts.chatType ?? (opts.chatId < 0 ? "group" : "private");
  const chat = chatType === "private"
    ? { id: opts.chatId, type: "private", first_name: opts.username }
    : { id: opts.chatId, type: chatType, title: opts.chatTitle ?? `${chatType}:${opts.chatId}` };

  return {
    from: { id: opts.userId, first_name: opts.username },
    chat,
    ...(opts.updateType === "message" || !opts.updateType
      ? { message: { text: opts.text, entities: undefined } }
      : {}),
    ...(opts.updateType === "my_chat_member"
      ? { myChatMember: { old_chat_member: { status: "left" }, new_chat_member: { status: "member" } } }
      : {}),
    ...(opts.updateType === "chat_member"
      ? { chatMember: { old_chat_member: { status: "left" }, new_chat_member: { status: "member" } } }
      : {}),
    match: opts.commandMatch ?? "",        // grammY CommandContext.match
    reply: async (text: string, _options?: unknown) => {
      opts.sentMessages.push({ chatId: opts.chatId, text });
    },
    editMessageText: async (text: string, _options?: unknown) => {
      opts.sentMessages.push({ chatId: opts.chatId, text });
    },
  };
}

// ---------------------------------------------------------------------------
// MockTelegramBot
// ---------------------------------------------------------------------------

export class MockTelegramBot {
  private middlewares: Array<(ctx: object, next: () => Promise<void>) => Promise<void>> = [];
  private commandHandlers = new Map<string, (ctx: object) => Promise<void>>();
  private callbackHandlers = new Map<string, (ctx: object) => Promise<void>>();
  private eventHandlers = new Map<string, Array<(ctx: object) => Promise<void>>>();
  /** Commands stored per scope. Key includes scope.type and scope identifiers. */
  private commandsByScope = new Map<string, BotCommand[]>();
  private sentMessages: SentMessage[] = [];
  private emitter?: RuntimeEmitter;

  readonly api: {
    getMyCommands(opts?: { scope?: { type: string; chat_id?: number | string } }): Promise<BotCommand[]>;
    setMyCommands(commands: BotCommand[], opts?: { scope?: { type: string; chat_id?: number | string } }): Promise<void>;
    sendMessage(chatId: number, text: string, options?: unknown): Promise<void>;
  };

  constructor(options?: MockBotOptions) {
    this.emitter = options?.emitter;
    // Load initialCommands into the default scope
    if (options?.initialCommands?.length) {
      this.commandsByScope.set("default", [...options.initialCommands]);
    }

    const scopeKey = (scope?: { type: string; chat_id?: number | string }) => {
      if (!scope) return "default";
      if (scope.type === "chat") return `chat:${scope.chat_id}`;
      return scope.type;
    };

    this.api = {
      getMyCommands: async (opts?) => {
        const key = scopeKey(opts?.scope);
        return [...(this.commandsByScope.get(key) ?? [])];
      },
      setMyCommands: async (commands, opts?) => {
        const key = scopeKey(opts?.scope);
        this.commandsByScope.set(key, [...commands]);
      },
      sendMessage: async (chatId, text) => { this.sentMessages.push({ chatId, text }); },
    };
  }

  // --- Registro (interfaz compatible con grammy.Bot) ---

  use(middleware: (ctx: object, next: () => Promise<void>) => Promise<void>): void {
    this.middlewares.push(middleware);
  }

  on(event: string, handler: (ctx: object) => Promise<void>): void {
    const handlers = this.eventHandlers.get(event) ?? [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
  }

  command(name: string, handler: (ctx: object) => Promise<void>): void {
    this.commandHandlers.set(name, handler);
  }

  callbackQuery(data: string, handler: (ctx: object) => Promise<void>): void {
    this.callbackHandlers.set(data, handler);
  }

  async start(): Promise<void> {
    // No-op: no hay polling
  }

  async stop(): Promise<void> {
    // No-op: cleanup seguro en shutdown hooks
  }

  // --- Simulación ---

  /**
   * Simula un mensaje de texto entrante.
   * Ejecuta la cadena de middlewares (necesario para ChatTracker.register)
   * y luego los handlers on("message").
   */
  async simulateMessage(text: string, opts?: SimulateOpts): Promise<void> {
    const ctx = createMockContext({
      updateType: "message",
      text,
      chatId:   opts?.chatId   ?? MOCK_FIXTURES.chatId,
      chatType: opts?.chatType,
      chatTitle: opts?.chatTitle,
      userId:   opts?.userId   ?? MOCK_FIXTURES.userId,
      username: opts?.username ?? MOCK_FIXTURES.username,
      sentMessages: this.sentMessages,
    });
    for (const mw of this.middlewares) await mw(ctx, async () => {});
    for (const handler of this.eventHandlers.get("message") ?? []) await handler(ctx);
  }

  async simulateMyChatMember(opts?: SimulateOpts): Promise<void> {
    const ctx = createMockContext({
      updateType: "my_chat_member",
      text: "",
      chatId: opts?.chatId ?? MOCK_FIXTURES.chatId,
      chatType: opts?.chatType,
      chatTitle: opts?.chatTitle,
      userId: opts?.userId ?? MOCK_FIXTURES.userId,
      username: opts?.username ?? MOCK_FIXTURES.username,
      sentMessages: this.sentMessages,
    });
    for (const mw of this.middlewares) await mw(ctx, async () => {});
    for (const handler of this.eventHandlers.get("my_chat_member") ?? []) await handler(ctx);
  }

  /**
   * Simula un comando (sin /).
   * Ejecuta middlewares + handler del comando.
   * Retorna los SentMessage producidos por ESTA ejecución.
   * Emite command-executed y command-response por el emitter si está configurado.
   * Lanza si el comando no está registrado.
   */
  async simulateCommand(name: string, opts?: SimulateOpts): Promise<SentMessage[]> {
    const handler = this.commandHandlers.get(name);
    if (!handler) throw new Error(`MockTelegramBot: no handler registered for command "${name}"`);

    const chatId  = opts?.chatId   ?? MOCK_FIXTURES.chatId;
    const userId  = opts?.userId   ?? MOCK_FIXTURES.userId;
    const username = opts?.username ?? MOCK_FIXTURES.username;
    const before = this.sentMessages.length;

    // Emit command-executed before running the handler
    this.emitter?.emit({
      type: "command-executed",
      command: name,
      chatId,
      userId,
      username,
      timestamp: new Date().toISOString(),
    });

    const ctx = createMockContext({
      updateType: "message",
      text:         `/${name}`,
      commandMatch: "",
      chatId,
      chatType: opts?.chatType,
      chatTitle: opts?.chatTitle,
      userId,
      username,
      sentMessages: this.sentMessages,
    });
    for (const mw of this.middlewares) await mw(ctx, async () => {});
    await handler(ctx);

    // Collect messages produced by this execution
    const produced = this.sentMessages.slice(before);

    // Emit command-response for each reply
    for (const msg of produced) {
      this.emitter?.emit({
        type: "command-response",
        command: name,
        text: msg.text,
        chatId: msg.chatId,
        timestamp: new Date().toISOString(),
      });
    }

    return produced;
  }

  // --- Introspección ---

  getSentMessages(): SentMessage[] {
    return [...this.sentMessages];
  }

  getRegisteredCommands(): string[] {
    return [...this.commandHandlers.keys()];
  }

  /** Limpia mensajes enviados y handlers registrados (útil entre tests). */
  reset(): void {
    this.middlewares = [];
    this.commandHandlers.clear();
    this.callbackHandlers.clear();
    this.eventHandlers.clear();
    this.sentMessages = [];
    this.commandsByScope.clear();
  }
}
