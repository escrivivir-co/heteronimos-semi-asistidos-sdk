/**
 * rnfp-categories.ts — Categorías AIML para el protocolo RNFP.
 *
 * Define los intents y las AimlCategory que mapean mensajes RNFP del chat
 * a intents procesables por el IntentEngine.
 *
 * Hay dos grupos:
 *   1. Chat categories: detectan mensajes [CLC-*-v1] en el chat
 *   2. Command categories: detectan comandos /cy_invite, /cy_accept, etc.
 */

import type { AimlCategory, SessionVars } from "../aiml/aiml-types.js";
import type { RnfpSessionVars } from "./rnfp-types.js";
import { detectsRnfpMessage } from "./rnfp-parser.js";

// ─── Intent names ────────────────────────────────────────────────────────────

export const RNFP_INTENTS = {
  // Outbound (operator sends)
  SEND_INVITE:    "rnfp.send.invite",
  SEND_ACCEPT:    "rnfp.send.accept",
  SEND_REJECT:    "rnfp.send.reject",
  SEND_REVOKE:    "rnfp.send.revoke",
  SEND_ANNOUNCE:  "rnfp.send.announce",
  SEND_REQUEST:   "rnfp.send.request",
  SEND_PKG:       "rnfp.send.pkg",
  // Inbound (operator receives)
  RECEIVED_INVITE:    "rnfp.invite.received",
  RECEIVED_ACCEPT:    "rnfp.accept.received",
  RECEIVED_REJECT:    "rnfp.reject.received",
  RECEIVED_REVOKE:    "rnfp.revoke.received",
  RECEIVED_ANNOUNCE:  "rnfp.announce.received",
  RECEIVED_REQUEST:   "rnfp.request.received",
  RECEIVED_PKG:       "rnfp.pkg.received",
  RECEIVED_UNKNOWN:   "rnfp.unknown.received",
  // Meta
  STATUS:         "rnfp.status",
  HELP:           "rnfp.protocol.help",
  IDENTITY:       "rnfp.identity",
  LIST_PEERS:     "rnfp.list.peers",
} as const;

export type RnfpIntent = (typeof RNFP_INTENTS)[keyof typeof RNFP_INTENTS];

// ─── Helpers ─────────────────────────────────────────────────────────────────

type RnfpVars = SessionVars & RnfpSessionVars;

/**
 * Builds a category that matches [CLC-*-v1] header lines.
 * Extracts from_operator and to_operator from body.
 */
function chatCategory<TVars extends RnfpVars>(
  id: string,
  typeTag: string,  // e.g. "FED-INVITE", "GRAPH-ANNOUNCE"
  intent: string,
  priority = 50,
): AimlCategory<TVars> {
  const re = new RegExp(
    `^\\[CLC-${typeTag.replace(/-/g, "[-_]")}-v1\\]`,
    "i",
  );
  return {
    id,
    priority,
    pattern: (text: string, _vars: SessionVars) => {
      if (!detectsRnfpMessage(text)) return { matched: false, stars: [] };
      const firstLine = text.split("\n")[0].trim();
      if (!re.test(firstLine)) return { matched: false, stars: [] };
      // Extract from/to from body
      const fromMatch = /^from_operator:\s*(\S+)/im.exec(text);
      const toMatch = /^to_operator:\s*(\S+)/im.exec(text);
      return {
        matched: true,
        stars: [fromMatch?.[1] ?? "", toMatch?.[1] ?? "*"],
      };
    },
    resolver: (_vars: TVars, stars: string[], ctx) => ({
      intent,
      confidence: 0.95,
      entities: {
        from_operator: stars[0] ?? "",
        to_operator: stars[1] ?? "*",
        raw_message: ctx.text,
      },
      stars,
      originalInput: ctx.text,
    }),
    sideEffect: (vars: TVars, stars: string[], _intentResult) => {
      if (stars[0]) {
        (vars as RnfpVars).active_peer = stars[0];
      }
    },
  };
}

/**
 * Builds a command category that matches /<prefix>_<cmdSuffix>.
 */
function commandCategory<TVars extends RnfpVars>(
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

// ─── Chat categories (receiving RNFP from chat) ──────────────────────────────

export function getRnfpChatCategories<TVars extends RnfpVars>(): AimlCategory<TVars>[] {
  return [
    chatCategory("rnfp.recv.invite",    "FED-INVITE",    RNFP_INTENTS.RECEIVED_INVITE,   90),
    chatCategory("rnfp.recv.accept",    "FED-ACCEPT",    RNFP_INTENTS.RECEIVED_ACCEPT,   90),
    chatCategory("rnfp.recv.reject",    "FED-REJECT",    RNFP_INTENTS.RECEIVED_REJECT,   90),
    chatCategory("rnfp.recv.revoke",    "FED-REVOKE",    RNFP_INTENTS.RECEIVED_REVOKE,   92),
    chatCategory("rnfp.recv.announce",  "GRAPH-ANNOUNCE",RNFP_INTENTS.RECEIVED_ANNOUNCE, 85),
    chatCategory("rnfp.recv.request",   "GRAPH-REQUEST", RNFP_INTENTS.RECEIVED_REQUEST,  85),
    chatCategory("rnfp.recv.pkg",       "GRAPH-PKG",     RNFP_INTENTS.RECEIVED_PKG,      85),
    chatCategory("rnfp.recv.unknown",   "UNKNOWN-MSG",   RNFP_INTENTS.RECEIVED_UNKNOWN,  50),
  ];
}

// ─── Command categories (operator triggers outbound) ─────────────────────────

export function getRnfpCommandCategories<TVars extends RnfpVars>(): AimlCategory<TVars>[] {
  return [
    commandCategory("rnfp.cmd.invite",   "invite",   RNFP_INTENTS.SEND_INVITE),
    commandCategory("rnfp.cmd.accept",   "accept",   RNFP_INTENTS.SEND_ACCEPT),
    commandCategory("rnfp.cmd.reject",   "reject",   RNFP_INTENTS.SEND_REJECT),
    commandCategory("rnfp.cmd.revoke",   "revoke",   RNFP_INTENTS.SEND_REVOKE),
    commandCategory("rnfp.cmd.announce", "announce", RNFP_INTENTS.SEND_ANNOUNCE),
    commandCategory("rnfp.cmd.request",  "request",  RNFP_INTENTS.SEND_REQUEST),
    commandCategory("rnfp.cmd.pkg",      "pkg",      RNFP_INTENTS.SEND_PKG),
    // meta
    { id: "rnfp.cmd.identity",  priority: 70, pattern: /^\/\w+_identity(?:\s|$)/i,  resolver: RNFP_INTENTS.IDENTITY },
    { id: "rnfp.cmd.peers",     priority: 70, pattern: /^\/\w+_peers(?:\s|$)/i,     resolver: RNFP_INTENTS.LIST_PEERS },
    { id: "rnfp.cmd.status",    priority: 70, pattern: /^\/\w+_fed_status(?:\s|$)/i,resolver: RNFP_INTENTS.STATUS },
    { id: "rnfp.cmd.help",      priority: 70, pattern: /^\/\w+_fed(?:\s|$)/i,       resolver: RNFP_INTENTS.HELP },
  ];
}

// ─── All at once ─────────────────────────────────────────────────────────────

export function getAllRnfpCategories<TVars extends RnfpVars>(): AimlCategory<TVars>[] {
  return [
    ...getRnfpChatCategories<TVars>(),
    ...getRnfpCommandCategories<TVars>(),
  ];
}
