/**
 * spider-bot.ts — Federation plugin for the dashboard.
 *
 * SpiderBot handles RNFP/1.0: federation handshake (INVITE/ACCEPT/REJECT/REVOKE)
 * and graph exchange (ANNOUNCE/REQUEST/PKG).
 *
 * All protocol logic inherited from FederationBotPlugin.
 * This class only configures operator identity.
 */

import { FederationBotPlugin, MockCryptoProvider } from "heteronimos-semi-asistidos-sdk";
import { OPERATOR_NAME } from "./config.js";

export class SpiderBot extends FederationBotPlugin {
  override name = "SpiderBot";
  override pluginCode = "sp";

  private readonly _fp: string;

  constructor() {
    super();
    this._fp = new MockCryptoProvider().generateFingerprint();
  }

  override get operatorName(): string { return OPERATOR_NAME; }
  override get fingerprint(): string { return this._fp; }
}
