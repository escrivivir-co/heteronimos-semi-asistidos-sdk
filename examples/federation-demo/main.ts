/**
 * main.ts — Entry point for the federation-demo.
 *
 * Starts a single CyborgBot that implements RNFP/1.0.
 *
 * Quick demo flow:
 *   1. Set BOT_TOKEN_CYBORG in .env
 *   2. bun run main.ts  (or --mock for no token)
 *   3. In Telegram: /cy_invite <other_operator>
 *   4. The other side sees [CLC-FED-INVITE-v1], relays, replies [CLC-FED-ACCEPT-v1]
 *   5. /cy_fed_status shows federation state
 *
 * Run in mock mode (no token required):
 *   bun run main.ts --mock
 */

import { Logger, bootBot } from "heteronimos-semi-asistidos-sdk";
import * as path from "node:path";

import { CyborgBot } from "./cyborg-bot.js";
import { OPERATOR_NAME, CHAT_STORE_PATH } from "./config.js";

const forceMock = process.argv.includes("--mock");
const appDir = path.dirname(new URL(import.meta.url).pathname);
const log = new Logger("federation-demo");

async function main(): Promise<void> {
  log.info("═══════════════════════════════════════════");
  log.info("  RNFP Federation Demo — CyborgBot");
  log.info(`  Operator: ${OPERATOR_NAME}`);
  log.info("═══════════════════════════════════════════");

  const bot = new CyborgBot(OPERATOR_NAME);

  const result = await bootBot({
    plugins: [bot],
    envDir: appDir,
    chatStorePath: path.join(appDir, CHAT_STORE_PATH),
    tokenVar: "BOT_TOKEN_CYBORG",
    nonInteractive: forceMock,
    syncOptions: { autoConfirm: true },
    logger: new Logger("cyborg"),
  });

  if (result.mock) {
    log.info("Running in MOCK mode (no Telegram connection).");
    log.info(`Identity: operator=${OPERATOR_NAME}  fingerprint=${bot.fingerprint}`);
    log.info("Commands available:");
    for (const cmd of bot.commands()) {
      log.info(`  /${cmd.command}  —  ${cmd.description}`);
    }
  } else {
    log.info(`CyborgBot running @${result.started ?? "unknown"} — polling.`);
  }
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
