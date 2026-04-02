import * as fs from "fs";
import { Bot } from "grammy";
import { Logger } from "./logger";

const log = new Logger("chat-tracker");

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
  private store: ChatStore;

  constructor(store?: ChatStore) {
    this.store = store ?? new MemoryChatStore();
    const loaded = this.store.load();
    this.chatIds = new Set(Array.isArray(loaded) ? loaded : []);
  }

  private save() {
    this.store.save([...this.chatIds]);
  }

  track(chatId: number) {
    if (!this.chatIds.has(chatId)) {
      this.chatIds.add(chatId);
      this.save();
      log.debug(`Tracked new chat: ${chatId}`);
    }
  }

  getAll(): number[] {
    return [...this.chatIds];
  }

  /**
   * Registra middleware en el bot para trackear automáticamente todos los chats.
   */
  register(bot: Bot) {
    bot.use((ctx, next) => {
      if (ctx.chat) {
        this.track(ctx.chat.id);
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
  }
}
