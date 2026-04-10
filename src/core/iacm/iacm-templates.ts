/**
 * iacm-templates.ts — Builders de mensajes IACM.
 *
 * Funciones que construyen IacmMessage<T> con todos los campos required.
 * El formato de salida para Telegram (formatIacmForChat) produce texto
 * parseable por las categorías AIML del SDK.
 *
 * Formato canónico de chat:
 *   [TYPE] from_agent → to_agent
 *   📋 subject/task/question/title
 *   key: value
 *   ───
 *   narrative text
 */

import type {
  IacmDataMap,
  IacmMessage,
  IacmMessageType,
  IacmMeta,
  IacmRequestData,
  IacmReportData,
  IacmQuestionData,
  IacmAnswerData,
  IacmProposalData,
  IacmAcknowledgeData,
  IacmAcceptData,
  IacmRejectData,
  IacmDeferData,
  IacmFyiData,
  IacmUrgentData,
} from "./iacm-types.js";
import { IACM_VERSION } from "./iacm-types.js";

// ─── Utilidades ────────────────────────────────────────────────────────────────

/** Genera un message_id con formato: <type>-<timestamp-ms>-<random4> */
export function generateMessageId(type: IacmMessageType, slug?: string): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 6);
  const prefix = type.toLowerCase();
  return slug ? `${prefix}-${slug}-${ts}-${rnd}` : `${prefix}-${ts}-${rnd}`;
}

/** Genera timestamp ISO8601 UTC. */
export function iacmTimestamp(): string {
  return new Date().toISOString();
}

export type BuildOptions = {
  thread_id?: string;
  reply_to?: string;
  message_id?: string;
  statistics?: Record<string, string | number>;
};

// ─── Builder genérico ─────────────────────────────────────────────────────────

export function buildIacmMessage<T extends IacmMessageType>(
  type: T,
  from: string,
  to: string,
  data: IacmDataMap[T],
  narrative: string,
  options?: BuildOptions,
): IacmMessage<T> {
  const meta: IacmMeta & { message_type: T } = {
    format_version: IACM_VERSION,
    message_type: type,
    from_agent: from,
    to_agent: to,
    timestamp: iacmTimestamp(),
    message_id: options?.message_id ?? generateMessageId(type),
    ...(options?.thread_id ? { thread_id: options.thread_id } : {}),
    ...(options?.reply_to ? { reply_to: options.reply_to } : {}),
  };
  return {
    meta,
    data,
    narrative,
    ...(options?.statistics ? { statistics: options.statistics } : {}),
  };
}

// ─── Builders tipados ─────────────────────────────────────────────────────────

export function buildRequest(
  from: string, to: string, data: IacmRequestData, narrative: string, opts?: BuildOptions,
): IacmMessage<"REQUEST"> {
  return buildIacmMessage("REQUEST", from, to, data, narrative, opts);
}

export function buildReport(
  from: string, to: string, data: IacmReportData, narrative: string, opts?: BuildOptions,
): IacmMessage<"REPORT"> {
  return buildIacmMessage("REPORT", from, to, data, narrative, opts);
}

export function buildQuestion(
  from: string, to: string, data: IacmQuestionData, narrative: string, opts?: BuildOptions,
): IacmMessage<"QUESTION"> {
  return buildIacmMessage("QUESTION", from, to, data, narrative, opts);
}

export function buildAnswer(
  from: string, to: string, data: IacmAnswerData, narrative: string, opts?: BuildOptions,
): IacmMessage<"ANSWER"> {
  return buildIacmMessage("ANSWER", from, to, data, narrative, opts);
}

export function buildProposal(
  from: string, to: string, data: IacmProposalData, narrative: string, opts?: BuildOptions,
): IacmMessage<"PROPOSAL"> {
  return buildIacmMessage("PROPOSAL", from, to, data, narrative, opts);
}

export function buildAcknowledge(
  from: string, to: string, data: IacmAcknowledgeData, narrative: string, opts?: BuildOptions,
): IacmMessage<"ACKNOWLEDGE"> {
  return buildIacmMessage("ACKNOWLEDGE", from, to, data, narrative, opts);
}

export function buildAccept(
  from: string, to: string, data: IacmAcceptData, narrative: string, opts?: BuildOptions,
): IacmMessage<"ACCEPT"> {
  return buildIacmMessage("ACCEPT", from, to, data, narrative, opts);
}

export function buildReject(
  from: string, to: string, data: IacmRejectData, narrative: string, opts?: BuildOptions,
): IacmMessage<"REJECT"> {
  return buildIacmMessage("REJECT", from, to, data, narrative, opts);
}

export function buildDefer(
  from: string, to: string, data: IacmDeferData, narrative: string, opts?: BuildOptions,
): IacmMessage<"DEFER"> {
  return buildIacmMessage("DEFER", from, to, data, narrative, opts);
}

export function buildFyi(
  from: string, to: string, data: IacmFyiData, narrative: string, opts?: BuildOptions,
): IacmMessage<"FYI"> {
  return buildIacmMessage("FYI", from, to, data, narrative, opts);
}

export function buildUrgent(
  from: string, to: string, data: IacmUrgentData, narrative: string, opts?: BuildOptions,
): IacmMessage<"URGENT"> {
  return buildIacmMessage("URGENT", from, to, data, narrative, opts);
}

// ─── Formateo para Telegram ────────────────────────────────────────────────────

const TYPE_EMOJI: Record<IacmMessageType, string> = {
  REQUEST:    "📥",
  REPORT:     "📊",
  QUESTION:   "❓",
  ANSWER:     "💡",
  PROPOSAL:   "📝",
  ACKNOWLEDGE:"✅",
  ACCEPT:     "👍",
  REJECT:     "❌",
  DEFER:      "⏳",
  FYI:        "ℹ️",
  URGENT:     "🚨",
};

/**
 * Serializa un IacmMessage a texto legible para Telegram.
 *
 * Formato canónico (parseable por las categorías AIML):
 *   [TYPE] emoji from_agent → to_agent
 *   📋 subject/task/question
 *   key: value
 *   ───
 *   narrative text
 *   [msg_id]
 *
 * Las categorías IACM hacen pattern match contra la primera línea:
 *   /^\[TYPE\]\s+(\S+)\s*→\s*(\S+)/i
 */
export function formatIacmForChat<T extends IacmMessageType>(msg: IacmMessage<T>): string {
  const { meta, data, narrative } = msg;
  const emoji = TYPE_EMOJI[meta.message_type];
  const header = `[${meta.message_type}] ${emoji} ${meta.from_agent} → ${meta.to_agent}`;
  const separator = "───────────────";

  // Extraer "subject line" según el tipo
  const subject = getSubjectLine(meta.message_type, data);

  // Líneas de metadata compactas
  const metaLines: string[] = [];
  if (meta.thread_id) metaLines.push(`thread: ${meta.thread_id}`);
  if (meta.reply_to) metaLines.push(`reply_to: ${meta.reply_to}`);
  if (metaLines.length === 0) metaLines.push(`id: ${meta.message_id}`);

  const parts = [
    header,
    subject ? `📋 ${subject}` : undefined,
    metaLines.join(" · "),
    separator,
    narrative,
  ].filter((l): l is string => l !== undefined);

  return parts.join("\n");
}

function getSubjectLine(type: IacmMessageType, data: unknown): string {
  const d = data as Record<string, unknown>;
  switch (type) {
    case "REQUEST":  return String(d.task ?? "");
    case "REPORT":   return String(d.subject ?? "");
    case "QUESTION": return String(d.question ?? "");
    case "ANSWER":   return String(d.answer ?? "").slice(0, 60);
    case "PROPOSAL": return String(d.title ?? "");
    case "ACKNOWLEDGE": return String(d.confirmation ?? "");
    case "ACCEPT":   return String(d.commitment ?? "");
    case "REJECT":   return String(d.rationale ?? "").slice(0, 60);
    case "DEFER":    return String(d.reason ?? "").slice(0, 60);
    case "FYI":      return String(d.subject ?? "");
    case "URGENT":   return String(d.issue ?? "");
    default:         return "";
  }
}

/**
 * Serializa a YAML (formato canónico IACM para archivos y logging).
 * No requiere dependencia externa — usa template literal.
 */
export function toIacmYaml<T extends IacmMessageType>(msg: IacmMessage<T>): string {
  const lines: string[] = [
    `format_version: ${msg.meta.format_version}`,
    `message_type: ${msg.meta.message_type}`,
    `from_agent: ${msg.meta.from_agent}`,
    `to_agent: ${msg.meta.to_agent}`,
    `timestamp: ${msg.meta.timestamp}`,
    `message_id: ${msg.meta.message_id}`,
  ];
  if (msg.meta.thread_id) lines.push(`thread_id: ${msg.meta.thread_id}`);
  if (msg.meta.reply_to) lines.push(`reply_to: ${msg.meta.reply_to}`);
  lines.push(`narrative: "${msg.narrative.replace(/"/g, '\\"')}"`);
  lines.push("data:");
  for (const [k, v] of Object.entries(msg.data as unknown as Record<string, unknown>)) {
    if (v === undefined) continue;
    if (typeof v === "string") {
      lines.push(`  ${k}: "${v.replace(/"/g, '\\"')}"`);
    } else if (Array.isArray(v)) {
      lines.push(`  ${k}:`);
      for (const item of v) {
        if (typeof item === "object" && item !== null) {
          lines.push(`    - ${JSON.stringify(item)}`);
        } else {
          lines.push(`    - ${item}`);
        }
      }
    } else {
      lines.push(`  ${k}: ${v}`);
    }
  }
  return lines.join("\n");
}
