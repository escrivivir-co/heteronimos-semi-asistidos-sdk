import type { BaseRuntimeState, SentMessage, SimulateOpts } from "heteronimos-semi-asistidos-sdk";

// Re-export buffer types and constants from SDK so components can import from here
export type { LogEntry, MessageEntry, CommandResponseEntry } from "heteronimos-semi-asistidos-sdk";
export { LOG_BUFFER_SIZE, MSG_BUFFER_SIZE, CMD_BUFFER_SIZE } from "heteronimos-semi-asistidos-sdk";

/** Estado del dashboard = estado base del SDK + campos propios de la app */
export interface DashboardState extends BaseRuntimeState {
  /** true si el bot arrancó en mock mode */
  mockMode: boolean;
  /** true si BOT_TOKEN está configurado en el entorno */
  tokenConfigured: boolean;
  /** true si .env existe en appDir */
  envFileExists: boolean;
  /** true si .env.example existe en appDir */
  envExampleExists: boolean;
  /** Directorio de la app (para operaciones de archivo) */
  appDir: string;
  /**
   * Función para ejecutar un comando mock desde la UI.
   * null cuando el bot está en modo real (Telegram activo).
   */
  executeCommand: ((name: string, opts?: SimulateOpts) => Promise<SentMessage[]>) | null;
}

export function getDefaultDashboardState(): DashboardState {
  return {
    // Campos del SDK (BaseRuntimeState)
    botStatus: "starting",
    startedAt: null,
    plugins: [],
    commandCount: 0,
    chatIds: [],
    logs: [],
    messages: [],
    commandResponses: [],
    // Campos propios del dashboard
    mockMode: false,
    tokenConfigured: false,
    envFileExists: false,
    envExampleExists: false,
    appDir: "",
    executeCommand: null,
  };
}
