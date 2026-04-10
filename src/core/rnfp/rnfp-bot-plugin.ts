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
      { command: `${prefix}_invite`,   description: "Send a federation INVITE to a peer",    buildText: () => this._outboundPlaceholder("INVITE") },
      { command: `${prefix}_accept`,   description: "Accept a pending federation INVITE",     buildText: (ctx: any) => this._handleAccept(ctx) },
      { command: `${prefix}_reject`,   description: "Reject a pending federation INVITE",     buildText: (ctx: any) => this._handleReject(ctx) },
      { command: `${prefix}_revoke`,   description: "Revoke an active federation",            buildText: (ctx: any) => this._handleRevoke(ctx) },
      { command: `${prefix}_announce`, description: "Announce a graph package",               buildText: () => this._outboundPlaceholder("ANNOUNCE") },
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

  private _outboundPlaceholder(type: string): string {
    return `📤 To send ${type}, implement send${type.charAt(0)}${type.slice(1).toLowerCase()}() in your FederationBotPlugin subclass (operator: ${this.operatorName}).`;
  }

  private _handleAccept(ctx: any): string {
    const chatId = ctx?.chat?.id ?? 0;
    const state = this.engine_.getState(chatId);
    const vars = (state?.vars ?? this.defaultVars()) as RnfpBotVars;
    if (vars.fed_state !== "awaiting_accept") {
      return `⚠️ No pending invite to accept. Current state: ${vars.fed_state}.`;
    }
    return this._outboundPlaceholder("ACCEPT");
  }

  private _handleReject(ctx: any): string {
    const chatId = ctx?.chat?.id ?? 0;
    const state = this.engine_.getState(chatId);
    const vars = (state?.vars ?? this.defaultVars()) as RnfpBotVars;
    if (vars.fed_state === "idle") {
      return `⚠️ No pending invite to reject.`;
    }
    return this._outboundPlaceholder("REJECT");
  }

  private _handleRevoke(ctx: any): string {
    const chatId = ctx?.chat?.id ?? 0;
    const state = this.engine_.getState(chatId);
    const vars = (state?.vars ?? this.defaultVars()) as RnfpBotVars;
    if (vars.fed_state !== "active") {
      return `⚠️ No active federation to revoke. Current state: ${vars.fed_state}.`;
    }
    return this._outboundPlaceholder("REVOKE");
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
    const chatId = ctx?.chat?.id ?? 0;
    const state = this.engine_.getState(chatId);
    const vars = (state?.vars ?? this.defaultVars()) as RnfpBotVars;
    if (!vars.active_peer) return "📋 No active peers. Use /cy_invite to start a federation.";
    return [
      `📋 Federation peers:`,
      `  • ${vars.active_peer} [${vars.fed_state}]`,
    ].join("\n");
  }

  private _fedStatusPage(ctx: any): string {
    const chatId = ctx?.chat?.id ?? 0;
    const state = this.engine_.getState(chatId);
    const vars = (state?.vars ?? this.defaultVars()) as RnfpBotVars;
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
