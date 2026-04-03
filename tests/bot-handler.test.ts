import { describe, test, expect } from "bun:test";
import { ChatTracker, MemoryChatStore, collectPluginFatherSettings, registerPlugins, RuntimeEmitter, syncCommands, type BotPlugin, type CommandDefinition } from "../src/index";
import { MockTelegramBot } from "../src/core/mock-telegram";

function makePlugin(code: string, cmds: string[]): BotPlugin {
  return {
    name: `plugin-${code}`,
    pluginCode: code,
    commands: () => cmds.map(c => ({
      command: c,
      description: `${c} desc`,
      buildText: () => "",
    })),
  };
}

class MessageTestBot {
  private middlewares: Array<(ctx: object, next: () => Promise<void>) => Promise<void>> = [];
  private messageHandlers: Array<(ctx: object) => Promise<void>> = [];

  use(middleware: (ctx: object, next: () => Promise<void>) => Promise<void>): void {
    this.middlewares.push(middleware);
  }

  on(event: string, handler: (ctx: object) => Promise<void>): void {
    if (event === "message") {
      this.messageHandlers.push(handler);
    }
  }

  command(): void {}

  callbackQuery(): void {}

  async simulateMessage(ctx: object): Promise<void> {
    for (const middleware of this.middlewares) {
      await middleware(ctx, async () => {});
    }

    for (const handler of this.messageHandlers) {
      await handler(ctx);
    }
  }
}

describe("collectPluginFatherSettings", () => {
  test("prefixes commands with pluginCode", () => {
    const plugins = [makePlugin("ab", ["foo", "bar"])];
    const { commands } = collectPluginFatherSettings(plugins);
    expect(commands.map(c => c.command)).toEqual(["ab_foo", "ab_bar"]);
  });

  test("collects from multiple plugins", () => {
    const plugins = [
      makePlugin("a", ["x"]),
      makePlugin("b", ["y"]),
    ];
    const { commands } = collectPluginFatherSettings(plugins);
    expect(commands.map(c => c.command)).toEqual(["a_x", "b_y"]);
  });

  test("includes menu commands in command list", () => {
    const plugin: BotPlugin = {
      name: "with-menu",
      pluginCode: "wm",
      commands: () => [{ command: "hello", description: "hi", buildText: () => "" }],
      menus: () => [{ command: "menu", description: "Open menu", entryPage: "start", pages: [{ id: "start", text: "Start", buttons: [] }] }],
    };
    const { commands, menus } = collectPluginFatherSettings([plugin]);
    const names = commands.map(c => c.command);
    expect(names).toContain("wm_hello");
    expect(names).toContain("wm_menu");
    expect(menus.length).toBe(1);
  });

  test("returns empty arrays for no plugins", () => {
    const { commands, menus } = collectPluginFatherSettings([]);
    expect(commands).toEqual([]);
    expect(menus).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// registerPlugins con MockTelegramBot
// ---------------------------------------------------------------------------

describe("registerPlugins — mock bot", () => {
  test("prefixed commands are registered on the bot", () => {
    const bot = new MockTelegramBot();
    const plugin = makePlugin("xx", ["cmd1", "cmd2"]);
    registerPlugins(bot as any, [plugin]);
    expect(bot.getRegisteredCommands()).toContain("xx_cmd1");
    expect(bot.getRegisteredCommands()).toContain("xx_cmd2");
  });

  test("multiple plugins each register their commands", () => {
    const bot = new MockTelegramBot();
    registerPlugins(bot as any, [
      makePlugin("a", ["go"]),
      makePlugin("b", ["run"]),
    ]);
    expect(bot.getRegisteredCommands()).toContain("a_go");
    expect(bot.getRegisteredCommands()).toContain("b_run");
  });

  test("dispatches reply from buildText when command is simulated", async () => {
    const bot = new MockTelegramBot();
    const plugin: BotPlugin = {
      name: "echo-bot",
      pluginCode: "ec",
      commands: (): CommandDefinition[] => [
        { command: "hello", description: "Say hi", buildText: () => "Hi!" },
      ],
    };
    registerPlugins(bot as any, [plugin]);
    await bot.simulateCommand("ec_hello");
    expect(bot.getSentMessages()[0]?.text).toBe("Hi!");
  });

  test("plain messages emit runtime event without auto reply", async () => {
    const bot = new MessageTestBot();
    const emitter = new RuntimeEmitter();
    const events: Array<{ type: string; chatId: number; text: string; userId?: number; username?: string }> = [];
    emitter.events$.subscribe((event) => {
      if (event.type === "message") events.push(event);
    });

    const plugin: BotPlugin = {
      name: "echo-bot",
      pluginCode: "ec",
      commands: () => [],
      onMessage: async () => "Hi!",
    };

    registerPlugins(bot as any, [plugin], undefined, emitter);

    await expect(bot.simulateMessage({
      from: { id: 42, first_name: "Aleph" },
      chat: { id: -12345, type: "group", title: "Tracked Group" },
      message: { text: "hello", entities: undefined },
      reply: async () => undefined,
    })).resolves.toBeUndefined();

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "message",
      chatId: -12345,
      userId: 42,
      username: "Aleph",
      text: "hello",
    });
  });
});

// ---------------------------------------------------------------------------
// registerPlugins — PluginInfo.commands has single prefix
// ---------------------------------------------------------------------------

describe("registerPlugins — PluginInfo.commands prefix", () => {
  test("emitted PluginInfo.commands[].command has exactly one prefix", () => {
    const emitter = new RuntimeEmitter();
    const bot = new MockTelegramBot();
    const captured: any[] = [];
    emitter.events$.subscribe(e => { if (e.type === "plugins-registered") captured.push(e); });

    const plugin = makePlugin("rb", ["aleph", "join"]);
    registerPlugins(bot as any, [plugin], undefined, emitter);

    expect(captured).toHaveLength(1);
    const cmds = captured[0].plugins[0].commands;
    expect(cmds.map((c: any) => c.command)).toEqual(["rb_aleph", "rb_join"]);
    // Regression guard: must NOT be "rb_rb_aleph"
    expect(cmds[0].command).not.toContain("rb_rb_");
  });
});

describe("syncCommands — tracked group chats", () => {
  test("syncs chat-specific scopes for tracked group chats by default", async () => {
    const bot = new MockTelegramBot();
    (bot.api as any).getChat = async (chatId: number) => ({
      id: chatId,
      type: chatId < 0 ? "group" : "private",
      title: chatId < 0 ? "Tracked Group" : undefined,
    });

    const tracker = new ChatTracker(new MemoryChatStore());
    tracker.track(-12345, "Tracked Group", "group");
    tracker.track(42, "Alice", "private");

    await syncCommands(bot as any, [makePlugin("rb", ["aleph"])], tracker, { autoConfirm: true });

    expect(await bot.api.getMyCommands({ scope: { type: "default" } })).toEqual([
      { command: "rb_aleph", description: "aleph desc" },
    ]);
    expect(await bot.api.getMyCommands({ scope: { type: "all_group_chats" } })).toEqual([
      { command: "rb_aleph", description: "aleph desc" },
    ]);
    expect(await bot.api.getMyCommands({ scope: { type: "chat", chat_id: -12345 } })).toEqual([
      { command: "rb_aleph", description: "aleph desc" },
    ]);
    expect(await bot.api.getMyCommands({ scope: { type: "chat", chat_id: 42 } })).toEqual([]);
  });

  test("does not broadcast when tracked scopes are already in sync", async () => {
    const bot = new MockTelegramBot();
    (bot.api as any).getChat = async (chatId: number) => ({
      id: chatId,
      type: chatId < 0 ? "group" : "private",
      title: chatId < 0 ? "Tracked Group" : undefined,
    });

    const synced = [{ command: "rb_aleph", description: "aleph desc" }];
    await bot.api.setMyCommands(synced, { scope: { type: "default" } });
    await bot.api.setMyCommands(synced, { scope: { type: "all_group_chats" } });
    await bot.api.setMyCommands(synced, { scope: { type: "chat", chat_id: -12345 } });

    const tracker = new ChatTracker(new MemoryChatStore());
    tracker.track(-12345, "Tracked Group", "group");

    await syncCommands(bot as any, [makePlugin("rb", ["aleph"])], tracker, { autoConfirm: true });

    expect(bot.getSentMessages()).toEqual([]);
  });

  test("syncs chat-specific scope when the bot joins a new group after startup", async () => {
    const bot = new MockTelegramBot();

    await syncCommands(bot as any, [makePlugin("rb", ["aleph"])], undefined, { autoConfirm: true });

    expect(await bot.api.getMyCommands({ scope: { type: "chat", chat_id: -999 } })).toEqual([]);

    await bot.simulateMyChatMember({
      chatId: -999,
      chatType: "supergroup",
      chatTitle: "Live Group",
    });

    expect(await bot.api.getMyCommands({ scope: { type: "chat", chat_id: -999 } })).toEqual([
      { command: "rb_aleph", description: "aleph desc" },
    ]);
  });

  test("respects explicit custom scopes and does not append tracked chat scopes", async () => {
    const bot = new MockTelegramBot();
    (bot.api as any).getChat = async (chatId: number) => ({
      id: chatId,
      type: "group",
      title: "Tracked Group",
    });

    const tracker = new ChatTracker(new MemoryChatStore());
    tracker.track(-12345, "Tracked Group", "group");

    await syncCommands(bot as any, [makePlugin("rb", ["aleph"])], tracker, {
      autoConfirm: true,
      scopes: [{ type: "default" }],
    });

    expect(await bot.api.getMyCommands({ scope: { type: "default" } })).toEqual([
      { command: "rb_aleph", description: "aleph desc" },
    ]);
    expect(await bot.api.getMyCommands({ scope: { type: "chat", chat_id: -12345 } })).toEqual([]);
  });

  test("does not live-sync chat-specific scopes when custom scopes are explicit", async () => {
    const bot = new MockTelegramBot();

    await syncCommands(bot as any, [makePlugin("rb", ["aleph"])], undefined, {
      autoConfirm: true,
      scopes: [{ type: "default" }],
    });

    await bot.simulateMyChatMember({
      chatId: -999,
      chatType: "group",
      chatTitle: "Explicit Scope Group",
    });

    expect(await bot.api.getMyCommands({ scope: { type: "chat", chat_id: -999 } })).toEqual([]);
  });
});
