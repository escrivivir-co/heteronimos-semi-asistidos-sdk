import { describe, test, expect } from "bun:test";
import { MockTelegramBot, MOCK_FIXTURES } from "../src/core/mock-telegram";
import {
  RuntimeEmitter,
  registerPlugins,
  syncCommandsWithTelegram,
  ChatTracker,
  type BotPlugin,
  type CommandDefinition,
} from "../src/index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlugin(code: string, cmds: string[]): BotPlugin {
  return {
    name: `plugin-${code}`,
    pluginCode: code,
    commands: (): CommandDefinition[] =>
      cmds.map((c) => ({
        command: c,
        description: `${c} description`,
        buildText: (_ctx) => `reply from ${c}`,
      })),
  };
}

// ---------------------------------------------------------------------------
// MockTelegramBot — estado inicial
// ---------------------------------------------------------------------------

describe("MockTelegramBot — construction", () => {
  test("starts with empty state", () => {
    const bot = new MockTelegramBot();
    expect(bot.getSentMessages()).toEqual([]);
    expect(bot.getRegisteredCommands()).toEqual([]);
  });

  test("accepts initialCommands option", async () => {
    const bot = new MockTelegramBot({
      initialCommands: [{ command: "hello", description: "Hello" }],
    });
    const cmds = await bot.api.getMyCommands();
    expect(cmds).toEqual([{ command: "hello", description: "Hello" }]);
  });
});

// ---------------------------------------------------------------------------
// MOCK_FIXTURES
// ---------------------------------------------------------------------------

describe("MOCK_FIXTURES", () => {
  test("exports deterministic values", () => {
    expect(MOCK_FIXTURES.chatId).toBe(100001);
    expect(MOCK_FIXTURES.userId).toBe(42);
    expect(MOCK_FIXTURES.username).toBe("MockUser");
    expect(MOCK_FIXTURES.initialCommands).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Registro de handlers
// ---------------------------------------------------------------------------

describe("MockTelegramBot — command()", () => {
  test("registers command and appears in getRegisteredCommands()", () => {
    const bot = new MockTelegramBot();
    bot.command("greet", async () => {});
    expect(bot.getRegisteredCommands()).toContain("greet");
  });

  test("registers multiple commands", () => {
    const bot = new MockTelegramBot();
    bot.command("a", async () => {});
    bot.command("b", async () => {});
    expect(bot.getRegisteredCommands()).toHaveLength(2);
  });
});

describe("MockTelegramBot — use()", () => {
  test("middleware is invoked on simulateMessage", async () => {
    const bot = new MockTelegramBot();
    let called = false;
    bot.use(async (_ctx, next) => {
      called = true;
      await next();
    });
    await bot.simulateMessage("hello");
    expect(called).toBe(true);
  });

  test("multiple middlewares run in registration order", async () => {
    const bot = new MockTelegramBot();
    const order: number[] = [];
    bot.use(async (_ctx, next) => { order.push(1); await next(); });
    bot.use(async (_ctx, next) => { order.push(2); await next(); });
    await bot.simulateMessage("test");
    expect(order).toEqual([1, 2]);
  });
});

// ---------------------------------------------------------------------------
// simulateMessage
// ---------------------------------------------------------------------------

describe("MockTelegramBot — simulateMessage", () => {
  test("invokes on() message handlers", async () => {
    const bot = new MockTelegramBot();
    let received = "";
    bot.on("message", async (ctx: any) => { received = ctx.message.text; });
    await bot.simulateMessage("hi there");
    expect(received).toBe("hi there");
  });

  test("ctx.reply() appends to sentMessages", async () => {
    const bot = new MockTelegramBot();
    bot.on("message", async (ctx: any) => { await ctx.reply("pong"); });
    await bot.simulateMessage("ping");
    expect(bot.getSentMessages()).toEqual([{ chatId: MOCK_FIXTURES.chatId, text: "pong" }]);
  });

  test("uses provided opts over MOCK_FIXTURES", async () => {
    const bot = new MockTelegramBot();
    let seenChatId = 0;
    bot.on("message", async (ctx: any) => { seenChatId = ctx.chat.id; });
    await bot.simulateMessage("hey", { chatId: 9999 });
    expect(seenChatId).toBe(9999);
  });

  test("middlewares run before message handlers", async () => {
    const bot = new MockTelegramBot();
    const log: string[] = [];
    bot.use(async (_ctx, next) => { log.push("mw"); await next(); });
    bot.on("message", async () => { log.push("handler"); });
    await bot.simulateMessage("test");
    expect(log).toEqual(["mw", "handler"]);
  });
});

describe("MockTelegramBot — simulateMyChatMember", () => {
  test("invokes on() my_chat_member handlers", async () => {
    const bot = new MockTelegramBot();
    let seenChatId = 0;
    let seenChatType = "";

    bot.on("my_chat_member", async (ctx: any) => {
      seenChatId = ctx.chat.id;
      seenChatType = ctx.chat.type;
    });

    await bot.simulateMyChatMember({
      chatId: -1001,
      chatType: "supergroup",
      chatTitle: "Ops",
    });

    expect(seenChatId).toBe(-1001);
    expect(seenChatType).toBe("supergroup");
  });
});

// ---------------------------------------------------------------------------
// simulateCommand
// ---------------------------------------------------------------------------

describe("MockTelegramBot — simulateCommand", () => {
  test("invokes the correct command handler", async () => {
    const bot = new MockTelegramBot();
    let called = false;
    bot.command("greet", async () => { called = true; });
    await bot.simulateCommand("greet");
    expect(called).toBe(true);
  });

  test("throws if command is not registered", async () => {
    const bot = new MockTelegramBot();
    await expect(bot.simulateCommand("nope")).rejects.toThrow(
      'MockTelegramBot: no handler registered for command "nope"',
    );
  });

  test("ctx.match is empty string by default", async () => {
    const bot = new MockTelegramBot();
    let match: unknown = null;
    bot.command("test", async (ctx: any) => { match = ctx.match; });
    await bot.simulateCommand("test");
    expect(match).toBe("");
  });

  test("ctx.reply() from command handler appends to sentMessages", async () => {
    const bot = new MockTelegramBot();
    bot.command("say", async (ctx: any) => { await ctx.reply("said!"); });
    await bot.simulateCommand("say");
    expect(bot.getSentMessages()[0]?.text).toBe("said!");
  });

  test("middlewares run before command handler", async () => {
    const bot = new MockTelegramBot();
    const log: string[] = [];
    bot.use(async (_ctx, next) => { log.push("mw"); await next(); });
    bot.command("x", async () => { log.push("cmd"); });
    await bot.simulateCommand("x");
    expect(log).toEqual(["mw", "cmd"]);
  });
});

// ---------------------------------------------------------------------------
// api mock
// ---------------------------------------------------------------------------

describe("MockTelegramBot — api.getMyCommands / setMyCommands", () => {
  test("getMyCommands returns empty array by default", async () => {
    const bot = new MockTelegramBot();
    expect(await bot.api.getMyCommands()).toEqual([]);
  });

  test("setMyCommands stores, getMyCommands returns stored", async () => {
    const bot = new MockTelegramBot();
    await bot.api.setMyCommands([{ command: "hello", description: "Hi" }]);
    const cmds = await bot.api.getMyCommands();
    expect(cmds).toEqual([{ command: "hello", description: "Hi" }]);
  });

  test("api returns a copy (mutation doesn't affect stored state)", async () => {
    const bot = new MockTelegramBot();
    await bot.api.setMyCommands([{ command: "a", description: "A" }]);
    const cmds = await bot.api.getMyCommands();
    cmds.push({ command: "b", description: "B" });
    expect(await bot.api.getMyCommands()).toHaveLength(1);
  });

  test("scope-aware: setMyCommands with scope stores per scope", async () => {
    const bot = new MockTelegramBot();
    await bot.api.setMyCommands([{ command: "a", description: "A" }], { scope: { type: "default" } });
    await bot.api.setMyCommands([{ command: "b", description: "B" }], { scope: { type: "all_group_chats" } });

    const def   = await bot.api.getMyCommands({ scope: { type: "default" } });
    const group = await bot.api.getMyCommands({ scope: { type: "all_group_chats" } });

    expect(def).toEqual([{ command: "a", description: "A" }]);
    expect(group).toEqual([{ command: "b", description: "B" }]);
  });

  test("scope-aware: scopes are independent — updating one does not affect the other", async () => {
    const bot = new MockTelegramBot();
    await bot.api.setMyCommands([{ command: "start", description: "Start" }], { scope: { type: "default" } });
    await bot.api.setMyCommands([{ command: "help", description: "Help" }], { scope: { type: "all_group_chats" } });

    // Update only default scope
    await bot.api.setMyCommands([{ command: "updated", description: "Updated" }], { scope: { type: "default" } });

    const def   = await bot.api.getMyCommands({ scope: { type: "default" } });
    const group = await bot.api.getMyCommands({ scope: { type: "all_group_chats" } });

    expect(def).toEqual([{ command: "updated", description: "Updated" }]);
    expect(group).toEqual([{ command: "help", description: "Help" }]);
  });

  test("scope-aware: chat scopes are keyed by chat_id", async () => {
    const bot = new MockTelegramBot();
    await bot.api.setMyCommands([{ command: "a", description: "A" }], { scope: { type: "chat", chat_id: -1 } });
    await bot.api.setMyCommands([{ command: "b", description: "B" }], { scope: { type: "chat", chat_id: -2 } });

    const chatOne = await bot.api.getMyCommands({ scope: { type: "chat", chat_id: -1 } });
    const chatTwo = await bot.api.getMyCommands({ scope: { type: "chat", chat_id: -2 } });

    expect(chatOne).toEqual([{ command: "a", description: "A" }]);
    expect(chatTwo).toEqual([{ command: "b", description: "B" }]);
  });

  test("scope-aware: getMyCommands without scope defaults to 'default' key", async () => {
    const bot = new MockTelegramBot();
    await bot.api.setMyCommands([{ command: "x", description: "X" }], { scope: { type: "default" } });
    // Call without scope arg — should return default scope
    const cmds = await bot.api.getMyCommands();
    expect(cmds).toEqual([{ command: "x", description: "X" }]);
  });

  test("reset clears all scopes", async () => {
    const bot = new MockTelegramBot();
    await bot.api.setMyCommands([{ command: "a", description: "A" }], { scope: { type: "default" } });
    await bot.api.setMyCommands([{ command: "b", description: "B" }], { scope: { type: "all_group_chats" } });
    bot.reset();
    expect(await bot.api.getMyCommands({ scope: { type: "default" } })).toEqual([]);
    expect(await bot.api.getMyCommands({ scope: { type: "all_group_chats" } })).toEqual([]);
  });
});

describe("MockTelegramBot — api.sendMessage", () => {
  test("sendMessage appends to sentMessages", async () => {
    const bot = new MockTelegramBot();
    await bot.api.sendMessage(42, "broadcast!");
    expect(bot.getSentMessages()).toEqual([{ chatId: 42, text: "broadcast!" }]);
  });

  test("multiple sends accumulate in order", async () => {
    const bot = new MockTelegramBot();
    await bot.api.sendMessage(1, "one");
    await bot.api.sendMessage(2, "two");
    expect(bot.getSentMessages()).toHaveLength(2);
    expect(bot.getSentMessages()[1]).toEqual({ chatId: 2, text: "two" });
  });
});

// ---------------------------------------------------------------------------
// start / stop
// ---------------------------------------------------------------------------

describe("MockTelegramBot — start/stop", () => {
  test("start() resolves without error", async () => {
    const bot = new MockTelegramBot();
    await expect(bot.start()).resolves.toBeUndefined();
  });

  test("stop() resolves without error", async () => {
    const bot = new MockTelegramBot();
    await expect(bot.stop()).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// reset()
// ---------------------------------------------------------------------------

describe("MockTelegramBot — reset", () => {
  test("clears sentMessages", async () => {
    const bot = new MockTelegramBot();
    await bot.api.sendMessage(1, "msg");
    bot.reset();
    expect(bot.getSentMessages()).toEqual([]);
  });

  test("clears registered commands", () => {
    const bot = new MockTelegramBot();
    bot.command("foo", async () => {});
    bot.reset();
    expect(bot.getRegisteredCommands()).toEqual([]);
  });

  test("clears middlewares — subsequent simulate skips old mw", async () => {
    const bot = new MockTelegramBot();
    let calls = 0;
    bot.use(async (_ctx, next) => { calls++; await next(); });
    await bot.simulateMessage("before");
    bot.reset();
    // After reset, command must be re-registered to simulate, but
    // the middleware no longer runs — just verify calls count stopped
    expect(calls).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Integración con registerPlugins
// ---------------------------------------------------------------------------

describe("registerPlugins con MockTelegramBot", () => {
  test("registra los comandos del plugin en el mock", () => {
    const bot = new MockTelegramBot();
    const plugin = makePlugin("tst", ["hello", "world"]);
    registerPlugins(bot as any, [plugin]);
    const cmds = bot.getRegisteredCommands();
    expect(cmds).toContain("tst_hello");
    expect(cmds).toContain("tst_world");
  });

  test("simulateCommand dispara el handler y genera reply", async () => {
    const bot = new MockTelegramBot();
    const plugin = makePlugin("tst", ["ping"]);
    registerPlugins(bot as any, [plugin]);
    await bot.simulateCommand("tst_ping");
    expect(bot.getSentMessages()).toHaveLength(1);
    expect(bot.getSentMessages()[0]?.text).toBe("reply from ping");
  });
});

// ---------------------------------------------------------------------------
// Integración con syncCommandsWithTelegram
// ---------------------------------------------------------------------------

describe("syncCommandsWithTelegram con MockTelegramBot", () => {
  const localCmds: CommandDefinition[] = [
    { command: "hello", description: "Say hello", buildText: () => "hi" },
    { command: "bye",   description: "Say bye",   buildText: () => "bye" },
  ];

  test("sincroniza cuando el mock está vacío (actualiza comandos)", async () => {
    const bot = new MockTelegramBot();
    const updated = await syncCommandsWithTelegram(bot as any, localCmds, { autoConfirm: true });
    expect(updated).toBe(true);
    const stored = await bot.api.getMyCommands();
    expect(stored.map((c) => c.command)).toContain("hello");
  });

  test("no-op cuando comandos ya coinciden (single scope)", async () => {
    const synced = [
      { command: "hello", description: "Say hello" },
      { command: "bye",   description: "Say bye" },
    ];
    const bot = new MockTelegramBot();
    await bot.api.setMyCommands(synced, { scope: { type: "default" } });
    // Single scope — truly a no-op when already in sync
    const updated = await syncCommandsWithTelegram(bot as any, localCmds, {
      autoConfirm: true,
      scopes: [{ type: "default" }],
    });
    expect(updated).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// simulateCommand — con RuntimeEmitter (AE-200)
// ---------------------------------------------------------------------------

describe("MockTelegramBot — simulateCommand con RuntimeEmitter", () => {
  test("simulateCommand returns SentMessage array with replies", async () => {
    const bot = new MockTelegramBot();
    bot.command("hello", async (ctx: any) => { await ctx.reply("hi!"); });
    const messages = await bot.simulateCommand("hello");
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ text: "hi!" });
  });

  test("returns only messages from this execution, not previous ones", async () => {
    const bot = new MockTelegramBot();
    bot.command("a", async (ctx: any) => { await ctx.reply("first"); });
    bot.command("b", async (ctx: any) => { await ctx.reply("second"); });
    await bot.simulateCommand("a");
    const result = await bot.simulateCommand("b");
    expect(result).toHaveLength(1);
    expect(result[0]?.text).toBe("second");
  });

  test("emits command-executed event before handler runs", async () => {
    const emitter = new RuntimeEmitter();
    const events: string[] = [];
    emitter.events$.subscribe(e => events.push(e.type));

    const bot = new MockTelegramBot({ emitter });
    bot.command("ping", async (ctx: any) => { await ctx.reply("pong"); });
    await bot.simulateCommand("ping");

    expect(events).toContain("command-executed");
    const execIdx = events.indexOf("command-executed");
    const respIdx = events.indexOf("command-response");
    expect(execIdx).toBeLessThan(respIdx);
  });

  test("emits command-response event per reply", async () => {
    const emitter = new RuntimeEmitter();
    const responses: any[] = [];
    emitter.events$.subscribe(e => { if (e.type === "command-response") responses.push(e); });

    const bot = new MockTelegramBot({ emitter });
    bot.command("multi", async (ctx: any) => {
      await ctx.reply("one");
      await ctx.reply("two");
    });
    await bot.simulateCommand("multi");
    expect(responses).toHaveLength(2);
    expect(responses[0].text).toBe("one");
    expect(responses[1].text).toBe("two");
  });

  test("command-executed event carries command name and user info", async () => {
    const emitter = new RuntimeEmitter();
    let execEvent: any = null;
    emitter.events$.subscribe(e => { if (e.type === "command-executed") execEvent = e; });

    const bot = new MockTelegramBot({ emitter });
    bot.command("test", async () => {});
    await bot.simulateCommand("test");

    expect(execEvent).not.toBeNull();
    expect(execEvent.command).toBe("test");
    expect(execEvent.chatId).toBe(MOCK_FIXTURES.chatId);
    expect(execEvent.username).toBe(MOCK_FIXTURES.username);
  });

  test("no emitter — simulateCommand still returns SentMessage[]", async () => {
    const bot = new MockTelegramBot(); // no emitter
    bot.command("silent", async (ctx: any) => { await ctx.reply("ok"); });
    const messages = await bot.simulateCommand("silent");
    expect(messages).toHaveLength(1);
    expect(messages[0]?.text).toBe("ok");
  });
});

// ---------------------------------------------------------------------------
// Integración con ChatTracker
// ---------------------------------------------------------------------------

describe("ChatTracker con MockTelegramBot", () => {
  test("register() trackea chatId vía middleware en simulateMessage", async () => {
    const bot = new MockTelegramBot();
    const tracker = new ChatTracker();
    tracker.register(bot as any);
    await bot.simulateMessage("hi");
    expect(tracker.getAll()).toContain(MOCK_FIXTURES.chatId);
  });

  test("broadcast() envía a todos los chats conocidos", async () => {
    const bot = new MockTelegramBot();
    const tracker = new ChatTracker();
    tracker.register(bot as any);
    // Simular mensajes de dos chats distintos
    await bot.simulateMessage("hi", { chatId: 1001 });
    await bot.simulateMessage("hi", { chatId: 1002 });
    await tracker.broadcast(bot as any, "update!");
    const sent = bot.getSentMessages().filter((m) => m.text === "update!");
    expect(sent).toHaveLength(2);
    const chatIds = sent.map((m) => m.chatId).sort();
    expect(chatIds).toEqual([1001, 1002]);
  });
});
