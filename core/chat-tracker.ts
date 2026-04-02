import * as fs from "fs";
import * as path from "path";
import { Bot } from "grammy";
import { Logger } from "./logger";

const log = new Logger("chat-tracker");
const CHATS_FILE = path.join(__dirname, "..", ".chats.json");

/**
 * Persiste los chat IDs de usuarios que han interactuado con el bot.
 * Se usa para poder enviar broadcasts (Telegram no tiene broadcast nativo).
 */
export class ChatTracker {
  private chatIds: Set<number>;

  constructor() {
    this.chatIds = this.load();
  }

  private load(): Set<number> {
    try {
      if (fs.existsSync(CHATS_FILE)) {
        const data = JSON.parse(fs.readFileSync(CHATS_FILE, "utf-8"));
        if (Array.isArray(data)) return new Set(data);
      }
    } catch {
      log.warn("Could not load chats file, starting fresh.");
    }
    return new Set();
  }

  private save() {
    fs.writeFileSync(CHATS_FILE, JSON.stringify([...this.chatIds]), "utf-8");
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
