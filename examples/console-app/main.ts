import { RabbitBot } from "./rabbit-bot";
import { SOLANA_ADDRESS } from "./config";
import { Logger, bootBot } from "heteronimos-semi-asistidos-sdk";
import * as path from "node:path";

const rootDir = path.join(__dirname, "..", "..");
const log = new Logger("main");

async function main() {
	const result = await bootBot({
		plugins: [new RabbitBot(SOLANA_ADDRESS)],
		envDir: rootDir,
		chatStorePath: path.join(rootDir, ".chats.json"),
		logger: log,
	});

	if (!result.started) {
		globalThis.process.exitCode = 1;
	}
}

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : "Unknown startup error.";
	log.error(`Fatal error. ${message}`);
	globalThis.process.exitCode = 1;
});
