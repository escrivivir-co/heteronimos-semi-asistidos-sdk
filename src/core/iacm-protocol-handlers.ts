/**
 * iacm-protocol-handlers.ts — State machine handler para el protocolo IACM.
 *
 * Consume intents `iacm.*` producidos por las iacm-categories y ejecuta
 * transiciones de estado, construyendo respuestas IACM cuando corresponde.
 *
 * Este handler es parte del pipeline de AimlBotPlugin:
 *   classify → [iacmProtocolHandler] → domain handlers → fallback
 *
 * El handler devuelve una string (mensaje formateado) o undefined si
 * el intent no es de dominio IACM o el mensaje no va dirigido a este agente.
 */

import type { IntentHandler, IntentResult, SessionVars } from "./aiml-types.js";
import type { IacmSessionVars } from "./iacm-types.js";
import { IACM_INTENTS } from "./iacm-categories.js";
import {
  buildAcknowledge,
  formatIacmForChat,
} from "./iacm-templates.js";
import { parseIacmMessage } from "./iacm-parser.js";

type IacmVars = SessionVars & IacmSessionVars;

// ──────────────────────────────────────────────────────────────────────────────
// Helper: auto-ACK builder
// ──────────────────────────────────────────────────────────────────────────────

function autoAck(
  myAgent: string,
  fromAgent: string,
  acknowledgedId: string,
  confirmation: string,
): string {
  const msg = buildAcknowledge(myAgent, fromAgent, {
    acknowledged_message_id: acknowledgedId,
    confirmation,
  }, `ACK from ${myAgent}: ${confirmation}`);
  return formatIacmForChat(msg);
}

// ──────────────────────────────────────────────────────────────────────────────
// Protocol handler factory
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Creates an IntentHandler that processes all `iacm.*` intents.
 *
 * @param agentName - the role name for this bot (e.g. "meteo", "dispatch")
 *
 * Usage:
 *   handlers() { return [iacmProtocolHandler(this.agentName), ...myHandlers] }
 */
export function iacmProtocolHandler<TVars extends IacmVars>(
  agentName: string,
): IntentHandler<TVars> {
  return function handleIacmIntent(result: IntentResult, vars: TVars): string | undefined {
    const { intent, entities } = result;

      // Guard: only handle iacm.* intents
      if (!intent.startsWith("iacm.")) return undefined;

      // ── Meta intents ─────────────────────────────────────────────
      if (intent === IACM_INTENTS.STATUS) {
        return formatStatusPage(agentName, vars);
      }
      if (intent === IACM_INTENTS.HELP) {
        return PROTOCOL_HELP;
      }

      // ── Routing guard: messages addressed to me? ─────────────────
      // For "send.*" intents, from_agent is the human-facing command,
      // we don't need the routing guard.
      const toAgent = entities?.to_agent as string | undefined;
      const fromAgent = (entities?.from_agent as string | undefined) ?? vars.interlocutor ?? "";
      const msgId = vars.last_received_message_id ?? "";

      if (intent.startsWith("iacm.") && intent.includes(".received")) {
        // If message is directed to a different agent, skip silently
        if (toAgent && toAgent.toLowerCase() !== agentName.toLowerCase()) {
          return undefined; // not for me
        }
      }

      // ── Inbound: receiving protocol messages ─────────────────────
      switch (intent) {
        case IACM_INTENTS.RECEIVED_REQUEST: {
          vars.flow_state = "processing";
          vars.interlocutor = fromAgent;
          const rawMsg = entities?.raw_message as string | undefined;
          const task = rawMsg
            ? (parseIacmMessage(rawMsg).message?.data as unknown as Record<string, string>)?.task ?? "task"
            : "task";
          return autoAck(agentName, fromAgent, msgId, `Processing request: ${task}`);
        }

        case IACM_INTENTS.RECEIVED_URGENT: {
          vars.flow_state = "processing";
          vars.interlocutor = fromAgent;
          const rawMsg = entities?.raw_message as string | undefined;
          const issue = rawMsg
            ? (parseIacmMessage(rawMsg).message?.data as unknown as Record<string, string>)?.issue ?? "urgent issue"
            : "urgent issue";
          return autoAck(agentName, fromAgent, msgId, `URGENT acknowledged: ${issue}. Processing immediately.`);
        }

        case IACM_INTENTS.RECEIVED_QUESTION: {
          vars.flow_state = "processing";
          vars.interlocutor = fromAgent;
          return autoAck(agentName, fromAgent, msgId, "Question received. Preparing answer.");
        }

        case IACM_INTENTS.RECEIVED_PROPOSAL: {
          vars.flow_state = "awaiting_confirmation";
          vars.interlocutor = fromAgent;
          return autoAck(agentName, fromAgent, msgId, "Proposal under review. Will respond shortly.");
        }

        case IACM_INTENTS.RECEIVED_REPORT:
        case IACM_INTENTS.RECEIVED_ANSWER: {
          vars.flow_state = "idle";
          vars.interlocutor = fromAgent;
          return autoAck(agentName, fromAgent, msgId, "Received. Thank you.");
        }

        case IACM_INTENTS.RECEIVED_ACK: {
          // ACK closes the loop — stay in current state
          return undefined; // silent ack of their ack
        }

        case IACM_INTENTS.RECEIVED_ACCEPT: {
          vars.flow_state = "idle";
          vars.interlocutor = fromAgent;
          return `✅ ${fromAgent} accepted the proposal. Proceeding.`;
        }

        case IACM_INTENTS.RECEIVED_REJECT: {
          vars.flow_state = "idle";
          vars.interlocutor = fromAgent;
          return `❌ ${fromAgent} rejected the proposal. Reverting to idle.`;
        }

        case IACM_INTENTS.RECEIVED_FYI: {
          // FYI doesn't require a response — just update interlocutor
          vars.interlocutor = fromAgent;
          return undefined; // silently stored
        }

        case IACM_INTENTS.RECEIVED_DEFER: {
          vars.flow_state = "idle";
          vars.interlocutor = fromAgent;
          return `⏳ ${fromAgent} deferred the message. Will follow up later.`;
        }
      }

      // ── Outbound send intents are handled by domain bot ──────────
      // Return undefined so domain handlers (in IacmBotPlugin subclass) can handle them
      return undefined;
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Status page
// ──────────────────────────────────────────────────────────────────────────────

function formatStatusPage(agentName: string, vars: IacmVars): string {
  const lines = [
    `🤖 Agent: ${agentName}`,
    `📡 Protocol: IACM/1.0`,
    `💬 Flow state: ${vars.flow_state ?? "idle"}`,
    vars.interlocutor ? `🔗 Interlocutor: ${vars.interlocutor}` : "🔗 Interlocutor: none",
    vars.last_received_message_id
      ? `📨 Last msg: ${vars.last_received_message_id}`
      : "📨 Last msg: —",
  ];
  return lines.join("\n");
}

// ──────────────────────────────────────────────────────────────────────────────
// Help text
// ──────────────────────────────────────────────────────────────────────────────

export const PROTOCOL_HELP = `📡 IACM/1.0 Protocol

Outbound commands (replace xx with your bot prefix):
  /xx_request   — send a REQUEST
  /xx_question  — send a QUESTION
  /xx_report    — send a REPORT
  /xx_proposal  — send a PROPOSAL
  /xx_fyi       — send an FYI
  /xx_urgent    — send an URGENT
  /xx_ack       — send an ACKNOWLEDGE
  /xx_accept    — send an ACCEPT
  /xx_reject    — send a REJECT
  /xx_defer     — send a DEFER
  /xx_answer    — send an ANSWER

Meta:
  /xx_status    — show protocol status
  /xx_protocol  — this help page
  /xx_iacm      — this help page`;
