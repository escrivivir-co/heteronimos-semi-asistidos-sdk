/**
 * iacm-bot-plugin.ts — Extensión de AimlBotPlugin con protocolo IACM integrado.
 *
 * Nivel 3 de la jerarquía:
 *   BotPlugin (interface)
 *     → AimlBotPlugin (abstract)
 *       → IacmBotPlugin (abstract)  ← aquí
 *         → MeteoBot / DispatchBot  (app)
 *
 * Provee:
 *   - Categorías IACM (chat + commands) siempre activas
 *   - Protocol handler (state machine para mensajes recibidos)
 *   - IacmSessionVars como base del estado
 *   - 11 comandos IACM outbound
 *   - Menú /xx_iacm con status del protocolo
 */

import type { CommandDefinition } from "../command-handler.js";
import type { MenuDefinition, MenuPage } from "../menu-handler.js";
import type { AimlCategory, IntentHandler, SessionVars } from "../aiml/aiml-types.js";
import { AimlBotPlugin } from "../aiml/aiml-bot-plugin.js";
import type { IacmSessionVars } from "./iacm-types.js";
import { getAllIacmCategories } from "./iacm-categories.js";
import { iacmProtocolHandler, PROTOCOL_HELP } from "./iacm-protocol-handlers.js";

export type IacmBotVars = SessionVars & IacmSessionVars;

export abstract class IacmBotPlugin<TVars extends IacmBotVars = IacmBotVars>
  extends AimlBotPlugin<TVars>
{
  /** Role name for this bot in the IACM network (e.g. "meteo", "dispatch"). */
  abstract agentName: string;

  /**
   * Base defaultVars with IACM session fields pre-populated.
   * Subclasses should call super.defaultVars() and spread their own fields.
   */
  override defaultVars(): TVars {
    return {
      agent_role: this.agentName,
      flow_state: "idle",
      interlocutor: undefined,
      last_received_message_id: undefined,
      pending_replies: undefined,
    } as unknown as TVars;
  }

  /**
   * Categories: IACM protocol categories + domain categories from domainCategories().
   * Override domainCategories() (not categories()) in your bot.
   */
  override categories(): AimlCategory<TVars>[] {
    return [
      ...getAllIacmCategories<TVars>(),
      ...this.domainCategories(),
    ];
  }

  /**
   * Domain-specific categories (non-IACM).
   * Override in subclass to add your patterns.
   */
  domainCategories(): AimlCategory<TVars>[] {
    return [];
  }

  /**
   * Handlers: IACM protocol first, then domain handlers.
   * Override domainHandlers() (not handlers()) in your bot.
   */
  override handlers(): IntentHandler<TVars>[] {
    return [
      iacmProtocolHandler<TVars>(this.agentName),
      ...this.domainHandlers(),
    ];
  }

  /**
   * Domain-specific handlers (non-IACM).
   * Override in subclass to add your response logic.
   */
  domainHandlers(): IntentHandler<TVars>[] {
    return [];
  }

  /**
   * IACM commands. Subclasses append: [...super.commands(), ...ownCommands]
   */
  override commands(): CommandDefinition[] {
    return [
      ...super.commands(),
      // Outbound send commands (return placeholder — domain bot fills impl)
      { command: "request",  description: "Send a REQUEST to interlocutor",  buildText: () => this._outboundPlaceholder("REQUEST") },
      { command: "question", description: "Send a QUESTION to interlocutor", buildText: () => this._outboundPlaceholder("QUESTION") },
      { command: "report",   description: "Send a REPORT to interlocutor",   buildText: () => this._outboundPlaceholder("REPORT") },
      { command: "proposal", description: "Send a PROPOSAL to interlocutor", buildText: () => this._outboundPlaceholder("PROPOSAL") },
      { command: "fyi",      description: "Send an FYI to interlocutor",     buildText: () => this._outboundPlaceholder("FYI") },
      { command: "urgent",   description: "Send an URGENT to interlocutor",  buildText: () => this._outboundPlaceholder("URGENT") },
      { command: "ack",      description: "Send an ACKNOWLEDGE",             buildText: () => this._outboundPlaceholder("ACKNOWLEDGE") },
      { command: "accept",   description: "Send an ACCEPT",                  buildText: () => this._outboundPlaceholder("ACCEPT") },
      { command: "reject",   description: "Send a REJECT",                   buildText: () => this._outboundPlaceholder("REJECT") },
      { command: "defer",    description: "Send a DEFER",                    buildText: () => this._outboundPlaceholder("DEFER") },
      { command: "answer",   description: "Send an ANSWER",                  buildText: () => this._outboundPlaceholder("ANSWER") },
      // Meta commands
      { command: "status",   description: "Show IACM protocol status",       buildText: (ctx: any) => this._statusPage(ctx) },
      { command: "protocol", description: "Show IACM protocol help",         buildText: () => PROTOCOL_HELP },
      { command: "iacm",     description: "IACM status page",               buildText: (ctx: any) => this._statusPage(ctx) },
    ];
  }

  override menus(): MenuDefinition[] {
    const helpPage: MenuPage = {
      id: "iacm_help",
      text: PROTOCOL_HELP,
      buttons: [],
    };
    return [
      {
        command: "iacm",
        description: `IACM protocol status for ${this.agentName}`,
        entryPage: "iacm_help",
        pages: [helpPage],
      },
    ];
  }

  private _outboundPlaceholder(type: string): string {
    return `📤 To send a ${type}, implement the send${type.charAt(0)}${type.slice(1).toLowerCase()}() method in your bot.`;
  }

  private _statusPage(ctx: any): string {
    const chatId = ctx?.chat?.id ?? 0;
    const state = this.engine_.getState(chatId);
    const vars = (state?.vars ?? this.defaultVars()) as IacmBotVars;
    const lines = [
      `🤖 Agent: ${this.agentName}`,
      `📡 Protocol: IACM/1.0`,
      `💬 Flow state: ${vars.flow_state ?? "idle"}`,
      vars.interlocutor ? `🔗 Interlocutor: ${vars.interlocutor}` : "🔗 Interlocutor: none",
      vars.last_received_message_id
        ? `📨 Last msg id: ${vars.last_received_message_id}`
        : "📨 Last msg id: —",
    ];
    return lines.join("\n");
  }
}
