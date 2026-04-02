import * as fs from "node:fs";
import { Bot } from "grammy";
import { Logger } from "./logger.js";
import type { RuntimeEmitter } from "./runtime-emitter.js";

const log = new Logger("chat-tracker");

/** Información básica de un chat de Telegram (subconjunto de la API). */
export interface ChatInfo {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

/** Contrato mínimo de almacenamiento de chat IDs */
export interface ChatStore {
  load(): number[] | Promise<number[]>;
  save(chatIds: number[]): void | Promise<void>;
}

/** Implementación por defecto: fichero JSON */
export class FileChatStore implements ChatStore {
  constructor(private filePath: string) {}

  load(): number[] {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
        if (Array.isArray(data)) return data;
      }
    } catch {
      log.warn("Could not load chats file, starting fresh.");
    }
    return [];
  }

  save(chatIds: number[]): void {
    fs.writeFileSync(this.filePath, JSON.stringify(chatIds), "utf-8");
  }
}

/** Implementación en memoria para tests y entornos headless */
export class MemoryChatStore implements ChatStore {
  private data: number[] = [];
  load(): number[] { return [...this.data]; }
  save(chatIds: number[]): void { this.data = chatIds; }
}

/**
 * Persiste los chat IDs de usuarios que han interactuado con el bot.
 * Se usa para poder enviar broadcasts (Telegram no tiene broadcast nativo).
 */
export class ChatTracker {
  private chatIds: Set<number>;
  private chatNames = new Map<number, string>();
  private store: ChatStore;
  private emitter?: RuntimeEmitter;

  constructor(store?: ChatStore, emitter?: RuntimeEmitter) {
    this.store = store ?? new MemoryChatStore();
    this.emitter = emitter;
    const loaded = this.store.load();
    this.chatIds = new Set(Array.isArray(loaded) ? loaded : []);
  }

  private save() {
    this.store.save([...this.chatIds]);
  }

  track(chatId: number, title?: string, chatType?: string) {
    if (title) this.chatNames.set(chatId, title);
    if (!this.chatIds.has(chatId)) {
      this.chatIds.add(chatId);
      this.save();
      log.debug(`Tracked new chat: ${chatId}${title ? ` (${title})` : ""}`);
      this.emitter?.emit({
        type: "chat-tracked",
        chatId,
        total: this.chatIds.size,
        chatTitle: title,
        chatType,
        timestamp: new Date().toISOString(),
      });
    } else if (title) {
      // Chat ya conocido pero con nombre nuevo (renombrado, o primera vez que llega)
      this.emitter?.emit({
        type: "chat-tracked",
        chatId,
        total: this.chatIds.size,
        chatTitle: title,
        chatType,
        timestamp: new Date().toISOString(),
      });
    }
  }

  getAll(): number[] {
    return [...this.chatIds];
  }

  /**
   * Emite eventos chat-tracked para todos los chats ya cargados desde el store.
   * Llamar una sola vez al arrancar para que el bridge / dashboard los muestre
   * aunque no llegue ningún mensaje nuevo.
   */
  emitLoaded(): void {
    if (!this.emitter) return;
    const total = this.chatIds.size;
    for (const chatId of this.chatIds) {
      this.emitter.emit({
        type: "chat-tracked",
        chatId,
        total,
        chatTitle: this.chatNames.get(chatId),
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Registra middleware en el bot para trackear automáticamente todos los chats.
   */
  register(bot: Bot) {
    bot.use((ctx, next) => {
      if (ctx.chat) {
        const chat = ctx.chat;
        let title: string | undefined;
        if (chat.type === "private") {
          title = chat.first_name + ("last_name" in chat && chat.last_name ? " " + chat.last_name : "");
        } else if ("title" in chat && chat.title) {
          title = chat.title;
        }
        this.track(chat.id, title, chat.type);
      }
      return next();
    });
  }

  /**
   * Envía un mensaje a todos los chats conocidos.
   * Ignora errores individuales (usuario bloqueó el bot, etc).
   */
  async broadcast(bot: Bot, message: string) {
    const chats = this.getAll();
    if (chats.length === 0) {
      log.info("No known chats to broadcast to.");
      return;
    }

    log.info(`Broadcasting to ${chats.length} chat(s)...`);
    let sent = 0;
    let failed = 0;

    for (const chatId of chats) {
      try {
        await bot.api.sendMessage(chatId, message);
        sent++;
      } catch {
        log.debug(`Failed to send to chat ${chatId} (user may have blocked the bot).`);
        failed++;
      }
    }

    log.info(`Broadcast complete: ${sent} sent, ${failed} failed.`);
    this.emitter?.emit({
      type: "broadcast",
      chatCount: chats.length,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
