/**
 * rnfp-parser.ts — Parser de mensajes RNFP.
 *
 * Convierte texto en formato chat (o key-value body) de vuelta a RnfpMessage.
 * También detecta si un texto contiene un mensaje RNFP embebido.
 *
 * Formato canónico RNFP (chat):
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

import type { AnyRnfpMessage, RnfpMessageType } from "./rnfp-types.js";
import { RNFP_VERSION } from "./rnfp-types.js";

export interface RnfpParseResult {
  success: boolean;
  message?: AnyRnfpMessage;
  errors?: string[];
}

const ALL_TYPES: RnfpMessageType[] = [
  "CLC-FED-INVITE",
  "CLC-FED-ACCEPT",
  "CLC-FED-REJECT",
  "CLC-FED-REVOKE",
  "CLC-GRAPH-ANNOUNCE",
  "CLC-GRAPH-REQUEST",
  "CLC-GRAPH-PKG",
  "CLC-UNKNOWN-MSG",
];

/**
 * RNFP header line pattern.
 * Matches: [CLC-FED-INVITE-v1] or [CLC-GRAPH-PKG-v1] etc.
 */
const RNFP_HEADER_RE = /^\[CLC-((?:FED|GRAPH)-[A-Z-]+|UNKNOWN-MSG)-v1\]/i;

/**
 * Detecta si un texto contiene un mensaje RNFP embebido.
 */
export function detectsRnfpMessage(text: string): boolean {
  const firstLine = text.split("\n")[0].trim();
  const m = RNFP_HEADER_RE.exec(firstLine);
  if (!m) return false;
  const rawType = `CLC-${m[1].toUpperCase()}` as RnfpMessageType;
  return ALL_TYPES.includes(rawType);
}

/**
 * Extrae el RnfpMessageType de un texto, o undefined si no es RNFP.
 */
export function extractRnfpType(text: string): RnfpMessageType | undefined {
  const firstLine = text.split("\n")[0].trim();
  const m = RNFP_HEADER_RE.exec(firstLine);
  if (!m) return undefined;
  const type = `CLC-${m[1].toUpperCase()}` as RnfpMessageType;
  return ALL_TYPES.includes(type) ? type : undefined;
}

/**
 * Extrae from_operator y to_operator del cuerpo key-value.
 */
export function extractRnfpOperators(
  text: string,
): { from_operator: string; to_operator: string } | undefined {
  if (!detectsRnfpMessage(text)) return undefined;
  const from = extractBodyField(text, "from_operator");
  const to = extractBodyField(text, "to_operator");
  if (!from && !to) return undefined;
  return { from_operator: from ?? "", to_operator: to ?? "" };
}

/**
 * Extrae el valor de un campo key-value del cuerpo del mensaje.
 * Formato esperado — una línea: `key: value`
 */
export function extractBodyField(text: string, key: string): string | undefined {
  const re = new RegExp(`^${key}:\\s*(.+)$`, "im");
  return re.exec(text)?.[1]?.trim();
}

/**
 * Intenta parsear un mensaje RNFP desde texto.
 * mode "lenient": acepta campos opcionales faltantes.
 * mode "strict": rechaza si faltan campos required de meta.
 */
export function parseRnfpMessage(
  input: string,
  mode: "strict" | "lenient" = "lenient",
): RnfpParseResult {
  const firstLine = input.split("\n")[0].trim();
  const m = RNFP_HEADER_RE.exec(firstLine);

  if (!m) {
    return {
      success: false,
      errors: ["Input does not match RNFP format [CLC-*-v1]"],
    };
  }

  const rawType = `CLC-${m[1].toUpperCase()}` as RnfpMessageType;
  if (!ALL_TYPES.includes(rawType)) {
    return { success: false, errors: [`Unknown RNFP type: ${rawType}`] };
  }

  const from_operator = extractBodyField(input, "from_operator") ?? "";
  const to_operator = extractBodyField(input, "to_operator") ?? "*";
  const timestamp = extractBodyField(input, "timestamp") ?? new Date().toISOString();
  const message_id = extractBodyField(input, "message_id") ?? `parsed-${Date.now()}`;
  const fingerprint = extractBodyField(input, "fingerprint") ?? "";
  const signature = extractBodyField(input, "signature") ?? "";

  const errors: string[] = [];
  if (mode === "strict") {
    if (!from_operator) errors.push("Missing from_operator");
    if (!fingerprint) errors.push("Missing fingerprint");
    if (errors.length) return { success: false, errors };
  }

  // Extract narrative (lines after the separator line)
  const inputLines = input.split("\n");
  const sepLineIdx = inputLines.findIndex(l => l.trim().startsWith("───"));
  const narrative = sepLineIdx >= 0
    ? inputLines.slice(sepLineIdx + 1).join("\n").trim()
    : "";

  const message = {
    meta: {
      format_version: RNFP_VERSION,
      message_type: rawType,
      from_operator,
      to_operator,
      timestamp,
      message_id,
      fingerprint,
      signature,
    },
    data: buildMinimalRnfpData(rawType, input),
    narrative,
  } as unknown as AnyRnfpMessage;

  return { success: true, message };
}

/**
 * Validates an already-constructed RnfpMessage.
 * Returns empty array if valid, or list of errors.
 */
export function validateRnfpMessage(msg: AnyRnfpMessage): string[] {
  const errors: string[] = [];
  const { meta } = msg;
  if (!meta.format_version) errors.push("meta.format_version required");
  if (!meta.message_type) errors.push("meta.message_type required");
  if (!meta.from_operator) errors.push("meta.from_operator required");
  if (!meta.timestamp) errors.push("meta.timestamp required");
  if (!meta.message_id) errors.push("meta.message_id required");
  if (!meta.fingerprint) errors.push("meta.fingerprint required");
  return errors;
}

// ─── Internal helper: build minimal data from key-value body ─────────────────

function buildMinimalRnfpData(
  type: RnfpMessageType,
  text: string,
): Record<string, unknown> {
  const get = (key: string) => extractBodyField(text, key) ?? "";
  switch (type) {
    case "CLC-FED-INVITE":
      return {
        fingerprint: get("fingerprint"),
        capabilities: get("capabilities").split(",").filter(Boolean),
        proposal: get("proposal"),
      };
    case "CLC-FED-ACCEPT":
      return {
        fingerprint: get("fingerprint"),
        capabilities: get("capabilities").split(",").filter(Boolean),
        confirmation: get("confirmation"),
      };
    case "CLC-FED-REJECT":
      return { reason: get("reason") };
    case "CLC-FED-REVOKE":
      return {
        reason: get("reason") || "OPERATOR_REVOKED",
        request_data_deletion: get("request_data_deletion") === "true",
      };
    case "CLC-GRAPH-ANNOUNCE":
      return {
        package_id: get("package_id"),
        node_count: parseInt(get("node_count") || "0", 10),
        content_type: get("content_type") || undefined,
        description: get("description") || undefined,
      };
    case "CLC-GRAPH-REQUEST":
      return {
        package_id: get("package_id"),
        reason: get("reason") || undefined,
      };
    case "CLC-GRAPH-PKG":
      return {
        package_id: get("package_id"),
        payload: get("payload"),
        checksum: get("checksum"),
        node_count: parseInt(get("node_count") || "0", 10),
      };
    case "CLC-UNKNOWN-MSG":
      return { unknown_type: get("unknown_type"), raw_content: text };
    default:
      return {};
  }
}
