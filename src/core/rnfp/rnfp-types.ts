/**
 * rnfp-types.ts — TypeScript types for the Retro-Native Federation Protocol (RNFP).
 *
 * RNFP defines 8 message types for peer-to-peer federation between Cyborg systems.
 * Messages travel as plain text (compatible with any transport, including Telegram groups).
 *
 * Ref: specs/19-cyborg-federation-protocol.md
 *      docs/UNIVERSAL_CYBORG_CONSTITUTION.md
 *      docs/architecture/adrs/ADR-490-ucc-rnfp-iacm-alignment.md
 */

// ─── Protocol version ────────────────────────────────────────────────────────

export const RNFP_VERSION = "RNFP/1.0" as const;

// ─── Message types ───────────────────────────────────────────────────────────

export type RnfpMessageType =
  | "CLC-FED-INVITE"
  | "CLC-FED-ACCEPT"
  | "CLC-FED-REJECT"
  | "CLC-FED-REVOKE"
  | "CLC-GRAPH-ANNOUNCE"
  | "CLC-GRAPH-REQUEST"
  | "CLC-GRAPH-PKG"
  | "CLC-UNKNOWN-MSG";

// ─── Federation lifecycle ─────────────────────────────────────────────────────

export type FederationStatus = "pending" | "active" | "suspended" | "revoked";
export type TrustLevel = "direct" | "transitive";

// ─── Core types (from cyborg_v1.py ontology, adapted to TS) ──────────────────

/**
 * Local identity of a Cyborg system.
 * Persisted in FederationStore.
 */
export interface CyborgIdentity {
  operator_name: string;
  /** SHA-256[:16] fingerprint of operator's public key (or mock hex string in CryptoProvider.mock) */
  fingerprint: string;
  /** ISO8601 */
  created_at: string;
  status: "active" | "inactive" | "suspended";
  /** Optional: display handle (e.g. Telegram @username) */
  handle?: string;
}

/**
 * Local representation of an external Cyborg peer.
 * Persisted in FederationStore.
 */
export interface FederationPeer {
  operator_id: string;
  fingerprint: string;
  federation_status: FederationStatus;
  /** ISO8601 */
  first_federated_at: string;
  /** ISO8601 */
  last_activity?: string;
  handle?: string;
  capabilities?: string[];
  /** ISO8601, present when federation_status === "revoked" */
  revoked_at?: string;
}

/**
 * Per-peer consent policy.
 * Persisted in FederationStore.
 */
export interface FederationPolicy {
  peer_id: string;
  can_share_event_types: string[];
  mode: "consent_required" | "informational" | "request_response";
  /** ISO8601 */
  created_at: string;
  /** ISO8601 */
  updated_at?: string;
}

/**
 * Immutable audit record of a federation sharing event.
 * NOTE: In this SDK, signing is delegated to CryptoProvider.
 */
export interface SharedEvent {
  source_peer_id: string;
  recipient_peer_id: string;
  /** ISO8601 */
  timestamp_shared: string;
  /** Signature string — real or mock depending on CryptoProvider */
  signature: string;
  event_type?: string;
  status: "pending" | "delivered" | "verified" | "rejected";
}

// ─── Ontology types (from cyborg_v1.py, Phases 1–2) ─────────────────────────

/**
 * Reified directional trust relation between two operators.
 * L1 Ground: Entity (UFO Endurant).
 * Phase: ADR-488 Phase 2.
 */
export interface TrustRelation {
  from_operator_id: string;
  to_operator_id: string;
  to_public_key: string;
  to_key_fingerprint: string;
  trust_level: TrustLevel;
  /** ISO8601 */
  established_at: string;
  verified_via: string;
  from_cyborg_node_id?: string;
  to_telegram_username?: string;
  notes?: string;
  revoked?: boolean;
  /** ISO8601, present when revoked === true */
  revoked_at?: string;
}

/**
 * Constitutive act performed by a Cyborg operator.
 * L1 Ground: Interaction (UFO Perdurant).
 * Phase: ADR-488 Phase 1.
 */
export interface IntraAction {
  action_type: "init" | "send" | "receive" | "auth" | "query";
  /** ISO8601 */
  timestamp: string;
  source: string;
  target: string;
  status: "pending" | "completed" | "failed";
  metadata?: Record<string, unknown>;
  participants?: string[];
  constitutive_dimension?: string;
  constitutive?: boolean;
  linked_cyborg_id?: string;
}

// ─── Crypto abstraction ──────────────────────────────────────────────────────

/**
 * CryptoProvider — abstraction layer for signing/verification.
 *
 * Implementations:
 *   MockCryptoProvider — always signs valid, always verifies true (for demos/tests).
 *   Ed25519CryptoProvider — real Ed25519 (requires @noble/ed25519, not included).
 */
export interface CryptoProvider {
  sign(payload: string): string;
  verify(payload: string, signature: string, fingerprint: string): boolean;
  generateFingerprint(): string;
}

export class MockCryptoProvider implements CryptoProvider {
  sign(payload: string): string {
    // Deterministic mock signature: sha-like hex of payload length + first chars
    const h = (payload.length * 7 + 31).toString(16).padStart(4, "0");
    return `mock-sig-${h}-${payload.slice(0, 8).replace(/\s/g, "_")}`;
  }
  verify(_payload: string, _signature: string, _fingerprint: string): boolean {
    return true; // mock: always valid
  }
  generateFingerprint(): string {
    const ts = Date.now().toString(16);
    const r = Math.random().toString(16).slice(2, 10);
    return `${ts}${r}`.slice(0, 16);
  }
}

// ─── Message meta (shared header) ────────────────────────────────────────────

export interface RnfpMeta {
  format_version: typeof RNFP_VERSION;
  message_type: RnfpMessageType;
  from_operator: string;
  /** Recipient operator id — may be "*" for broadcast announces */
  to_operator: string;
  /** ISO8601 */
  timestamp: string;
  message_id: string;
  fingerprint: string;
  signature: string;
  /** Optional: for replies to specific messages */
  reply_to?: string;
}

// ─── Message data shapes ──────────────────────────────────────────────────────

export interface RnfpInviteData {
  fingerprint: string;
  capabilities: string[];
  /** Human-readable reason for the federation proposal */
  proposal: string;
}

export interface RnfpAcceptData {
  fingerprint: string;
  capabilities: string[];
  /** Accept note */
  confirmation: string;
}

export interface RnfpRejectData {
  reason: string;
}

export interface RnfpRevokeData {
  reason: "OPERATOR_REVOKED" | "POLICY_VIOLATION" | "SESSION_ENDED" | string;
  /** Whether the sender requests the peer to also delete shared data (advisory only) */
  request_data_deletion?: boolean;
}

export interface RnfpAnnounceData {
  package_id: string;
  /** Number of nodes available in the package */
  node_count: number;
  /** Type hint for the content (e.g. "cyborg_session", "memory_fragment") */
  content_type?: string;
  description?: string;
}

export interface RnfpGraphRequestData {
  package_id: string;
  reason?: string;
}

export interface RnfpGraphPkgData {
  package_id: string;
  /** Inline content or a reference path — in this SDK, always inline text */
  payload: string;
  /** SHA-256 checksum of payload (mock: payload.length.toString(16)) */
  checksum: string;
  node_count: number;
}

export interface RnfpUnknownMsgData {
  unknown_type: string;
  raw_content?: string;
}

// ─── Data map (discriminated union helper) ───────────────────────────────────

export interface RnfpDataMap {
  "CLC-FED-INVITE":    RnfpInviteData;
  "CLC-FED-ACCEPT":    RnfpAcceptData;
  "CLC-FED-REJECT":    RnfpRejectData;
  "CLC-FED-REVOKE":    RnfpRevokeData;
  "CLC-GRAPH-ANNOUNCE": RnfpAnnounceData;
  "CLC-GRAPH-REQUEST": RnfpGraphRequestData;
  "CLC-GRAPH-PKG":     RnfpGraphPkgData;
  "CLC-UNKNOWN-MSG":   RnfpUnknownMsgData;
}

export interface RnfpMessage<T extends RnfpMessageType = RnfpMessageType> {
  meta: RnfpMeta;
  data: RnfpDataMap[T];
  narrative?: string;
}

export type AnyRnfpMessage = { [K in RnfpMessageType]: RnfpMessage<K> }[RnfpMessageType];

// ─── Federation session state ────────────────────────────────────────────────

/**
 * Session vars carried by FederationBotPlugin instances.
 * Extended from SessionVars.
 */
export interface RnfpSessionVars {
  /** Operator name of this bot's identity */
  cyborg_identity?: string;
  /** Fingerprint of this bot's identity */
  cyborg_fingerprint?: string;
  /**
   * Current federation state machine state.
   * idle          → no active federation flow
   * awaiting_accept → we sent INVITE, waiting for ACCEPT/REJECT
   * active        → federation established
   * pending_revoke → revocation signal sent/received, awaiting cleanup
   */
  fed_state: "idle" | "awaiting_accept" | "active" | "pending_revoke";
  /** operator_id of the peer we last interacted with */
  active_peer?: string;
  /** package_id of last announced/requested graph */
  pending_package_id?: string;
}
