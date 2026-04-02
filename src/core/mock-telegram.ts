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
import type { ChatInfo } from "./chat-tracker.js";
import type { RuntimeEmitter } from "./runtime-emitter.js";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface MockBotOptions {
  /** Comandos pre-cargados que getMyCommands devuelve. Default: [] */
  initialCommands?: BotCommand[];
  /** RuntimeEmitter para emitir command-executed y command-response. Opcional. */
  emitter?: RuntimeEmitter;
  /**
   * Mapa de chatId a ChatInfo parcial para que getChat devuelva datos mock.
   * Si el chatId no está en el mapa getChat lanza un error genérico.
   */
  mockChats?: Map<number, Partial<ChatInfo>>;
}

export interface SimulateOpts {
  chatId?: number;
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
  text: string;
  chatId: number;
  userId: number;
  username: string;
  commandMatch?: string;
  sentMessages: SentMessage[];
}): object {
  return {
    from: { id: opts.userId, first_name: opts.username },
    chat: { id: opts.chatId },
    message: { text: opts.text, entities: undefined },
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
  private messageHandlers: Array<(ctx: object) => Promise<void>> = [];
  /** Per-scope command storage. Key is BotCommandScope.type string. */
  private commandsByScope = new Map<string, BotCommand[]>();
  private sentMessages: SentMessage[] = [];
  private emitter?: RuntimeEmitter;
  private mockChats: Map<number, Partial<ChatInfo>>;

  readonly api: {
    getMyCommands(params?: { scope?: { type: string } }): Promise<BotCommand[]>;
    setMyCommands(commands: BotCommand[], params?: { scope?: { type: string } }): Promise<void>;
    sendMessage(chatId: number, text: string, options?: unknown): Promise<void>;
    getChat(chatId: number): Promise<Partial<ChatInfo>>;
  };

  constructor(options?: MockBotOptions) {
    const initial = options?.initialCommands ?? [];
    // Inicializar todos los scopes conocidos con los mismos comandos iniciales.
    for (const scope of ["default", "all_group_chats", "all_chat_administrators", "all_private_chats"]) {
      this.commandsByScope.set(scope, [...initial]);
    }
    this.emitter = options?.emitter;
    this.mockChats = options?.mockChats ?? new Map();

    this.api = {
      getMyCommands: async (params) => {
        const key = params?.scope?.type ?? "default";
        return [...(this.commandsByScope.get(key) ?? [])];
      },
      setMyCommands: async (commands, params) => {
        const key = params?.scope?.type ?? "default";
        this.commandsByScope.set(key, [...commands]);
      },
      sendMessage: async (chatId, text) => { this.sentMessages.push({ chatId, text }); },
      getChat: async (chatId) => {
        const data = this.mockChats.get(chatId);
        if (!data) throw new Error(`MockTelegramBot: no mock data for chatId ${chatId}`);
        return data;
      },
    };
  }

  /** Returns all stored commands for a given scope (default: "default"). */
  getStoredCommands(scope = "default"): BotCommand[] {
    return [...(this.commandsByScope.get(scope) ?? [])];
  }

  // --- Registro (interfaz compatible con grammy.Bot) ---

  use(middleware: (ctx: object, next: () => Promise<void>) => Promise<void>): void {
    this.middlewares.push(middleware);
  }

  on(_event: string, handler: (ctx: object) => Promise<void>): void {
    // El SDK solo usa bot.on("message", handler)
    this.messageHandlers.push(handler);
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
      text,
      chatId:   opts?.chatId   ?? MOCK_FIXTURES.chatId,
      userId:   opts?.userId   ?? MOCK_FIXTURES.userId,
      username: opts?.username ?? MOCK_FIXTURES.username,
      sentMessages: this.sentMessages,
    });
    for (const mw of this.middlewares) await mw(ctx, async () => {});
    for (const handler of this.messageHandlers) await handler(ctx);
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
      text:         `/${name}`,
      commandMatch: "",
      chatId,
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
    this.messageHandlers = [];
    this.sentMessages = [];
    this.commandsByScope.clear();
  }
}
