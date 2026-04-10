/**
 * cyborg-bot.ts — Concrete FederationBotPlugin for the federation demo.
 *
 * Demonstrates:
 *   - Operator identity via operatorName + fingerprint
 *   - Generating and sending a CLC-FED-INVITE-v1 via /cy_invite
 *   - Announcing a graph package via /cy_announce
 *   - All RNFP protocol handlers active via base class
 */

import {
  FederationBotPlugin,
  type RnfpBotVars,
  MockCryptoProvider,
  buildFedInvite,
  buildGraphAnnounce,
  formatRnfpForChat,
  generateRnfpMessageId,
} from "heteronimos-semi-asistidos-sdk";
import type { CommandDefinition } from "heteronimos-semi-asistidos-sdk";

export interface CyborgBotVars extends RnfpBotVars {
  target_operator?: string;
}

export class CyborgBot extends FederationBotPlugin<CyborgBotVars> {
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

  override defaultVars(): CyborgBotVars {
    return {
      ...super.defaultVars(),
      target_operator: undefined,
    };
  }

  override commands(): CommandDefinition[] {
    return [
      ...super.commands(),
      {
        // /cy_invite <target_operator>  — sends a real CLC-FED-INVITE-v1
        command: `${this.pluginCode}_invite`,
        description: "Send a CLC-FED-INVITE-v1 to a target operator",
        buildText: (ctx: any) => {
          const chatId = ctx?.chat?.id ?? 0;
          const state = this.engine_.getState(chatId);
          const vars = (state?.vars ?? this.defaultVars()) as CyborgBotVars;

          // Extract target from command args: /cy_invite <target>
          const text: string = ctx?.message?.text ?? "";
          const targetMatch = /^\/\w+_invite\s+(\S+)/i.exec(text);
          const target = targetMatch?.[1] ?? vars.target_operator ?? "peer";

          const msg = buildFedInvite(
            this._op, target, this._fp,
            {
              fingerprint: this._fp,
              capabilities: ["graph_share", "signed_messages"],
              proposal: `${this._op} proposes federation. UCC-aligned operator.`,
            },
            `${this._op} invites ${target} to federate per RNFP/1.0.`,
          );

          vars.fed_state = "awaiting_accept";
          vars.active_peer = target;

          return formatRnfpForChat(msg);
        },
      },
      {
        // /cy_announce <package_id> [node_count]  — announces a graph package
        command: `${this.pluginCode}_announce`,
        description: "Announce a graph package to all federation peers",
        buildText: (ctx: any) => {
          const chatId = ctx?.chat?.id ?? 0;
          const state = this.engine_.getState(chatId);
          const vars = (state?.vars ?? this.defaultVars()) as CyborgBotVars;

          const text: string = ctx?.message?.text ?? "";
          const argsMatch = /^\/\w+_announce\s+(\S+)(?:\s+(\d+))?/i.exec(text);
          const pkgId = argsMatch?.[1] ?? generateRnfpMessageId("CLC-GRAPH-ANNOUNCE", "pkg");
          const nodeCount = parseInt(argsMatch?.[2] ?? "1", 10);
          const target = vars.active_peer ?? "*";

          const msg = buildGraphAnnounce(
            this._op, target, this._fp,
            {
              package_id: pkgId,
              node_count: nodeCount,
              content_type: "cyborg_session",
              description: "Graph data from CyborgZero operator",
            },
            `${this._op} announces graph package ${pkgId} (${nodeCount} nodes).`,
          );

          vars.pending_package_id = pkgId;

          return formatRnfpForChat(msg);
        },
      },
    ];
  }
}
