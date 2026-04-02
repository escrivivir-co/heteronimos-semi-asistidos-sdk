import type { PluginInfo } from "heteronimos-semi-asistidos-sdk";

/** Entrada de log en el buffer de la dashboard */
export interface LogEntry {
  level: "debug" | "info" | "warn" | "error";
  scope: string;
  message: string;
  timestamp: string;
}

/** Mensaje entrante de Telegram capturado por el emitter */
export interface MessageEntry {
  chatId: number;
  username?: string;
  text: string;
  timestamp: string;
}

/** Estado completo de la dashboard */
export interface DashboardState {
  /** Estado del bot */
  botStatus: "starting" | "running" | "stopped" | "error";
  startedAt: Date | null;
  /** Plugins cargados (recibido en plugins-registered) */
  plugins: PluginInfo[];
  /** Número de comandos sincronizados con Telegram */
  commandCount: number;
  /** IDs de chats conocidos */
  chatIds: number[];
  /** Buffer circular de logs (max LOG_BUFFER_SIZE) */
  logs: LogEntry[];
  /** Buffer de mensajes entrantes (max MSG_BUFFER_SIZE) */
  messages: MessageEntry[];
}

export const LOG_BUFFER_SIZE = 200;
export const MSG_BUFFER_SIZE = 100;

export function getDefaultDashboardState(): DashboardState {
  return {
    botStatus: "starting",
    startedAt: null,
    plugins: [],
    commandCount: 0,
    chatIds: [],
    logs: [],
    messages: [],
  };
}
