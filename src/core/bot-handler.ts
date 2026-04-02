import { Bot, Context } from "grammy";
import { CommandDefinition, registerCommands, toBotFatherFormat, syncCommandsWithTelegram, SyncOptions } from "./command-handler.js";
import { MenuDefinition, registerMenu } from "./menu-handler.js";
import { Logger } from "./logger.js";
import { ChatTracker } from "./chat-tracker.js";
import type { RuntimeEmitter } from "./runtime-emitter.js";

// Logger por defecto SIN emitter (usado por collectPluginFatherSettings, etc.).
// registerPlugins() crea un hijo con emitter si se le pasa.
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
  // Crear logger con emitter para que los logs lleguen al dashboard
  const plog = emitter ? new Logger("bot-handler", { emitter }) : log;
  const allCommands: CommandDefinition[] = [];

  // --- Middleware 0: log global de CADA update (debug) ---
  // Se registra primero para que sea lo primero que ve el bot.
  bot.use(async (ctx, next) => {
    const chatId = ctx.chat?.id ?? "?";
    const from = ctx.from?.first_name ?? "?";
    const utype = ctx.message ? "message" : ctx.channelPost ? "channel_post" : ctx.callbackQuery ? "callback_query" : "other";
    plog.debug(`[update] type=${utype} chat=${chatId} from=${from} update_id=${(ctx as any).update?.update_id ?? "?"}`);
    return next();
  });

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

  // Handler de mensajes: emite siempre al dashboard; opcionalmente delega a plugins onMessage.
  // También cubre channel_post (canales de Telegram) que grammY NO enruta por "message".
  // Se ignoran mensajes de comando para evitar doble respuesta.
  const messagePlugins = plugins.filter(p => p.onMessage);

  // Mensajes en grupos / DMs (update type: message)
  bot.on("message", async (ctx) => {
    plog.debug(`[message] update received — chat.id=${ctx.chat?.id} from=${ctx.from?.id} (${ctx.from?.first_name})`);
    if (!ctx?.from) { plog.debug("[message] skipped: no ctx.from"); return; }
    const text = "text" in ctx.message ? (ctx.message.text ?? "") : "";
    const isCmd = ctx.message.entities?.some(e => e.type === "bot_command") ?? false;
    if (isCmd) { plog.debug(`[message] skipped: bot_command entity (text=${text})`); return; }
    plog.info(`${ctx.from.first_name} wrote: ${text || "(media)"}`);
    plog.debug(`[message] emitting to dashboard — chatId=${ctx.chat!.id} userId=${ctx.from.id}`);
    emitter?.emit({
      type: "message",
      chatId: ctx.chat!.id,
      userId: ctx.from.id,
      username: ctx.from.first_name,
      text,
      timestamp: new Date().toISOString(),
    });
    plog.debug(`[message] delegating to ${messagePlugins.length} onMessage plugin(s)`);
    for (const plugin of messagePlugins) {
      const reply = await plugin.onMessage!(ctx);
      plog.debug(`[message] plugin replied: ${reply.slice(0, 80)}...`);
      await ctx.reply(reply);
    }
  });

  // Mensajes en canales (update type: channel_post — distinto de message en grammY)
  bot.on("channel_post", async (ctx) => {
    const post = ctx.channelPost;
    const text = post.text ?? "";
    const isCmd = post.entities?.some(e => e.type === "bot_command") ?? false;
    const chatTitle = "title" in ctx.chat ? ctx.chat.title : undefined;
    plog.debug(`[channel_post] update received — chat.id=${ctx.chat?.id} title=${chatTitle} isCmd=${isCmd}`);
    if (isCmd) { plog.debug("[channel_post] skipped: bot_command entity"); return; }
    plog.info(`[channel] ${chatTitle ?? ctx.chat.id}: ${text || "(media)"}`);
    plog.debug(`[channel_post] emitting to dashboard`);
    emitter?.emit({
      type: "message",
      chatId: ctx.chat!.id,
      userId: undefined,
      username: chatTitle,
      text,
      timestamp: new Date().toISOString(),
    });
  });

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
  plog.info("Registered commands:\n" + toBotFatherFormat(allCommands));
  plog.debug(`Handlers registered: message=true, channel_post=true, messagePlugins=${messagePlugins.length}`);
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
