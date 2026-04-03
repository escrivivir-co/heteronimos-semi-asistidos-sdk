import { Bot, Context } from "grammy";
import { BotCommand, BotCommandScope, CommandDefinition, registerCommands, toBotCommands, toBotFatherFormat, syncCommandsWithTelegram, SyncOptions } from "./command-handler.js";
import { MenuDefinition, registerMenu } from "./menu-handler.js";
import { Logger } from "./logger.js";
import { ChatTracker } from "./chat-tracker.js";
import type { RuntimeEmitter } from "./runtime-emitter.js";
import { describeTelegramError } from "./telegram-error.js";

// Logger por defecto SIN emitter (usado por collectPluginFatherSettings, etc.).
// registerPlugins() crea un hijo con emitter si se le pasa.
const log = new Logger("bot-handler");

interface LiveGroupScopeSyncState {
  commands: BotCommand[];
  enabled: boolean;
  syncedChatIds: Set<string>;
}

const liveGroupScopeSyncByBot = new WeakMap<Bot, LiveGroupScopeSyncState>();

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

async function resolveTrackedGroupChatScopes(bot: Bot, tracker?: ChatTracker): Promise<BotCommandScope[]> {
  if (!tracker) return [];

  const scopes: BotCommandScope[] = [];
  for (const chatId of tracker.getAll()) {
    if (chatId >= 0) continue;

    try {
      const chat = await (bot.api as any).getChat(chatId);
      if (chat?.type === "group" || chat?.type === "supergroup") {
        scopes.push({ type: "chat", chat_id: chatId });
      }
    } catch {
      // Ignore stale or inaccessible chats.
    }
  }

  return scopes;
}

function dedupeScopes(scopes: BotCommandScope[]): BotCommandScope[] {
  const seen = new Set<string>();
  const deduped: BotCommandScope[] = [];

  for (const scope of scopes) {
    const key = scope.type === "chat"
      ? `${scope.type}:${scope.chat_id}`
      : scope.type;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(scope);
  }

  return deduped;
}

function seedLiveGroupScopeSync(state: LiveGroupScopeSyncState, scopes: BotCommandScope[]): void {
  for (const scope of scopes) {
    if (scope.type === "chat") {
      state.syncedChatIds.add(String(scope.chat_id));
    }
  }
}

function attachLiveGroupScopeSync(
  bot: Bot,
  commands: CommandDefinition[],
  scopes: BotCommandScope[],
  options?: SyncOptions,
): void {
  let state = liveGroupScopeSyncByBot.get(bot);

  if (!state) {
    state = {
      commands: toBotCommands(commands),
      enabled: !options?.scopes,
      syncedChatIds: new Set<string>(),
    };
    liveGroupScopeSyncByBot.set(bot, state);
    const liveState = state;

    const syncTrackedGroupScope = async (ctx: Context) => {
      if (!liveState.enabled || liveState.commands.length === 0) return;

      const chat = ctx.chat;
      if (!chat || (chat.type !== "group" && chat.type !== "supergroup")) return;

      const chatKey = String(chat.id);
      if (liveState.syncedChatIds.has(chatKey)) return;

      try {
        await (bot.api as any).setMyCommands(liveState.commands, {
          scope: { type: "chat", chat_id: chat.id },
        });
        liveState.syncedChatIds.add(chatKey);
        log.info(`Commands synced for tracked group chat: ${chat.id}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.warn(`Could not sync commands for tracked group chat ${chat.id}: ${message}`);
      }
    };

    bot.on("my_chat_member", syncTrackedGroupScope);
    bot.on("chat_member", syncTrackedGroupScope);
  }

  state.commands = toBotCommands(commands);
  state.enabled = !options?.scopes;
  seedLiveGroupScopeSync(state, scopes);
}

export function registerPlugins(bot: Bot, plugins: BotPlugin[], tracker?: ChatTracker, emitter?: RuntimeEmitter, options?: { quiet?: boolean }) {
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
      let reply: string;
      try {
        reply = await plugin.onMessage!(ctx);
      } catch (error) {
        plog.error(`[message] plugin ${plugin.name} failed to build reply in chat ${ctx.chat?.id ?? "?"}: ${describeTelegramError(error)}`);
        continue;
      }

      plog.debug(`[message] plugin replied: ${reply.slice(0, 80)}...`);

      try {
        await ctx.reply(reply);
      } catch (error) {
        plog.warn(`[message] failed to send plugin ${plugin.name} reply in chat ${ctx.chat?.id ?? "?"}: ${describeTelegramError(error)}`);
      }
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
  if (!options?.quiet) {
    plog.info("Registered commands:\n" + toBotFatherFormat(allCommands));
    plog.debug(`Handlers registered: message=true, channel_post=true, messagePlugins=${messagePlugins.length}`);
  }
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
  const trackedChatScopes = options?.scopes ? [] : await resolveTrackedGroupChatScopes(bot, tracker);
  const syncOptions: SyncOptions = {
    ...options,
    scopes: dedupeScopes(options?.scopes ?? [
      { type: "default" },
      { type: "all_group_chats" },
      ...trackedChatScopes,
    ]),
  };

  const updated = await syncCommandsWithTelegram(bot, commands, syncOptions);
  attachLiveGroupScopeSync(bot, commands, syncOptions.scopes ?? [], options);
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
