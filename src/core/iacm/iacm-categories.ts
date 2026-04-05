/**
 * iacm-categories.ts — Categorías AIML para el protocolo IACM.
 *
 * Define los intents y las AimlCategory que mapean mensajes IACM del chat
 * a intents procesables por el IntentEngine.
 *
 * Hay dos grupos:
 *   1. Chat categories: detectan mensajes en formato canónico [TYPE] emoji from → to
 *   2. Command categories: detectan comandos /xx_request, /xx_question, etc.
 */

import type { AimlCategory, SessionVars } from "../aiml/aiml-types.js";
import type { IacmSessionVars } from "./iacm-types.js";
import { detectsIacmMessage } from "./iacm-parser.js";

// ─────────────────────────────────────────────
// Intent names (constantes)
// ─────────────────────────────────────────────

export const IACM_INTENTS = {
  // Outbound (agent sends)
  SEND_REQUEST:    "iacm.send.request",
  SEND_QUESTION:   "iacm.send.question",
  SEND_REPORT:     "iacm.send.report",
  SEND_PROPOSAL:   "iacm.send.proposal",
  SEND_FYI:        "iacm.send.fyi",
  SEND_URGENT:     "iacm.send.urgent",
  SEND_ACK:        "iacm.send.acknowledge",
  SEND_ACCEPT:     "iacm.send.accept",
  SEND_REJECT:     "iacm.send.reject",
  SEND_DEFER:      "iacm.send.defer",
  SEND_ANSWER:     "iacm.send.answer",
  // Inbound (agent receives)
  RECEIVED_REQUEST:    "iacm.request.received",
  RECEIVED_QUESTION:   "iacm.question.received",
  RECEIVED_REPORT:     "iacm.report.received",
  RECEIVED_PROPOSAL:   "iacm.proposal.received",
  RECEIVED_FYI:        "iacm.fyi.received",
  RECEIVED_URGENT:     "iacm.urgent.received",
  RECEIVED_ACK:        "iacm.acknowledge.received",
  RECEIVED_ANSWER:     "iacm.answer.received",
  RECEIVED_ACCEPT:     "iacm.accept.received",
  RECEIVED_REJECT:     "iacm.reject.received",
  RECEIVED_DEFER:      "iacm.defer.received",
  // Aliases: spec-style names (${TYPE}_RECEIVED)
  REQUEST_RECEIVED:    "iacm.request.received",
  QUESTION_RECEIVED:   "iacm.question.received",
  REPORT_RECEIVED:     "iacm.report.received",
  PROPOSAL_RECEIVED:   "iacm.proposal.received",
  FYI_RECEIVED:        "iacm.fyi.received",
  URGENT_RECEIVED:     "iacm.urgent.received",
  ACK_RECEIVED:        "iacm.acknowledge.received",
  ANSWER_RECEIVED:     "iacm.answer.received",
  ACCEPT_RECEIVED:     "iacm.accept.received",
  REJECT_RECEIVED:     "iacm.reject.received",
  DEFER_RECEIVED:      "iacm.defer.received",
  // meta
  STATUS:          "iacm.status",
  HELP:            "iacm.protocol.help",
} as const;

export type IacmIntent = (typeof IACM_INTENTS)[keyof typeof IACM_INTENTS];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

type IacmVars = SessionVars & IacmSessionVars;

/** Builds a category that matches [TYPE] emoji from_agent → to_agent */
function chatCategory<TVars extends IacmVars>(
  id: string,
  typeTag: string,
  intent: string,
  priority = 50,
): AimlCategory<TVars> {
  const re = new RegExp(
    `^\\[${typeTag}\\]\\s+\\S+\\s+(\\S+)\\s*→\\s*(\\S+)`,
    "i",
  );
  return {
    id,
    priority,
    // PatternFn: (input: string, vars: SessionVars) => PatternMatch
    // stars[0] = from_agent, stars[1] = to_agent
    pattern: (text: string, _vars: SessionVars) => {
      if (!detectsIacmMessage(text)) return { matched: false, stars: [] };
      const m = re.exec(text.split("\n")[0].trim());
      if (!m) return { matched: false, stars: [] };
      return {
        matched: true,
        stars: [m[1], m[2]], // [from_agent, to_agent]
      };
    },
    // IntentFn: (vars: TVars, stars: string[], ctx: MessageContext) => IntentResult
    resolver: (_vars: TVars, stars: string[], ctx) => {
      return {
        intent,
        confidence: 0.95,
        entities: {
          from_agent: stars[0] ?? "",
          to_agent: stars[1] ?? "",
          raw_message: ctx.text,
        },
        stars,
        originalInput: ctx.text,
      };
    },
    // sideEffect: (vars: TVars, stars: string[], intent: IntentResult) => void
    sideEffect: (vars: TVars, stars: string[], intentResult) => {
      if (stars[0]) {
        (vars as IacmVars).interlocutor = stars[0];
      }
      if (intentResult.originalInput) {
        (vars as IacmVars).last_received_message_id =
          extractMessageId(intentResult.originalInput) ?? "";
      }
    },
  };
}

/** Simple helper: extracts `id: <value>` from an IACM chat format string */
function extractMessageId(text: string): string | undefined {
  const m = text.match(/\nid:\s*(\S+)/);
  return m?.[1];
}

// ─────────────────────────────────────────────
// Chat categories (receiving IACM from another bot)
// ─────────────────────────────────────────────

export function getIacmChatCategories<TVars extends IacmVars>(): AimlCategory<TVars>[] {
  return [
    chatCategory("iacm.recv.request",    "REQUEST",    IACM_INTENTS.RECEIVED_REQUEST,    90),
    chatCategory("iacm.recv.question",   "QUESTION",   IACM_INTENTS.RECEIVED_QUESTION,   90),
    chatCategory("iacm.recv.report",     "REPORT",     IACM_INTENTS.RECEIVED_REPORT,     90),
    chatCategory("iacm.recv.proposal",   "PROPOSAL",   IACM_INTENTS.RECEIVED_PROPOSAL,   90),
    chatCategory("iacm.recv.fyi",        "FYI",        IACM_INTENTS.RECEIVED_FYI,        90),
    chatCategory("iacm.recv.urgent",     "URGENT",     IACM_INTENTS.RECEIVED_URGENT,     95), // higher priority
    chatCategory("iacm.recv.ack",        "ACKNOWLEDGE", IACM_INTENTS.RECEIVED_ACK,       85),
    chatCategory("iacm.recv.answer",     "ANSWER",     IACM_INTENTS.RECEIVED_ANSWER,     87),
    chatCategory("iacm.recv.accept",     "ACCEPT",     IACM_INTENTS.RECEIVED_ACCEPT,     85),
    chatCategory("iacm.recv.reject",     "REJECT",     IACM_INTENTS.RECEIVED_REJECT,     85),
    chatCategory("iacm.recv.defer",      "DEFER",      IACM_INTENTS.RECEIVED_DEFER,      85),
  ];
}

// ─────────────────────────────────────────────
// Command categories (human user triggers outbound)
// Matches patterns like "/xx_request", "/dispatch_question", etc.
// ─────────────────────────────────────────────

function commandCategory<TVars extends IacmVars>(
  id: string,
  cmdSuffix: string,
  intent: string,
  priority = 70,
): AimlCategory<TVars> {
  const re = new RegExp(`^/\\w+_${cmdSuffix}(?:\\s|$)`, "i");
  return {
    id,
    priority,
    pattern: re,
    resolver: intent,
  };
}

export function getIacmCommandCategories<TVars extends IacmVars>(): AimlCategory<TVars>[] {
  return [
    commandCategory("iacm.cmd.request",  "request",  IACM_INTENTS.SEND_REQUEST),
    commandCategory("iacm.cmd.question", "question", IACM_INTENTS.SEND_QUESTION),
    commandCategory("iacm.cmd.report",   "report",   IACM_INTENTS.SEND_REPORT),
    commandCategory("iacm.cmd.proposal", "proposal", IACM_INTENTS.SEND_PROPOSAL),
    commandCategory("iacm.cmd.fyi",      "fyi",      IACM_INTENTS.SEND_FYI),
    commandCategory("iacm.cmd.urgent",   "urgent",   IACM_INTENTS.SEND_URGENT),
    commandCategory("iacm.cmd.ack",      "ack",      IACM_INTENTS.SEND_ACK),
    commandCategory("iacm.cmd.accept",   "accept",   IACM_INTENTS.SEND_ACCEPT),
    commandCategory("iacm.cmd.reject",   "reject",   IACM_INTENTS.SEND_REJECT),
    commandCategory("iacm.cmd.defer",    "defer",    IACM_INTENTS.SEND_DEFER),
    commandCategory("iacm.cmd.answer",   "answer",   IACM_INTENTS.SEND_ANSWER),
    // meta commands
    { id: "iacm.cmd.status",   priority: 70, pattern: /^\/\w+_status(?:\s|$)/i,   resolver: IACM_INTENTS.STATUS },
    { id: "iacm.cmd.protocol", priority: 70, pattern: /^\/\w+_protocol(?:\s|$)/i, resolver: IACM_INTENTS.HELP },
    { id: "iacm.cmd.iacm",     priority: 70, pattern: /^\/\w+_iacm(?:\s|$)/i,     resolver: IACM_INTENTS.HELP },
  ];
}

// ─────────────────────────────────────────────
// Convenience: all at once
// ─────────────────────────────────────────────

export function getAllIacmCategories<TVars extends IacmVars>(): AimlCategory<TVars>[] {
  return [
    ...getIacmChatCategories<TVars>(),
    ...getIacmCommandCategories<TVars>(),
  ];
}
