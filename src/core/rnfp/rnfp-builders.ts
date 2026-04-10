/**
 * rnfp-builders.ts — Builders de mensajes RNFP.
 *
 * Funciones que construyen RnfpMessage<T> con todos los campos required.
 * El formato de salida para Telegram (formatRnfpForChat) produce texto
 * parseable por las categorías AIML del SDK.
 *
 * Formato canónico de chat:
 *   [CLC-FED-INVITE-v1]
 *   from_operator: alice
 *   to_operator: bob
 *   fingerprint: a1b2c3d4e5f6a7b8
 *   capabilities: graph_share,signed_messages
 *   proposal: Federate our ecosystems
 *   timestamp: 2026-04-10T12:00:00.000Z
 *   message_id: fed-invite-<id>
 *   signature: mock-sig-xxxx-...
 *   ───
 *   narrative (optional)
 */

import type {
  RnfpDataMap,
  RnfpMessage,
  RnfpMessageType,
  RnfpMeta,
  RnfpInviteData,
  RnfpAcceptData,
  RnfpRejectData,
  RnfpRevokeData,
  RnfpAnnounceData,
  RnfpGraphRequestData,
  RnfpGraphPkgData,
  RnfpUnknownMsgData,
} from "./rnfp-types.js";
import { RNFP_VERSION, MockCryptoProvider } from "./rnfp-types.js";

// ─── Shared singleton mock crypto (no config needed for demos/tests) ──────────
const defaultCrypto = new MockCryptoProvider();

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Genera un message_id con formato: <type>-<timestamp-ms>-<random4> */
export function generateRnfpMessageId(type: RnfpMessageType, slug?: string): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 6);
  const prefix = type.toLowerCase().replace(/-/g, "_");
  return slug ? `${prefix}-${slug}-${ts}-${rnd}` : `${prefix}-${ts}-${rnd}`;
}

/** Genera timestamp ISO8601 UTC. */
export function rnfpTimestamp(): string {
  return new Date().toISOString();
}

/** Computes a mock checksum (payload.length as hex). */
export function mockChecksum(payload: string): string {
  return payload.length.toString(16).padStart(8, "0");
}

export type RnfpBuildOptions = {
  message_id?: string;
  reply_to?: string;
};

// ─── Generic builder ──────────────────────────────────────────────────────────

export function buildRnfpMessage<T extends RnfpMessageType>(
  type: T,
  from: string,
  to: string,
  fingerprint: string,
  data: RnfpDataMap[T],
  narrative: string,
  options?: RnfpBuildOptions,
): RnfpMessage<T> {
  const message_id = options?.message_id ?? generateRnfpMessageId(type);
  const timestamp = rnfpTimestamp();
  // Signature signs `${type}:${from}:${to}:${message_id}:${timestamp}`
  const payload = `${type}:${from}:${to}:${message_id}:${timestamp}`;
  const signature = defaultCrypto.sign(payload);

  const meta: RnfpMeta & { message_type: T } = {
    format_version: RNFP_VERSION,
    message_type: type,
    from_operator: from,
    to_operator: to,
    timestamp,
    message_id,
    fingerprint,
    signature,
    ...(options?.reply_to ? { reply_to: options.reply_to } : {}),
  };

  return { meta, data, narrative };
}

// ─── Typed builders ───────────────────────────────────────────────────────────

export function buildFedInvite(
  from: string, to: string, fingerprint: string, data: RnfpInviteData, narrative: string, opts?: RnfpBuildOptions,
): RnfpMessage<"CLC-FED-INVITE"> {
  return buildRnfpMessage("CLC-FED-INVITE", from, to, fingerprint, data, narrative, opts);
}

export function buildFedAccept(
  from: string, to: string, fingerprint: string, data: RnfpAcceptData, narrative: string, opts?: RnfpBuildOptions,
): RnfpMessage<"CLC-FED-ACCEPT"> {
  return buildRnfpMessage("CLC-FED-ACCEPT", from, to, fingerprint, data, narrative, opts);
}

export function buildFedReject(
  from: string, to: string, fingerprint: string, data: RnfpRejectData, narrative: string, opts?: RnfpBuildOptions,
): RnfpMessage<"CLC-FED-REJECT"> {
  return buildRnfpMessage("CLC-FED-REJECT", from, to, fingerprint, data, narrative, opts);
}

export function buildFedRevoke(
  from: string, to: string, fingerprint: string, data: RnfpRevokeData, narrative: string, opts?: RnfpBuildOptions,
): RnfpMessage<"CLC-FED-REVOKE"> {
  return buildRnfpMessage("CLC-FED-REVOKE", from, to, fingerprint, data, narrative, opts);
}

export function buildGraphAnnounce(
  from: string, to: string, fingerprint: string, data: RnfpAnnounceData, narrative: string, opts?: RnfpBuildOptions,
): RnfpMessage<"CLC-GRAPH-ANNOUNCE"> {
  return buildRnfpMessage("CLC-GRAPH-ANNOUNCE", from, to, fingerprint, data, narrative, opts);
}

export function buildGraphRequest(
  from: string, to: string, fingerprint: string, data: RnfpGraphRequestData, narrative: string, opts?: RnfpBuildOptions,
): RnfpMessage<"CLC-GRAPH-REQUEST"> {
  return buildRnfpMessage("CLC-GRAPH-REQUEST", from, to, fingerprint, data, narrative, opts);
}

export function buildGraphPkg(
  from: string, to: string, fingerprint: string, data: RnfpGraphPkgData, narrative: string, opts?: RnfpBuildOptions,
): RnfpMessage<"CLC-GRAPH-PKG"> {
  return buildRnfpMessage("CLC-GRAPH-PKG", from, to, fingerprint, data, narrative, opts);
}

export function buildUnknownMsg(
  from: string, to: string, fingerprint: string, data: RnfpUnknownMsgData, narrative: string, opts?: RnfpBuildOptions,
): RnfpMessage<"CLC-UNKNOWN-MSG"> {
  return buildRnfpMessage("CLC-UNKNOWN-MSG", from, to, fingerprint, data, narrative, opts);
}

// ─── Formatter for Telegram ───────────────────────────────────────────────────

const TYPE_EMOJI: Record<RnfpMessageType, string> = {
  "CLC-FED-INVITE":    "🤝",
  "CLC-FED-ACCEPT":    "✅",
  "CLC-FED-REJECT":    "❌",
  "CLC-FED-REVOKE":    "🔴",
  "CLC-GRAPH-ANNOUNCE":"📢",
  "CLC-GRAPH-REQUEST": "📬",
  "CLC-GRAPH-PKG":     "📦",
  "CLC-UNKNOWN-MSG":   "❓",
};

/**
 * Serializes an RnfpMessage to plain text for Telegram.
 *
 * Canonical format (parseable by RNFP categories):
 *   [CLC-FED-INVITE-v1]
 *   from_operator: alice
 *   to_operator: bob
 *   fingerprint: <fp>
 *   <type-specific fields>
 *   timestamp: <ISO>
 *   message_id: <id>
 *   signature: <sig>
 *   ───
 *   narrative
 *
 * RNFP categories detect on first line: /^\[CLC-.*-v1\]/
 */
export function formatRnfpForChat<T extends RnfpMessageType>(msg: RnfpMessage<T>): string {
  const { meta, data, narrative } = msg;
  const emoji = TYPE_EMOJI[meta.message_type];
  const separator = "───────────────";

  const headerLine = `[${meta.message_type}-v1] ${emoji}`;
  const coreFields = [
    `from_operator: ${meta.from_operator}`,
    `to_operator: ${meta.to_operator}`,
    `fingerprint: ${meta.fingerprint}`,
  ];

  const typeFields = getTypeFields(meta.message_type, data);

  const tailFields = [
    `timestamp: ${meta.timestamp}`,
    `message_id: ${meta.message_id}`,
    ...(meta.reply_to ? [`reply_to: ${meta.reply_to}`] : []),
    `signature: ${meta.signature}`,
  ];

  const parts = [
    headerLine,
    ...coreFields,
    ...typeFields,
    ...tailFields,
    separator,
    ...(narrative ? [narrative] : []),
  ];

  return parts.join("\n");
}

function getTypeFields(type: RnfpMessageType, data: unknown): string[] {
  const d = data as Record<string, unknown>;
  switch (type) {
    case "CLC-FED-INVITE":
      return [
        `capabilities: ${Array.isArray(d.capabilities) ? (d.capabilities as string[]).join(",") : String(d.capabilities ?? "")}`,
        `proposal: ${d.proposal ?? ""}`,
      ];
    case "CLC-FED-ACCEPT":
      return [
        `capabilities: ${Array.isArray(d.capabilities) ? (d.capabilities as string[]).join(",") : String(d.capabilities ?? "")}`,
        `confirmation: ${d.confirmation ?? "Federation accepted."}`,
      ];
    case "CLC-FED-REJECT":
      return [`reason: ${d.reason ?? ""}`];
    case "CLC-FED-REVOKE":
      return [
        `reason: ${d.reason ?? "OPERATOR_REVOKED"}`,
        ...(d.request_data_deletion ? [`request_data_deletion: true`] : []),
      ];
    case "CLC-GRAPH-ANNOUNCE":
      return [
        `package_id: ${d.package_id ?? ""}`,
        `node_count: ${d.node_count ?? 0}`,
        ...(d.content_type ? [`content_type: ${d.content_type}`] : []),
        ...(d.description ? [`description: ${d.description}`] : []),
      ];
    case "CLC-GRAPH-REQUEST":
      return [
        `package_id: ${d.package_id ?? ""}`,
        ...(d.reason ? [`reason: ${d.reason}`] : []),
      ];
    case "CLC-GRAPH-PKG":
      return [
        `package_id: ${d.package_id ?? ""}`,
        `node_count: ${d.node_count ?? 0}`,
        `checksum: ${d.checksum ?? ""}`,
        `payload: ${d.payload ?? ""}`,
      ];
    case "CLC-UNKNOWN-MSG":
      return [`unknown_type: ${d.unknown_type ?? ""}`];
    default:
      return [];
  }
}

/**
 * Serializes to YAML (canonical RNFP format for files and logging).
 * No external dependency — uses template literals.
 */
export function toRnfpYaml<T extends RnfpMessageType>(msg: RnfpMessage<T>): string {
  const lines: string[] = [
    `format_version: ${msg.meta.format_version}`,
    `message_type: ${msg.meta.message_type}`,
    `from_operator: ${msg.meta.from_operator}`,
    `to_operator: ${msg.meta.to_operator}`,
    `timestamp: ${msg.meta.timestamp}`,
    `message_id: ${msg.meta.message_id}`,
    `fingerprint: ${msg.meta.fingerprint}`,
    `signature: ${msg.meta.signature}`,
  ];
  if (msg.meta.reply_to) lines.push(`reply_to: ${msg.meta.reply_to}`);
  if (msg.narrative) lines.push(`narrative: "${msg.narrative.replace(/"/g, '\\"')}"`);
  lines.push("data:");
  for (const [k, v] of Object.entries(msg.data as unknown as Record<string, unknown>)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      lines.push(`  ${k}: [${v.join(",")}]`);
    } else if (typeof v === "string") {
      lines.push(`  ${k}: "${v.replace(/"/g, '\\"')}"`);
    } else {
      lines.push(`  ${k}: ${v}`);
    }
  }
  return lines.join("\n");
}
