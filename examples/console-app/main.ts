import { Bot } from "grammy";
import { RabbitBot } from "./rabbit-bot";
import { SOLANA_ADDRESS, TOKEN } from "./config";
import { registerPlugins, syncCommands, ChatTracker, FileChatStore, Logger } from "../../src/index";
import * as path from "path";

const log = new Logger("main");

const bot = new Bot(TOKEN);
const store = new FileChatStore(path.join(__dirname, "..", "..", ".chats.json"));
const tracker = new ChatTracker(store);

// Registrar plugins (sub-bots)
const plugins = [
	new RabbitBot(SOLANA_ADDRESS),
	// ...otros plugins aquí
];

registerPlugins(bot, plugins, tracker);

// Sync commands with Telegram + start
syncCommands(bot, plugins, tracker).then(() => {
  log.info("Starting bot...");
  bot.start();
});
