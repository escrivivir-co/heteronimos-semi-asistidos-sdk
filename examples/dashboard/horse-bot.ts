/**
 * horse-bot.ts — IACM protocol plugin for the dashboard.
 *
 * HorseBot handles IACM/1.0: REQUEST, REPORT, QUESTION, ANSWER, PROPOSAL,
 * ACCEPT, REJECT, DEFER, ACKNOWLEDGE, FYI, URGENT.
 *
 * All protocol logic inherited from IacmBotPlugin.
 * This class only configures agent identity.
 */

import { IacmBotPlugin } from "heteronimos-semi-asistidos-sdk";
import { IACM_AGENT_NAME } from "./config.js";

export class HorseBot extends IacmBotPlugin {
  override name = "HorseBot";
  override pluginCode = "hr";
  override agentName = IACM_AGENT_NAME;
}
