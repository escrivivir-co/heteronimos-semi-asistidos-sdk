/**
 * rnfp-bot-plugin.ts — Extensión de AimlBotPlugin con protocolo RNFP integrado.
 *
 * Nivel 3 de la jerarquía:
 *   BotPlugin (interface)
 *     → AimlBotPlugin (abstract)
 *       → FederationBotPlugin (abstract)  ← aquí
 *         → CyborgBot / MyFederatedBot   (app)
 *
 * Provee:
 *   - Categorías RNFP (chat + commands) siempre activas
 *   - Protocol handler (state machine de federación)
 *   - RnfpSessionVars como base del estado
 *   - 8 comandos RNFP outbound + 4 meta
 *   - Menú /cy_fed con status del protocolo
 */

import type { CommandDefinition } from "../command-handler.js";
import type { MenuDefinition, MenuPage } from "../menu-handler.js";
import type { AimlCategory, IntentHandler, SessionVars } from "../aiml/aiml-types.js";
import { AimlBotPlugin } from "../aiml/aiml-bot-plugin.js";
import type { RnfpSessionVars } from "./rnfp-types.js";
import { MockCryptoProvider } from "./rnfp-types.js";
import { getAllRnfpCategories } from "./rnfp-categories.js";
import { rnfpProtocolHandler, FEDERATION_HELP } from "./rnfp-protocol-handlers.js";
import {
  buildFedInvite, buildFedAccept, buildFedReject, buildFedRevoke,
  buildGraphAnnounce, generateRnfpMessageId, formatRnfpForChat,
} from "./rnfp-builders.js";

export type RnfpBotVars = SessionVars & RnfpSessionVars;

export abstract class FederationBotPlugin<TVars extends RnfpBotVars = RnfpBotVars>
  extends AimlBotPlugin<TVars>
{
  /**
   * Operator name — the identity of this Cyborg in the federation network.
   * Used in RNFP messages as `from_operator`.
   * (Named operatorName instead of agentName to distinguish CLC identity from IACM role.)
   */
  abstract operatorName: string;

  /**
   * Local fingerprint. Default: generated once via MockCryptoProvider.
   * Override in subclass to set a stable fingerprint from config/store.
   */
  get fingerprint(): string {
    if (!this._fingerprint) {
      this._fingerprint = new MockCryptoProvider().generateFingerprint();
    }
    return this._fingerprint;
  }
  private _fingerprint?: string;

  /**
   * Base defaultVars with RNFP session fields pre-populated.
   * Subclasses should call super.defaultVars() and spread their own fields.
   */
  override defaultVars(): TVars {
    return {
      fed_state: "idle",
      active_peer: undefined,
      pending_package_id: undefined,
      cyborg_identity: undefined,
      cyborg_fingerprint: undefined,
    } as unknown as TVars;
  }

  /**
   * Categories: RNFP protocol categories + domain categories from domainCategories().
   * Override domainCategories() (not categories()) in your bot.
   */
  override categories(): AimlCategory<TVars>[] {
    return [
      ...getAllRnfpCategories<TVars>(),
      ...this.domainCategories(),
    ];
  }

  /** Domain-specific categories (non-RNFP). Override in subclass. */
  domainCategories(): AimlCategory<TVars>[] {
    return [];
  }

  /**
   * Handlers: RNFP protocol handler first, then domain handlers.
   * Override domainHandlers() (not handlers()) in your bot.
   */
  override handlers(): IntentHandler<TVars>[] {
    return [
      rnfpProtocolHandler<TVars>(this.operatorName, this.fingerprint),
      ...this.domainHandlers(),
    ];
  }

  /** Domain-specific handlers (non-RNFP). Override in subclass. */
  domainHandlers(): IntentHandler<TVars>[] {
    return [];
  }

  /**
   * RNFP commands, plus inherited base commands (/reset).
   * Subclasses: [...super.commands(), ...ownCommands]
   */
  override commands(): CommandDefinition[] {
    const prefix = this.pluginCode;
    return [
      ...super.commands(),
      // Outbound federation commands
      { command: `${prefix}_invite`,   description: "Send a federation INVITE to a peer",    buildText: (ctx: any) => this._buildInvite(ctx) },
      { command: `${prefix}_accept`,   description: "Accept a pending federation INVITE",     buildText: (ctx: any) => this._handleAccept(ctx) },
      { command: `${prefix}_reject`,   description: "Reject a pending federation INVITE",     buildText: (ctx: any) => this._handleReject(ctx) },
      { command: `${prefix}_revoke`,   description: "Revoke an active federation",            buildText: (ctx: any) => this._handleRevoke(ctx) },
      { command: `${prefix}_announce`, description: "Announce a graph package",               buildText: (ctx: any) => this._buildAnnounce(ctx) },
      { command: `${prefix}_request`,  description: "Request a graph package from peer",      buildText: () => this._outboundPlaceholder("REQUEST") },
      { command: `${prefix}_pkg`,      description: "Deliver a graph package to peer",        buildText: () => this._outboundPlaceholder("PKG") },
      // Meta commands
      { command: `${prefix}_identity`,   description: "Show local identity card",            buildText: () => this._identityCard() },
      { command: `${prefix}_peers`,      description: "List active federation peers",         buildText: (ctx: any) => this._peersList(ctx) },
      { command: `${prefix}_fed_status`, description: "Show federation protocol status",      buildText: (ctx: any) => this._fedStatusPage(ctx) },
      { command: `${prefix}_fed`,        description: "RNFP protocol help",                  buildText: () => FEDERATION_HELP },
    ];
  }

  override menus(): MenuDefinition[] {
    const prefix = this.pluginCode;
    const helpPage: MenuPage = {
      id: "rnfp_help",
      text: FEDERATION_HELP,
      buttons: [],
    };
    return [
      {
        command: `${prefix}_fed`,
        description: `Federation protocol status for ${this.operatorName}`,
        entryPage: "rnfp_help",
        pages: [helpPage],
      },
    ];
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /** Resolves session vars for the given ctx's chat. */
  private _getVars(ctx: any): RnfpBotVars {
    const chatId: number = ctx?.chat?.id ?? 0;
    return (this.engine_.getState(chatId)?.vars ?? this.defaultVars()) as RnfpBotVars;
  }

  private _outboundPlaceholder(type: string): string {
    return `📤 To send ${type}, implement the buildText for ${type.toLowerCase()} in your FederationBotPlugin subclass (operator: ${this.operatorName}).`;
  }

  private _buildInvite(ctx: any): string {
    const vars = this._getVars(ctx);
    const text: string = ctx?.message?.text ?? "";
    const match = /^\/\w+_invite\s+(\S+)/i.exec(text);
    const target = match?.[1] ?? vars.active_peer ?? "peer";
    const msg = buildFedInvite(
      this.operatorName, target, this.fingerprint,
      {
        fingerprint: this.fingerprint,
        capabilities: ["graph_share", "signed_messages"],
        proposal: `${this.operatorName} proposes federation. UCC-aligned operator.`,
      },
      `${this.operatorName} invites ${target} to federate per RNFP/1.0.`,
    );
    vars.fed_state = "awaiting_accept";
    vars.active_peer = target;
    return formatRnfpForChat(msg);
  }

  private _handleAccept(ctx: any): string {
    const vars = this._getVars(ctx);
    if (vars.fed_state !== "awaiting_accept") {
      return `⚠️ No pending invite to accept. Current state: ${vars.fed_state}.`;
    }
    const peer = vars.active_peer ?? "peer";
    const msg = buildFedAccept(
      this.operatorName, peer, this.fingerprint,
      { fingerprint: this.fingerprint, capabilities: ["graph_share", "signed_messages"], confirmation: "Federation accepted." },
      `${this.operatorName} accepts federation with ${peer}.`,
    );
    vars.fed_state = "active";
    return formatRnfpForChat(msg);
  }

  private _handleReject(ctx: any): string {
    const vars = this._getVars(ctx);
    if (vars.fed_state === "idle") {
      return `⚠️ No pending invite to reject.`;
    }
    const peer = vars.active_peer ?? "peer";
    const msg = buildFedReject(
      this.operatorName, peer, this.fingerprint,
      { reason: "OPERATOR_DECLINED" },
      `${this.operatorName} declines federation with ${peer}.`,
    );
    vars.fed_state = "idle";
    vars.active_peer = undefined;
    return formatRnfpForChat(msg);
  }

  private _handleRevoke(ctx: any): string {
    const vars = this._getVars(ctx);
    if (vars.fed_state !== "active") {
      return `⚠️ No active federation to revoke. Current state: ${vars.fed_state}.`;
    }
    const peer = vars.active_peer ?? "peer";
    const msg = buildFedRevoke(
      this.operatorName, peer, this.fingerprint,
      { reason: "OPERATOR_REVOKED" },
      `${this.operatorName} revokes federation with ${peer}.`,
    );
    vars.fed_state = "idle";
    vars.active_peer = undefined;
    return formatRnfpForChat(msg);
  }

  private _buildAnnounce(ctx: any): string {
    const vars = this._getVars(ctx);
    const text: string = ctx?.message?.text ?? "";
    const match = /^\/\w+_announce\s+(\S+)(?:\s+(\d+))?/i.exec(text);
    const pkgId = match?.[1] ?? generateRnfpMessageId("CLC-GRAPH-ANNOUNCE", "pkg");
    const nodeCount = parseInt(match?.[2] ?? "1", 10);
    const target = vars.active_peer ?? "*";
    const msg = buildGraphAnnounce(
      this.operatorName, target, this.fingerprint,
      { package_id: pkgId, node_count: nodeCount, content_type: "cyborg_session" },
      `${this.operatorName} announces graph package ${pkgId} (${nodeCount} nodes).`,
    );
    vars.pending_package_id = pkgId;
    return formatRnfpForChat(msg);
  }

  private _identityCard(): string {
    return [
      `🆔 Identity`,
      `  operator_name: ${this.operatorName}`,
      `  fingerprint:   ${this.fingerprint}`,
      `  plugin_code:   ${this.pluginCode}`,
    ].join("\n");
  }

  private _peersList(ctx: any): string {
    const vars = this._getVars(ctx);
    if (!vars.active_peer) return `📋 No active peers. Use /${this.pluginCode}_invite to start a federation.`;
    return [
      `📋 Federation peers:`,
      `  • ${vars.active_peer} [${vars.fed_state}]`,
    ].join("\n");
  }

  private _fedStatusPage(ctx: any): string {
    const vars = this._getVars(ctx);
    return [
      `🤖 Operator: ${this.operatorName}`,
      `📡 Protocol: RNFP/1.0`,
      `🔑 Fingerprint: ${this.fingerprint}`,
      `💬 Fed state: ${vars.fed_state ?? "idle"}`,
      vars.active_peer ? `🔗 Active peer: ${vars.active_peer}` : "🔗 Active peer: none",
      vars.pending_package_id ? `📦 Pending pkg: ${vars.pending_package_id}` : "",
    ].filter(Boolean).join("\n");
  }
}
