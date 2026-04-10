import { Bot, Context } from "grammy";
import { Logger, confirm } from "./logger.js";
import { describeTelegramError } from "./telegram-error.js";

const log = new Logger("command-handler");

/** Entrada de comando para Telegram API */
export interface BotCommand {
  command: string;
  description: string;
}

/**
 * Definición de comando en formato BotFather.
 * Los devs definen sus comandos con esta interfaz.
 */
export interface CommandDefinition {
  /** Nombre del comando (sin /) */
  command: string;
  /** Descripción para BotFather */
  description: string;
  /** Función que construye el texto de respuesta a partir del contexto */
  buildText: (ctx: Context) => string | Promise<string>;
}

/**
 * Handler genérico que abstrae la secuencia:
 *   a) Check del context
 *   b) Log del context
 *   c) Elaboración del text (delegada a buildText)
 *   d) Envío del text
 */
export function handleCommand(buildText: (ctx: Context) => string | Promise<string>) {
  return async (ctx: Context) => {
    // a) Check del context
    if (!ctx?.from) return;

    // b) Log del context
    log.info(`Command from: ${ctx.from.first_name}`);

    // c) Elaboración del text
    let text: string;
    try {
      text = await buildText(ctx);
    } catch (error) {
      log.error(`Failed to build command reply in chat ${ctx.chat?.id ?? "?"}: ${describeTelegramError(error)}`);
      return;
    }

    // d) Envío del text
    try {
      await ctx.reply(text, {
        entities: ctx.message?.entities,
      });
    } catch (error) {
      log.warn(`Failed to send command reply in chat ${ctx.chat?.id ?? "?"}: ${describeTelegramError(error)}`);
    }
  };
}

/**
 * Registra un array de CommandDefinition en el bot.
 */
export function registerCommands(bot: Bot, commands: CommandDefinition[]) {
  for (const cmd of commands) {
    bot.command(cmd.command, handleCommand(cmd.buildText));
  }
}

/**
 * Genera el string en formato BotFather para pegar en @BotFather /setcommands.
 */
export function toBotFatherFormat(commands: CommandDefinition[]): string {
  return commands.map(c => `${c.command} - ${c.description}`).join("\n");
}

/** Convierte CommandDefinition[] a BotCommand[] (sin buildText) */
export function toBotCommands(commands: CommandDefinition[]): BotCommand[] {
  return commands.map(c => ({ command: c.command, description: c.description }));
}

/**
 * Compara comandos locales vs remotos. Devuelve true si son iguales.
 */
export function commandsMatch(local: BotCommand[], remote: BotCommand[]): boolean {
  const serialize = (cmds: BotCommand[]) =>
    JSON.stringify(cmds.slice().sort((a, b) => a.command.localeCompare(b.command)));
  return serialize(local) === serialize(remote);
}

/**
 * Muestra diff entre comandos locales y remotos.
 */
export function logCommandsDiff(local: BotCommand[], remote: BotCommand[]) {
  const remoteSet = new Map(remote.map(c => [c.command, c.description]));
  const localSet = new Map(local.map(c => [c.command, c.description]));

  for (const cmd of local) {
    if (!remoteSet.has(cmd.command)) {
      log.info(`  + /${cmd.command} - ${cmd.description}  (new)`);
    } else if (remoteSet.get(cmd.command) !== cmd.description) {
      log.info(`  ~ /${cmd.command} - ${cmd.description}  (changed)`);
    }
  }
  for (const cmd of remote) {
    if (!localSet.has(cmd.command)) {
      log.warn(`  - /${cmd.command} - ${cmd.description}  (removed)`);
    }
  }
}

/**
 * Scope de visibilidad de comandos del bot en Telegram.
 * Subconjunto de BotCommandScope de la API de Telegram.
 */
export type BotCommandScope =
  | { type: "default" }
  | { type: "all_private_chats" }
  | { type: "all_group_chats" }
  | { type: "all_chat_administrators" }
  | { type: "chat"; chat_id: number | string };

/**
 * Sincroniza comandos con Telegram via setMyCommands.
 * Solo actúa si hay diferencias. Muestra diff y pide confirmación.
 * Devuelve true si se actualizaron los comandos.
 */
export interface SyncOptions {
  /** Si true, aplica cambios sin pedir confirmación. Default: false. */
  autoConfirm?: boolean;
  /** Función custom para confirmar. Default: readline prompt. */
  confirmFn?: (question: string) => Promise<boolean>;
  /**
   * Scopes de Telegram para los que registrar los comandos.
   * Default: [{ type: "default" }, { type: "all_group_chats" }]
   * Pasar [{ type: "default" }] para el comportamiento anterior.
   */
  scopes?: BotCommandScope[];
}

function describeScope(scope: BotCommandScope): string {
  if (scope.type === "chat") {
    return `${scope.type}:${scope.chat_id}`;
  }

  return scope.type;
}

function formatTelegramStartupError(error: unknown, operation: string): Error {
  if (typeof error === "object" && error !== null) {
    const maybeApiError = error as { error_code?: number; description?: string };

    if (maybeApiError.error_code === 401 || maybeApiError.error_code === 404) {
      return new Error(
        [
          `Telegram rejected the bot token while trying to ${operation}.`,
          "Check BOT_TOKEN in .env and confirm it belongs to an existing bot in @BotFather.",
          `Telegram response: ${maybeApiError.error_code} ${maybeApiError.description ?? "Unknown error"}.`,
        ].join(" "),
      );
    }
  }

  if (error instanceof Error) {
    return new Error(
      `Could not ${operation} because Telegram API is unavailable: ${error.message}`,
    );
  }

  return new Error(`Could not ${operation} because Telegram API is unavailable.`);
}

export async function syncCommandsWithTelegram(
  bot: Bot,
  commands: CommandDefinition[],
  options?: SyncOptions,
): Promise<boolean> {
  const localCmds = toBotCommands(commands);
  const scopes: BotCommandScope[] = options?.scopes ?? [
    { type: "default" },
    { type: "all_group_chats" },
  ];

  const scopesToUpdate: BotCommandScope[] = [];

  for (const scope of scopes) {
    let remoteCmds: BotCommand[];
    try {
      remoteCmds = await (bot.api as any).getMyCommands({ scope });
    } catch (error) {
      throw formatTelegramStartupError(error, "sync commands with Telegram");
    }

    if (commandsMatch(localCmds, remoteCmds)) {
      continue;
    }

    log.info(`Commands out of sync for scope: ${describeScope(scope)}`);
    logCommandsDiff(localCmds, remoteCmds);
    scopesToUpdate.push(scope);
  }

  if (scopesToUpdate.length === 0) {
    log.info("Commands already in sync with Telegram. No update needed.");
    return false;
  }

  const doConfirm = options?.confirmFn ?? confirm;
  const ok = options?.autoConfirm || await doConfirm("Proceed to update BotFather commands?");
  if (!ok) {
    log.warn("Sync cancelled by user.");
    return false;
  }

  for (const scope of scopesToUpdate) {
    try {
      await (bot.api as any).setMyCommands(localCmds, { scope });
    } catch (error) {
      throw formatTelegramStartupError(error, "update BotFather commands");
    }
    log.info(`Commands synced for scope: ${describeScope(scope)}`);
  }

  for (const scope of scopesToUpdate) {
    try {
      const verified: BotCommand[] = await (bot.api as any).getMyCommands({ scope });
      log.debug(`Verify scope=${describeScope(scope)}: ${verified.length} cmd(s) → [${verified.map(c => c.command).join(", ")}]`);
    } catch {
      log.warn(`Could not verify commands for scope: ${describeScope(scope)}`);
    }
  }

  return true;
}
