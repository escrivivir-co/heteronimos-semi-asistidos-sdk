/**
 * iacm-parser.ts — Parser de mensajes IACM.
 *
 * Convierte texto (formato chat o YAML) de vuelta a IacmMessage.
 * También detecta si un texto contiene un mensaje IACM embebido.
 */

import type { AnyIacmMessage, IacmMessageType } from "./iacm-types.js";
import { IACM_VERSION } from "./iacm-types.js";

export interface ParseResult<T extends IacmMessageType = IacmMessageType> {
  success: boolean;
  message?: AnyIacmMessage;
  errors?: string[];
}

const ALL_TYPES: IacmMessageType[] = [
  "REQUEST", "REPORT", "QUESTION", "ANSWER",
  "PROPOSAL", "ACKNOWLEDGE", "ACCEPT", "REJECT",
  "DEFER", "FYI", "URGENT",
];

/**
 * Pattern de primera línea del formato canónico:
 *   [TYPE] emoji from_agent → to_agent
 */
const CHAT_FORMAT_RE = /^\[([A-Z]+)\]\s+\S+\s+(\S+)\s*→\s*(\S+)/i;

/**
 * Detecta si un texto contiene un mensaje IACM embebido (formato chat).
 * Útil para las categories AIML — si alguien envía un mensaje IACM al chat,
 * el bot puede procesarlo como protocolo.
 */
export function detectsIacmMessage(text: string): boolean {
  const firstLine = text.split("\n")[0].trim();
  const m = CHAT_FORMAT_RE.exec(firstLine);
  if (!m) return false;
  return ALL_TYPES.includes(m[1].toUpperCase() as IacmMessageType);
}

/**
 * Extrae el tipo de mensaje de un texto IACM.
 * Returns undefined si no es un mensaje IACM válido.
 */
export function extractIacmType(text: string): IacmMessageType | undefined {
  const firstLine = text.split("\n")[0].trim();
  const m = CHAT_FORMAT_RE.exec(firstLine);
  if (!m) return undefined;
  const type = m[1].toUpperCase() as IacmMessageType;
  return ALL_TYPES.includes(type) ? type : undefined;
}

/**
 * Extrae from_agent y to_agent de un texto IACM.
 */
export function extractIacmAgents(text: string): { from_agent: string; to_agent: string } | undefined {
  const firstLine = text.split("\n")[0].trim();
  const m = CHAT_FORMAT_RE.exec(firstLine);
  if (!m) return undefined;
  return { from_agent: m[2], to_agent: m[3] };
}

/**
 * Intenta parsear un mensaje IACM desde texto.
 * Modo lenient: acepta campos opcionales faltantes.
 * Modo strict: rechaza si faltan campos required de meta.
 *
 * En lenient mode, devuelve un mensaje mínimo válido para protocolo.
 */
export function parseIacmMessage(
  input: string,
  mode: "strict" | "lenient" = "lenient",
): ParseResult {
  const errors: string[] = [];
  const firstLine = input.split("\n")[0].trim();
  const m = CHAT_FORMAT_RE.exec(firstLine);

  if (!m) {
    return { success: false, errors: ["Input does not match IACM chat format [TYPE] emoji from → to"] };
  }

  const typeStr = m[1].toUpperCase();
  if (!ALL_TYPES.includes(typeStr as IacmMessageType)) {
    return { success: false, errors: [`Unknown message type: ${typeStr}`] };
  }

  const type = typeStr as IacmMessageType;
  const from_agent = m[2];
  const to_agent = m[3];

  // Extract narrative (text after separator line)
  const sepIdx = input.indexOf("───");
  const narrative = sepIdx >= 0
    ? input.slice(sepIdx + 3).trim()
    : "";

  // Extract subject line (line starting with 📋)
  const subjectLine = input.split("\n").find(l => l.trimStart().startsWith("📋"));
  const subject = subjectLine ? subjectLine.replace("📋", "").trim() : "";

  // Extract metadata fields from compact lines (between header and separator)
  const metaSection = input.slice(firstLine.length, sepIdx >= 0 ? sepIdx : undefined);
  const threadMatch = metaSection.match(/thread:\s*(\S+)/);
  const replyToMatch = metaSection.match(/reply_to:\s*(\S+)/);
  const idMatch = metaSection.match(/id:\s*(\S+)/);

  if (mode === "strict") {
    if (!from_agent) errors.push("Missing from_agent");
    if (!to_agent) errors.push("Missing to_agent");
    if (errors.length) return { success: false, errors };
  }

  // Build a minimal message (data fields derived from subject/narrative)
  const message = {
    meta: {
      format_version: IACM_VERSION,
      message_type: type,
      from_agent,
      to_agent,
      timestamp: new Date().toISOString(),
      message_id: idMatch?.[1] ?? `${type.toLowerCase()}-parsed-${Date.now()}`,
      ...(threadMatch?.[1] ? { thread_id: threadMatch[1] } : {}),
      ...(replyToMatch?.[1] ? { reply_to: replyToMatch[1] } : {}),
    },
    data: buildMinimalData(type, subject, narrative),
    narrative,
  } as unknown as AnyIacmMessage;

  return { success: true, message };
}

function buildMinimalData(
  type: IacmMessageType,
  subject: string,
  narrative: string,
): Record<string, unknown> {
  switch (type) {
    case "REQUEST":    return { task: subject || narrative };
    case "REPORT":     return { subject: subject || "report", summary: narrative };
    case "QUESTION":   return { question: subject || narrative };
    case "ANSWER":     return { question_id: "", answer: subject || narrative };
    case "PROPOSAL":   return { title: subject || "proposal", summary: narrative, rationale: narrative };
    case "ACKNOWLEDGE": return { acknowledged_message_id: "", confirmation: subject || narrative };
    case "ACCEPT":     return { proposal_id: "", commitment: subject || narrative };
    case "REJECT":     return { proposal_id: "", rationale: subject || narrative };
    case "DEFER":      return { deferred_message_id: "", reason: subject || narrative };
    case "FYI":        return { subject: subject || "info", information: narrative };
    case "URGENT":     return { issue: subject || narrative, severity: "high", urgency_reason: narrative, action_needed: narrative, action_needed_by: "" };
    default:           return {};
  }
}

/**
 * Valida un IacmMessage ya construido.
 * Retorna array vacío si válido, o lista de errores.
 */
export function validateIacmMessage(msg: AnyIacmMessage): string[] {
  const errors: string[] = [];
  const { meta, data, narrative } = msg;

  // Meta required fields
  if (!meta.format_version) errors.push("meta.format_version required");
  if (!meta.message_type) errors.push("meta.message_type required");
  if (!meta.from_agent) errors.push("meta.from_agent required");
  if (!meta.to_agent) errors.push("meta.to_agent required");
  if (!meta.timestamp) errors.push("meta.timestamp required");
  if (!meta.message_id) errors.push("meta.message_id required");
  if (!narrative) errors.push("narrative required");

  // Type-specific required fields
  const d = data as unknown as Record<string, unknown>;
  switch (meta.message_type) {
    case "REQUEST":
      if (!d.task) errors.push("data.task required for REQUEST");
      break;
    case "REPORT":
      if (!d.subject) errors.push("data.subject required for REPORT");
      if (!d.summary) errors.push("data.summary required for REPORT");
      break;
    case "QUESTION":
      if (!d.question) errors.push("data.question required for QUESTION");
      break;
    case "ANSWER":
      if (!d.answer) errors.push("data.answer required for ANSWER");
      break;
    case "PROPOSAL":
      if (!d.title) errors.push("data.title required for PROPOSAL");
      if (!d.summary) errors.push("data.summary required for PROPOSAL");
      if (!d.rationale) errors.push("data.rationale required for PROPOSAL");
      break;
    case "ACKNOWLEDGE":
      if (!d.acknowledged_message_id) errors.push("data.acknowledged_message_id required for ACKNOWLEDGE");
      if (!d.confirmation) errors.push("data.confirmation required for ACKNOWLEDGE");
      break;
    case "ACCEPT":
      if (!d.proposal_id) errors.push("data.proposal_id required for ACCEPT");
      if (!d.commitment) errors.push("data.commitment required for ACCEPT");
      break;
    case "REJECT":
      if (!d.proposal_id) errors.push("data.proposal_id required for REJECT");
      if (!d.rationale) errors.push("data.rationale required for REJECT");
      break;
    case "DEFER":
      if (!d.deferred_message_id) errors.push("data.deferred_message_id required for DEFER");
      if (!d.reason) errors.push("data.reason required for DEFER");
      break;
    case "FYI":
      if (!d.subject) errors.push("data.subject required for FYI");
      if (!d.information) errors.push("data.information required for FYI");
      break;
    case "URGENT":
      if (!d.issue) errors.push("data.issue required for URGENT");
      if (!d.severity) errors.push("data.severity required for URGENT");
      if (!d.urgency_reason) errors.push("data.urgency_reason required for URGENT");
      if (!d.action_needed) errors.push("data.action_needed required for URGENT");
      if (!d.action_needed_by) errors.push("data.action_needed_by required for URGENT");
      break;
  }

  return errors;
}
