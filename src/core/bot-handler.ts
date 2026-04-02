import { Bot, Context } from "grammy";
import { CommandDefinition, registerCommands, toBotFatherFormat, syncCommandsWithTelegram, SyncOptions } from "./command-handler.js";
import { MenuDefinition, registerMenu } from "./menu-handler.js";
import { Logger } from "./logger.js";
import { ChatTracker } from "./chat-tracker.js";
import type { RuntimeEmitter } from "./runtime-emitter.js";

const log = new Logger("bot-handler");

/**
 * Interfaz que todo sub-bot / plugin debe implementar.
 * Cada plugin aporta sus propios comandos y, opcionalmente, menús.
 */
export interface BotPlugin {
  /** Nombre identificativo del plugin */
  name: string;

  /** Código corto del plugin. Prefija comandos: pluginCode.command */
  pluginCode: string;

  /** Comandos que este plugin aporta (formato BotFather) */
  commands(): CommandDefinition[];

  /** Menús inline que este plugin aporta (opcional) */
  menus?(): MenuDefinition[];

  /** Handler para mensajes genéricos (opcional) */
  onMessage?(ctx: Context): string | Promise<string>;
}

/**
 * Prefijar comandos con pluginCode: "rb_aleph", "rb_join", etc.
 */
function prefixCommands(pluginCode: string, cmds: CommandDefinition[]): CommandDefinition[] {
  return cmds.map(c => ({ ...c, command: `${pluginCode}_${c.command}` }));
}

function prefixMenus(pluginCode: string, menus: MenuDefinition[]): MenuDefinition[] {
  return menus.map(m => ({ ...m, command: `${pluginCode}_${m.command}` }));
}

export function registerPlugins(bot: Bot, plugins: BotPlugin[], tracker?: ChatTracker, emitter?: RuntimeEmitter) {
  const allCommands: CommandDefinition[] = [];

  // Middleware de tracking antes de cualquier handler
  if (tracker) tracker.register(bot);

  for (const plugin of plugins) {
    // Comandos prefijados
    const cmds = prefixCommands(plugin.pluginCode, plugin.commands());
    allCommands.push(...cmds);
    registerCommands(bot, cmds);

    // Menús prefijados (registra handler + añade a lista de comandos BotFather)
    if (plugin.menus) {
      const menus = prefixMenus(plugin.pluginCode, plugin.menus());
      for (const menu of menus) {
        registerMenu(bot, menu);
        allCommands.push({ command: menu.command, description: menu.description, buildText: () => "" });
      }
    }
  }

  // Handler genérico de mensajes: delega al primer plugin que tenga onMessage.
  // Se ignoran mensajes de comando (entities bot_command) para evitar
  // doble respuesta cuando grammY ya disparó el handler específico del comando.
  const messagePlugins = plugins.filter(p => p.onMessage);
  if (messagePlugins.length > 0) {
    bot.on("message", async (ctx) => {
      if (!ctx?.from) return;
      const text = "text" in ctx.message ? (ctx.message.text ?? "") : "";
      const isCommand = ctx.message.entities?.some(e => e.type === "bot_command") ?? false;
      if (isCommand) return;
      log.info(`${ctx.from.first_name} wrote ${text}`);
      emitter?.emit({
        type: "message",
        chatId: ctx.chat!.id,
        userId: ctx.from.id,
        username: ctx.from.first_name,
        text,
        timestamp: new Date().toISOString(),
      });
      for (const plugin of messagePlugins) {
        const reply = await plugin.onMessage!(ctx);
        await ctx.reply(reply);
      }
    });
  }

  const pluginInfos = plugins.map(p => {
    const cmds = prefixCommands(p.pluginCode, p.commands());
    return {
      name: p.name,
      pluginCode: p.pluginCode,
      commandCount: p.commands().length,
      commands: cmds.map(c => ({ command: c.command, description: c.description })),
    };
  });
  emitter?.emit({
    type: "plugins-registered",
    plugins: pluginInfos,
    timestamp: new Date().toISOString(),
  });
  log.info("Registered commands:\n" + toBotFatherFormat(allCommands));
}

/**
 * Recopila toda la info de plugins para generación de docs (bot-father-settings.md).
 * No necesita instanciar el bot de Telegram.
 */
export function collectPluginFatherSettings(plugins: BotPlugin[]): { commands: CommandDefinition[]; menus: MenuDefinition[] } {
  const allCommands: CommandDefinition[] = [];
  const allMenus: MenuDefinition[] = [];
  for (const plugin of plugins) {
    allCommands.push(...prefixCommands(plugin.pluginCode, plugin.commands()));
    if (plugin.menus) {
      const menus = prefixMenus(plugin.pluginCode, plugin.menus());
      allMenus.push(...menus);
      for (const menu of menus) {
        allCommands.push({ command: menu.command, description: menu.description, buildText: () => "" });
      }
    }
  }
  return { commands: allCommands, menus: allMenus };
}

/**
 * Sincroniza los comandos de todos los plugins con Telegram.
 * Delega a command-handler la lógica de diff y sync.
 */
export async function syncCommands(bot: Bot, plugins: BotPlugin[], tracker?: ChatTracker, options?: SyncOptions, emitter?: RuntimeEmitter) {
  const { commands } = collectPluginFatherSettings(plugins);
  const updated = await syncCommandsWithTelegram(bot, commands, options);
  emitter?.emit({
    type: "commands-synced",
    commandCount: commands.length,
    timestamp: new Date().toISOString(),
  });
  if (updated && tracker) {
    await tracker.broadcast(
      bot,
      "⚠️ [ACTUALIZACIÓN DE COMANDOS] Los comandos del bot se han actualizado. Si ves este mensaje, sal de la conversación y vuelve a entrar para ver los nuevos comandos."
    );
  }
}
