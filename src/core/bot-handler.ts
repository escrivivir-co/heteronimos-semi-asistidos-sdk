import { Bot, Context } from "grammy";
import { CommandDefinition, registerCommands, toBotFatherFormat, syncCommandsWithTelegram, SyncOptions } from "./command-handler";
import { MenuDefinition, registerMenu } from "./menu-handler";
import { Logger } from "./logger";
import { ChatTracker } from "./chat-tracker";

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

export function registerPlugins(bot: Bot, plugins: BotPlugin[], tracker?: ChatTracker) {
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

  // Handler genérico de mensajes: delega al primer plugin que tenga onMessage
  const messagePlugins = plugins.filter(p => p.onMessage);
  if (messagePlugins.length > 0) {
    bot.on("message", async (ctx) => {
      if (!ctx?.from) return;
      log.info(`${ctx.from.first_name} wrote ${"text" in ctx.message ? ctx.message.text : ""}`);
      for (const plugin of messagePlugins) {
        const text = await plugin.onMessage!(ctx);
        await ctx.reply(text, { entities: ctx.message?.entities });
      }
    });
  }

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
export async function syncCommands(bot: Bot, plugins: BotPlugin[], tracker?: ChatTracker, options?: SyncOptions) {
  const { commands } = collectPluginFatherSettings(plugins);
  const updated = await syncCommandsWithTelegram(bot, commands, options);
  if (updated && tracker) {
    await tracker.broadcast(
      bot,
      "⚠️ [ACTUALIZACIÓN DE COMANDOS] Los comandos del bot se han actualizado. Si ves este mensaje, sal de la conversación y vuelve a entrar para ver los nuevos comandos."
    );
  }
}
