/**
 * rnfp-protocol-handlers.ts — State machine handler para el protocolo RNFP.
 *
 * Consume intents `rnfp.*` producidos por las rnfp-categories y ejecuta
 * transiciones de estado de federación.
 *
 * State machine:
 *   idle → awaiting_accept  (on SEND_INVITE)
 *   idle → active           (on RECEIVED_ACCEPT from active invitation)
 *   awaiting_accept → active           (on RECEIVED_ACCEPT)
 *   awaiting_accept → idle             (on RECEIVED_REJECT)
 *   active → pending_revoke            (on SEND_REVOKE or RECEIVED_REVOKE)
 *   pending_revoke → idle              (after revoke ack)
 */

import type { IntentHandler, IntentResult, SessionVars } from "../aiml/aiml-types.js";
import type { RnfpSessionVars } from "./rnfp-types.js";
import { RNFP_INTENTS } from "./rnfp-categories.js";
import {
  buildFedAccept,
  buildFedRevoke,
  buildFedReject,
  formatRnfpForChat,
} from "./rnfp-builders.js";

type RnfpVars = SessionVars & RnfpSessionVars;

// ──────────────────────────────────────────────────────────────────────────────
// Protocol handler factory
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Creates an IntentHandler that processes all `rnfp.*` intents.
 *
 * @param operatorName — the local operator identity (e.g. "alice", "cyborg_zero")
 * @param fingerprint  — local fingerprint of this operator
 *
 * Usage:
 *   handlers() { return [rnfpProtocolHandler(this.operatorName, this.fingerprint), ...own] }
 */
export function rnfpProtocolHandler<TVars extends RnfpVars>(
  operatorName: string,
  fingerprint: string,
): IntentHandler<TVars> {
  return function handleRnfpIntent(result: IntentResult, vars: TVars): string | undefined {
    const { intent, entities } = result;

    // Guard: only handle rnfp.* intents
    if (!intent.startsWith("rnfp.")) return undefined;

    // ── Meta intents ──────────────────────────────────────────────────────────
    if (intent === RNFP_INTENTS.STATUS) {
      return formatFedStatusPage(operatorName, fingerprint, vars);
    }
    if (intent === RNFP_INTENTS.HELP) {
      return FEDERATION_HELP;
    }
    if (intent === RNFP_INTENTS.IDENTITY) {
      return formatIdentityCard(operatorName, fingerprint, vars);
    }
    if (intent === RNFP_INTENTS.LIST_PEERS) {
      return formatPeersList(vars);
    }

    // ── Common fields from entities ───────────────────────────────────────────
    const fromOp = (entities?.from_operator as string | undefined) ?? vars.active_peer ?? "";
    const toOp = (entities?.to_operator as string | undefined) ?? operatorName;

    // ── Inbound: receiving RNFP messages ─────────────────────────────────────

    switch (intent) {
      case RNFP_INTENTS.RECEIVED_INVITE: {
        // An invitation arrived — enter awaiting state and auto-acknowledge
        vars.fed_state = "awaiting_accept";
        vars.active_peer = fromOp;
        return [
          `🤝 Federation invite received from ${fromOp}`,
          `📌 Fingerprint: ${entities?.fingerprint ?? "(unknown)"}`,
          `💡 Use /${operatorName}_accept to accept or /${operatorName}_reject to decline.`,
        ].join("\n");
      }

      case RNFP_INTENTS.RECEIVED_ACCEPT: {
        if (vars.fed_state !== "awaiting_accept") {
          return `ℹ️ Accept from ${fromOp} received, but no pending invite. Ignored.`;
        }
        vars.fed_state = "active";
        vars.active_peer = fromOp;
        return `✅ Federation established with ${fromOp}! State: active.`;
      }

      case RNFP_INTENTS.RECEIVED_REJECT: {
        vars.fed_state = "idle";
        const peer = vars.active_peer;
        vars.active_peer = undefined;
        return `❌ Federation invite rejected by ${peer ?? fromOp}. Back to idle.`;
      }

      case RNFP_INTENTS.RECEIVED_REVOKE: {
        vars.fed_state = "idle";
        const revokedBy = fromOp || vars.active_peer;
        vars.active_peer = undefined;
        return `🔴 Federation revoked by ${revokedBy}. State reset to idle.`;
      }

      case RNFP_INTENTS.RECEIVED_ANNOUNCE: {
        const pkgId = entities?.package_id as string | undefined;
        vars.pending_package_id = pkgId;
        return pkgId
          ? `📢 Graph package announced by ${fromOp}: ${pkgId}. Use /${operatorName}_request to fetch.`
          : `📢 Graph announced by ${fromOp}.`;
      }

      case RNFP_INTENTS.RECEIVED_REQUEST: {
        const pkgId = (entities?.package_id as string | undefined) ?? vars.pending_package_id;
        return pkgId
          ? `📬 Graph request received from ${fromOp} for package: ${pkgId}.`
          : `📬 Graph request received from ${fromOp}.`;
      }

      case RNFP_INTENTS.RECEIVED_PKG: {
        const pkgId = entities?.package_id as string | undefined;
        const checksum = entities?.checksum as string | undefined;
        vars.pending_package_id = undefined;
        return [
          `📦 Graph package received from ${fromOp}`,
          ...(pkgId ? [`Package: ${pkgId}`] : []),
          ...(checksum ? [`Checksum: ${checksum}`] : []),
        ].join("\n");
      }

      case RNFP_INTENTS.RECEIVED_UNKNOWN: {
        return `❓ Unknown RNFP message from ${fromOp}. Logged for review.`;
      }
    }

    // ── Outbound send intents: handled in FederationBotPlugin subclass ────────
    // We generate a minimal response here; the real implementation is in the bot.
    switch (intent) {
      case RNFP_INTENTS.SEND_INVITE: {
        vars.fed_state = "awaiting_accept";
        return _outboundPlaceholder("INVITE", operatorName);
      }
      case RNFP_INTENTS.SEND_ACCEPT: {
        if (vars.fed_state !== "awaiting_accept") {
          return `⚠️ Cannot accept: no pending invite. Current state: ${vars.fed_state}.`;
        }
        const peer = vars.active_peer ?? toOp;
        // Build minimal ACCEPT message
        const acceptMsg = buildFedAccept(
          operatorName, peer, fingerprint,
          { fingerprint, capabilities: ["graph_share"], confirmation: "Federation accepted." },
          `${operatorName} accepts federation with ${peer}.`,
        );
        vars.fed_state = "active";
        return formatRnfpForChat(acceptMsg);
      }
      case RNFP_INTENTS.SEND_REJECT: {
        const peer = vars.active_peer ?? toOp;
        const rejectMsg = buildFedReject(
          operatorName, peer, fingerprint,
          { reason: "OPERATOR_DECLINED" },
          `${operatorName} declines federation with ${peer}.`,
        );
        vars.fed_state = "idle";
        vars.active_peer = undefined;
        return formatRnfpForChat(rejectMsg);
      }
      case RNFP_INTENTS.SEND_REVOKE: {
        const peer = vars.active_peer ?? toOp;
        const revokeMsg = buildFedRevoke(
          operatorName, peer, fingerprint,
          { reason: "OPERATOR_REVOKED" },
          `${operatorName} revokes federation with ${peer}.`,
        );
        vars.fed_state = "idle";
        vars.active_peer = undefined;
        return formatRnfpForChat(revokeMsg);
      }
      case RNFP_INTENTS.SEND_ANNOUNCE:
      case RNFP_INTENTS.SEND_REQUEST:
      case RNFP_INTENTS.SEND_PKG:
        return _outboundPlaceholder(intent.split(".").pop()!.toUpperCase(), operatorName);
    }

    return undefined;
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Helper: outbound placeholder
// ──────────────────────────────────────────────────────────────────────────────

function _outboundPlaceholder(type: string, operatorName: string): string {
  return `📤 To send a ${type}, implement send${type.charAt(0)}${type.slice(1).toLowerCase()}() in your FederationBotPlugin subclass (operator: ${operatorName}).`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Status / identity helpers
// ──────────────────────────────────────────────────────────────────────────────

function formatFedStatusPage(operatorName: string, fingerprint: string, vars: RnfpVars): string {
  return [
    `🤖 Operator: ${operatorName}`,
    `📡 Protocol: ${vars.cyborg_identity ? `RNFP/1.0 (${vars.cyborg_identity})` : "RNFP/1.0"}`,
    `🔑 Fingerprint: ${fingerprint}`,
    `💬 Fed state: ${vars.fed_state ?? "idle"}`,
    vars.active_peer ? `🔗 Active peer: ${vars.active_peer}` : "🔗 Active peer: none",
    vars.pending_package_id ? `📦 Pending pkg: ${vars.pending_package_id}` : "",
  ].filter(Boolean).join("\n");
}

function formatIdentityCard(operatorName: string, fingerprint: string, vars: RnfpVars): string {
  return [
    `🆔 Identity`,
    `  operator_name: ${operatorName}`,
    `  fingerprint:   ${fingerprint}`,
    `  status:        ${vars.fed_state === "active" ? "federated" : "standalone"}`,
  ].join("\n");
}

function formatPeersList(vars: RnfpVars): string {
  if (!vars.active_peer) return "📋 No active peers. Use /cy_invite to start a federation.";
  return [
    `📋 Federation peers:`,
    `  • ${vars.active_peer} [${vars.fed_state}]`,
  ].join("\n");
}

// ──────────────────────────────────────────────────────────────────────────────
// Help text
// ──────────────────────────────────────────────────────────────────────────────

export const FEDERATION_HELP = `📡 RNFP/1.0 — Retro-Native Federation Protocol

Outbound commands (replace cy with your bot prefix):
  /cy_invite    — send a federation INVITE to a peer
  /cy_accept    — accept a received INVITE
  /cy_reject    — reject a received INVITE
  /cy_revoke    — revoke an active federation
  /cy_announce  — announce a graph package
  /cy_request   — request a graph package
  /cy_pkg       — deliver a graph package

Meta:
  /cy_identity    — show local identity card
  /cy_peers       — list federation peers
  /cy_fed_status  — show federation state
  /cy_fed         — this help page

UCC ref: docs/UNIVERSAL_CYBORG_CONSTITUTION.md`;
