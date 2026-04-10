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
    log.info("Identity:");
    log.info(`  operator_name: ${OPERATOR_NAME}`);
    log.info(`  fingerprint:   ${bot.fingerprint}`);
    log.info("Commands available:");
    log.info("  /cy_invite <peer>    — send federation invite");
    log.info("  /cy_accept           — accept pending invite");
    log.info("  /cy_reject           — reject pending invite");
    log.info("  /cy_revoke           — revoke active federation");
    log.info("  /cy_announce <pkg>   — announce graph package");
    log.info("  /cy_identity         — show identity card");
    log.info("  /cy_peers            — list peers");
    log.info("  /cy_fed_status       — show fed status");
    log.info("  /cy_fed              — protocol help");
  } else {
    log.info(`CyborgBot running as @${result.username ?? "unknown"} — polling.`);
  }
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
