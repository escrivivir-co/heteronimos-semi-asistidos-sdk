/**
 * iacm-types.ts — Tipos TypeScript del protocolo IACM v1.0.
 *
 * IACM (Inter-Agent Communication Message) define 11 tipos de mensaje
 * para comunicación estructurada entre agentes.
 *
 * Ref: protocols/IACM_FORMAT_SPECIFICATION.md
 */

// ─── Versión y tipos base ────────────────────────────────────────────────────

export const IACM_VERSION = "IACM/1.0" as const;

export type IacmMessageType =
  | "REQUEST"
  | "REPORT"
  | "QUESTION"
  | "ANSWER"
  | "PROPOSAL"
  | "ACKNOWLEDGE"
  | "ACCEPT"
  | "REJECT"
  | "DEFER"
  | "FYI"
  | "URGENT";

export type IacmPriority = "critical" | "high" | "medium" | "low";

// ─── Meta (común a todos los mensajes) ───────────────────────────────────────

export interface IacmMeta {
  format_version: typeof IACM_VERSION;
  message_type: IacmMessageType;
  from_agent: string;
  to_agent: string;
  /** ISO8601 UTC */
  timestamp: string;
  message_id: string;
  thread_id?: string;
  reply_to?: string;
}

// ─── Data shapes (type-specific) ─────────────────────────────────────────────

export interface IacmRequestData {
  task: string;
  context?: string;
  priority?: IacmPriority;
  deadline?: string;
  deliverables?: Array<{ deliverable: string; format?: string; location?: string }>;
  files_affected?: string[];
  estimated_effort_min?: number;
}

export interface IacmReportData {
  subject: string;
  report_type?: "completion" | "status" | "findings" | "analysis" | "incident";
  summary: string;
  findings?: string[];
  status?: "completed" | "in_progress" | "blocked" | "deferred" | "cancelled";
  deliverables_completed?: Array<{ deliverable: string; location?: string }>;
  next_steps?: Array<{ action: string; assignee?: string; priority?: IacmPriority }>;
}

export interface IacmQuestionData {
  question: string;
  context?: string;
  question_type?: "clarification" | "decision" | "information" | "validation" | "opinion";
  urgency?: IacmPriority;
  options?: Array<{ option: string; rationale?: string }>;
  deadline?: string;
  blocking?: boolean;
}

export interface IacmAnswerData {
  question_id: string;
  answer: string;
  answer_type?: "definitive" | "conditional" | "deferred" | "partial";
  confidence?: number;
  sources?: Array<{ source: string; type?: string; location?: string }>;
  recommendations?: string[];
}

export interface IacmProposalData {
  title: string;
  proposal_type?: "architecture" | "feature" | "process" | "policy" | "technical";
  summary: string;
  rationale: string;
  alternatives?: Array<{ option: string; pros?: string[]; cons?: string[] }>;
  decision_needed_by?: string;
  risks?: Array<{ risk: string; severity?: IacmPriority; mitigation?: string }>;
}

export interface IacmAcknowledgeData {
  acknowledged_message_id: string;
  confirmation: string;
  understood?: boolean;
  next_steps?: Array<{ step: string; eta?: string }>;
}

export interface IacmAcceptData {
  proposal_id: string;
  acceptance_type?: "unconditional" | "conditional" | "provisional";
  conditions?: string[];
  commitment: string;
  timeline?: { start_date?: string; target_completion?: string };
}

export interface IacmRejectData {
  proposal_id: string;
  rationale: string;
  concerns?: Array<{ concern: string; severity?: IacmPriority }>;
  alternative_suggested?: string;
  reconsideration_conditions?: string[];
}

export interface IacmDeferData {
  deferred_message_id: string;
  reason: string;
  missing_information?: Array<{ information: string; source?: string }>;
  revisit_date?: string;
}

export interface IacmFyiData {
  subject: string;
  information: string;
  relevance?: string;
  information_type?: "update" | "announcement" | "observation" | "insight" | "warning";
  action_required?: boolean;
  expiry_date?: string;
}

export interface IacmUrgentData {
  issue: string;
  severity: "critical" | "high" | "medium";
  urgency_reason: string;
  action_needed: string;
  action_needed_by: string;
  escalation_to?: string;
  blocking?: Array<{ blocked_entity: string; impact?: string }>;
}

// ─── Data map: type → shape ───────────────────────────────────────────────────

export interface IacmDataMap {
  REQUEST: IacmRequestData;
  REPORT: IacmReportData;
  QUESTION: IacmQuestionData;
  ANSWER: IacmAnswerData;
  PROPOSAL: IacmProposalData;
  ACKNOWLEDGE: IacmAcknowledgeData;
  ACCEPT: IacmAcceptData;
  REJECT: IacmRejectData;
  DEFER: IacmDeferData;
  FYI: IacmFyiData;
  URGENT: IacmUrgentData;
}

// ─── Mensaje completo (genérico sobre tipo) ───────────────────────────────────

export interface IacmMessage<T extends IacmMessageType = IacmMessageType> {
  meta: IacmMeta & { message_type: T };
  data: IacmDataMap[T];
  narrative: string;
  statistics?: Record<string, string | number>;
}

/** Unión discriminada de todos los mensajes. */
export type AnyIacmMessage = {
  [K in IacmMessageType]: IacmMessage<K>;
}[IacmMessageType];

// ─── Session vars para el AIML engine ─────────────────────────────────────────

export interface IacmSessionVars {
  agent_role?: string;
  active_thread_id?: string;
  last_sent_message_id?: string;
  last_received_message_id?: string;
  flow_state?: "idle" | "awaiting_response" | "awaiting_confirmation" | "processing";
  last_received_type?: IacmMessageType;
  interlocutor?: string;
}
