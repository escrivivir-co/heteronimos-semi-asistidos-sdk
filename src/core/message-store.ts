import * as fs from "node:fs";
import { Logger } from "./logger.js";
import type { MessageEntry, CommandResponseEntry } from "./store.js";
import { MSG_BUFFER_SIZE, CMD_BUFFER_SIZE } from "./store.js";

const log = new Logger("message-store");

/** Datos persistidos por el MessageStore. */
export interface PersistedMessages {
  messages: MessageEntry[];
  commandResponses: CommandResponseEntry[];
  /** Chat IDs conocidos — complementa los de FileChatStore para cubrir reinicios. */
  chatIds?: number[];
  /** Nombres/títulos de cada chat — para mostrar en la UI sin perder el nombre al reiniciar. */
  chatNames?: Record<number, string>;
}

/** Contrato mínimo de almacenamiento de mensajes. */
export interface MessageStore {
  /** Carga los mensajes persistidos. Se llama una vez al arrancar. */
  load(): PersistedMessages | Promise<PersistedMessages>;
  /** Persiste el estado actual de mensajes. Se llama tras cada nuevo mensaje/respuesta. */
  save(data: PersistedMessages): void | Promise<void>;
}

const EMPTY: PersistedMessages = { messages: [], commandResponses: [], chatIds: [] };

/** Implementación en memoria — para tests y entornos headless. */
export class MemoryMessageStore implements MessageStore {
  private data: PersistedMessages = { messages: [], commandResponses: [] };
  load(): PersistedMessages { return { messages: [...this.data.messages], commandResponses: [...this.data.commandResponses], chatIds: [...(this.data.chatIds ?? [])] }; }
  save(data: PersistedMessages): void { this.data = data; }
}

/**
 * Implementación basada en fichero JSON.
 * Usa escritura atómica (tmp + rename) para evitar corrupción si el proceso muere.
 */
export class FileMessageStore implements MessageStore {
  constructor(
    private filePath: string,
    private maxMessages: number = MSG_BUFFER_SIZE,
    private maxResponses: number = CMD_BUFFER_SIZE,
  ) {}

  load(): PersistedMessages {
    try {
      if (!fs.existsSync(this.filePath)) return { ...EMPTY };
      const raw = fs.readFileSync(this.filePath, "utf-8");
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") return { ...EMPTY };
      const messages: MessageEntry[] = Array.isArray(data.messages) ? data.messages : [];
      const commandResponses: CommandResponseEntry[] = Array.isArray(data.commandResponses) ? data.commandResponses : [];
      const chatIds: number[] = Array.isArray(data.chatIds) ? data.chatIds : [];
      const chatNames: Record<number, string> = (data.chatNames && typeof data.chatNames === "object" && !Array.isArray(data.chatNames)) ? data.chatNames : {};
      return {
        messages: messages.slice(-this.maxMessages),
        commandResponses: commandResponses.slice(-this.maxResponses),
        chatIds,
        chatNames,
      };
    } catch {
      log.warn(`Could not load messages file at ${this.filePath}, starting fresh.`);
      return { ...EMPTY };
    }
  }

  save(data: PersistedMessages): void {
    try {
      const payload: PersistedMessages = {
        messages: data.messages.slice(-this.maxMessages),
        commandResponses: data.commandResponses.slice(-this.maxResponses),
        chatIds: data.chatIds,
        chatNames: data.chatNames,
      };
      const tmp = this.filePath + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(payload), "utf-8");
      fs.renameSync(tmp, this.filePath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn(`Could not save messages file: ${msg}`);
    }
  }
}
