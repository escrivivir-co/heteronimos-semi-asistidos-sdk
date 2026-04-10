/**
 * cyborg-bot.ts — Concrete FederationBotPlugin for the federation demo.
 *
 * Everything is inherited from FederationBotPlugin:
 *   - All 8 RNFP message types (INVITE, ACCEPT, REJECT, REVOKE, ANNOUNCE, REQUEST, PKG, UNKNOWN)
 *   - Full state machine (idle → awaiting_accept → active → pending_revoke)
 *   - 12 commands (/cy_invite, /cy_accept, /cy_reject, /cy_revoke, /cy_announce, ...)
 *
 * This class only configures operator identity.
 */

import { FederationBotPlugin, MockCryptoProvider } from "heteronimos-semi-asistidos-sdk";

export class CyborgBot extends FederationBotPlugin {
  override name = "CyborgBot";
  override pluginCode = "cy";

  private readonly _op: string;
  private readonly _fp: string;

  constructor(operatorNameStr: string) {
    super();
    this._op = operatorNameStr;
    this._fp = new MockCryptoProvider().generateFingerprint();
  }

  override get operatorName(): string { return this._op; }
  override get fingerprint(): string { return this._fp; }
}
