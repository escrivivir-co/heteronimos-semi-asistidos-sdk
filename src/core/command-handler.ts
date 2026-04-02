import { Bot, Context } from "grammy";
import { Logger, confirm } from "./logger.js";

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
    const text = await buildText(ctx);

    // d) Envío del text
    await ctx.reply(text, {
      entities: ctx.message?.entities,
    });
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
 * Sincroniza comandos con Telegram via setMyCommands.
 * Solo actúa si hay diferencias. Muestra diff y pide confirmación.
 * Devuelve true si se actualizaron los comandos.
 */
export interface SyncOptions {
  /** Si true, aplica cambios sin pedir confirmación. Default: false. */
  autoConfirm?: boolean;
  /** Función custom para confirmar. Default: readline prompt. */
  confirmFn?: (question: string) => Promise<boolean>;
}

export async function syncCommandsWithTelegram(
  bot: Bot,
  commands: CommandDefinition[],
  options?: SyncOptions,
): Promise<boolean> {
  const localCmds = toBotCommands(commands);
  const remoteCmds = await bot.api.getMyCommands();

  if (commandsMatch(localCmds, remoteCmds)) {
    log.info("Commands already in sync with Telegram. No update needed.");
    return false;
  }

  logCommandsDiff(localCmds, remoteCmds);

  const doConfirm = options?.confirmFn ?? confirm;
  const ok = options?.autoConfirm || await doConfirm("Proceed to update BotFather commands?");
  if (!ok) {
    log.warn("Sync cancelled by user.");
    return false;
  }

  await bot.api.setMyCommands(localCmds);
  log.info("Commands synced with Telegram successfully.");
  return true;
}
