import { RabbitBot } from "./rabbit-bot";
import { SOLANA_ADDRESS, TOKEN } from "./config";
import { Bot, registerPlugins, syncCommands, ChatTracker, FileChatStore, Logger } from "../../src/index";
import { MockTelegramBot } from "../../src/core/mock-telegram";
import { confirm } from "../../src/core/logger";
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

async function startMockMode() {
	log.warn("Arrancando en modo MOCK — sin conexión a Telegram.");
	const mockBot = new MockTelegramBot();
	registerPlugins(mockBot as any, plugins, tracker);
	await syncCommands(mockBot as any, plugins, tracker, { autoConfirm: true });
	log.info("[MOCK] Bot mock activo. Comandos registrados: " + mockBot.getRegisteredCommands().join(", "));
	await mockBot.start();
}

async function main() {
	try {
		await syncCommands(bot, plugins, tracker);
		log.info("Starting bot...");
		await bot.start();
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : "Unknown startup error.";
		log.error(`Bot startup failed. ${message}`);

		const useMock = await confirm("¿Arrancar en modo mock (sin Telegram)? (y/n)");
		if (useMock) {
			await startMockMode();
		} else {
			globalThis.process.exitCode = 1;
		}
	}
}

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : "Unknown startup error.";
	log.error(`Fatal error. ${message}`);
	globalThis.process.exitCode = 1;
});
