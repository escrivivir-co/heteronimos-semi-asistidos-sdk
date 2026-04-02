import { RabbitBot } from "./rabbit-bot";
import { SOLANA_ADDRESS, TOKEN } from "./config";
import { Bot, registerPlugins, syncCommands, ChatTracker, FileChatStore, Logger } from "../../src/index";
import * as path from "node:path";

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

async function main() {
	await syncCommands(bot, plugins, tracker);
	log.info("Starting bot...");
	await bot.start();
}

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : "Unknown startup error.";
	log.error(`Bot startup failed. ${message}`);
	globalThis.process.exitCode = 1;
});
