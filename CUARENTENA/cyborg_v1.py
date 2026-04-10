"""
Cyborg Ontology Plugin v1.3
============================

Namespace: cyborg/v1
Graph: cyborg_graph
Created: 2026-04-08
Last updated: 2026-04-08 (v1.3 — added Delegation, Escalation; user-authorized gate)
Author: Metamodel (Ontological Architect Agent)
Purpose: L2 type definitions for ADR-488/ADR-489 Cyborg Local Client (CLC)

Ontological Foundation:
- CyborgIdentity: L2 type grounded in L1 Collective_Agent (UFO Substantial Endurant)
  Emerges from constitutive coupling of human operator + AI system
- IntraAction: L2 type grounded in L1 Interaction (UFO Perdurant)
  Constitutive relation in the sense of Karen Barad (2007) — partially constitutes
  participant identities rather than merely connecting them
- TrustRelation: L2 type grounded in L1 Entity (UFO Substantial Endurant)
  Persistent social artifact representing directional trust between two CyborgIdentities,
  established via explicit key exchange. Persists until explicitly revoked.
  NOTE: L1 ground corrected from Interaction to Entity by Metamodel Gate (2026-04-08).
  TrustRelation is NOT a temporal event (Perdurant) — it is a persistent social
  commitment (Endurant) that exists between two agents over time.
- FederationPeer: L2 type grounded in L1 Agent (UFO Substantial Endurant)
  Local representation of an external Cyborg unit with which direct federation has
  been established. NOT a Collective_Agent (that applies to CyborgIdentity self-model).
  A FederationPeer is how CLC-A models CLC-B as an external actor.
  NOTE: L1 ground corrected from Collective_Agent to Agent by Metamodel Gate (2026-04-08).
- FederationPolicy: L2 type grounded in L1 Pattern (UFO Abstract.NormativeObject)
  Normative object specifying consent rules for federated data sharing per peer.
  Operator-controlled access control declaration.
- SharedEvent: L2 type grounded in L1 Interaction (UFO Perdurant)
  Immutable audit record of a federated data exchange between two Cyborg units.
  Models the act of sharing (provenance), not the shared content.
  NOTE: Modeled as node type (not HyperEdge) for queryability and rich properties.

References:
- ADR-488: Cyborg Local Client Architecture
- ADR-489: Protocolo de Federación Directa para CLC Fase 3
- SPEC_CLC_FASE2_CRYPTOGRAPHIC_IDENTITY_2026-04-08.md (Architect)
- CYBORG_FEDERATED_COMMUNICATION_ARCHITECTURE_v1.0.md
- Metamodel ANSWER_cyborg_ontological_questions_Architect_2026-04-07.md
- Philosopher: CYBORG_CONSTITUTIONAL_VALIDATION_2026-04-07.md (Gate 7.75/10)
- Cyborg Principle v2 (Philosopher, 2026-04-02)

L1 Ontological Grounding:
  L1 Collective_Agent
    └── L2 CyborgIdentity [cyborg_graph]
          ├── operator_component: L1 Individual_Agent (human)
          ├── system_component: L1 Artificial_Agent (Retro/LLM)
          └── linked via: L2 IntraAction (constitutive)

  L1 Agent (SocialEntity.Agent)
    └── L2 FederationPeer [cyborg_graph]
          ├── external reference (models external Cyborg as actor)
          ├── cryptographic identity: public_key_fingerprint
          └── lifecycle: pending → active → suspended/revoked

  L1 Interaction (Perdurant)
    ├── L2 IntraAction [cyborg_graph]
    │     ├── constitutive semantic flag: true
    │     └── partially constitutes participant identities
    └── L2 SharedEvent [cyborg_graph]
          ├── immutable provenance record (WORM)
          └── documents the act of sharing (not the content)

  L1 Entity (Substantial Endurant)
    └── L2 TrustRelation [cyborg_graph]
          ├── directional: from_operator → to_operator
          ├── trust_level: "direct" (Fase 2), extensible to "transitive" (Fase 3)
          └── lifecycle: active → revoked (soft-delete)

  L1 Pattern (Abstract.NormativeObject)
    └── L2 FederationPolicy [cyborg_graph]
          ├── per-peer consent declaration
          ├── mode: consent_required|informational|request_response
          └── operator-controlled access control

Separation Axioms (all respected):
- AXIOM_2_LEVEL_PURITY: No L3 technology details at L2 level ✅
  (Note: verified_via="telegram_dm" is domain-specific coupling, accepted for cyborg_graph)
- AXIOM_3_SEMANTIC_PRESERVATION: ≥95% semantic preservation from proposals ✅
- AXIOM_4_CATEGORICAL_COHERENCE: All types map to UFO L1 categories ✅

Changelog:
- v1.0 (2026-04-08): CyborgIdentity + IntraAction (ADR-488 Fase 1)
- v1.1 (2026-04-08): TrustRelation added (ADR-488 Fase 2, Gate ACCEPT by Metamodel)
                     L1 ground corrected: Interaction → Entity (ontological coherence)
- v1.2 (2026-04-08): FederationPeer, FederationPolicy, SharedEvent added (ADR-489 Fase 3)
                     Gate Ontológico ADR-489 ACCEPT by Metamodel (ADR-453 Tipo E)
                     L1 ground correction: FederationPeer Collective_Agent → Agent
                     Structural correction: SHARED_EVENT HyperEdge → SharedEvent node type
- v1.3 (2026-04-08): Delegation, Escalation added (governance/audit tracking layer)
                     User-authorized gate (direct principal authorization, 2026-04-08)
                     Delegation: explicit bounded authority grant (L1: Pattern/NormativeObject)
                     Escalation: agent-to-principal communication event (L1: Interaction)
"""

import sys
from pathlib import Path

# Add HyperGraph to path
HYPERGRAPH_ROOT = Path(__file__).parent.parent.parent.parent / "Retro" / "HyperGraph"
sys.path.insert(0, str(HYPERGRAPH_ROOT))

try:
    from HyperGraph.domain.types.enums import FoundationalType
except ImportError:
    # Fallback if HyperGraph not directly importable
    class FoundationalType:
        SUBSTANTIAL = type('obj', (object,), {'value': 'substantial'})()
        PERDURANT = type('obj', (object,), {'value': 'perdurant'})()

# ============================================================================
# PLUGIN METADATA
# ============================================================================

PLUGIN_METADATA = {
    "name": "Cyborg Ontology v1.3",
    "namespace": "cyborg/v1",
    "version": "1.3.0",
    "author": "Metamodel (Ontological Architect)",
    "description": (
        "L2 type definitions for Cyborg Local Client (CLC) — ADR-488 + ADR-489. "
        "Covers Fase 1 (identity), Fase 2 (trust), Fase 3 (federation)."
    ),
    "created": "2026-04-08",
    "last_updated": "2026-04-08",
    "graph_id": "cyborg_graph",
    "adr_reference": "ADR-488, ADR-489, UNIVERSAL_CYBORG_CONSTITUTION",
    "constitutional_reference": "Cyborg Principle v2 (Philosopher, 2026-04-02)",
    "philosopher_gate": "7.75/10 (ADR-489 Fase 3)",
    "license": "MIT",
    "types": [
        "CyborgIdentity", "IntraAction", "TrustRelation",
        "FederationPeer", "FederationPolicy", "SharedEvent",
        "Delegation", "Escalation",
    ],
    "changelog": [
        {
            "version": "1.0.0",
            "date": "2026-04-08",
            "change": "Initial: CyborgIdentity + IntraAction (ADR-488 Fase 1)"
        },
        {
            "version": "1.1.0",
            "date": "2026-04-08",
            "change": (
                "Added TrustRelation (ADR-488 Fase 2). "
                "L1 ground corrected: Interaction → Entity (categorical coherence). "
                "Gate Ontológico ACCEPT by Metamodel (ADR-453 Tipo E)."
            )
        },
        {
            "version": "1.2.0",
            "date": "2026-04-08",
            "change": (
                "Added FederationPeer, FederationPolicy, SharedEvent (ADR-489 Fase 3). "
                "Gate Ontológico ADR-489 ACCEPT by Metamodel (ADR-453 Tipo E). "
                "Corrections: FederationPeer Collective_Agent→Agent; "
                "SHARED_EVENT HyperEdge→SharedEvent node type (reification)."
            )
        }
    ]
}

# ============================================================================
# L2 TYPE DEFINITIONS
# ============================================================================

CYBORG_TYPES = {

    # =========================================================================
    # L2 TYPE: CyborgIdentity
    # L1 Ground: Collective_Agent (UFO Substantial Endurant)
    # =========================================================================
    "CyborgIdentity": {
        "foundational_type": FoundationalType.SUBSTANTIAL,
        "l1_ground": "Collective_Agent",
        "description": (
            "Hybrid human-AI system constituting a single agentive unit with "
            "unified accountability and local memory. Emerges from constitutive "
            "coupling of human operator (Individual_Agent) and AI system "
            "(Artificial_Agent). Grounded in ADR-488 and Cyborg Principle v2."
        ),
        # MVP required properties (Orchestrator T5 spec, 2026-04-08)
        "required": [
            "operator_name",       # Human-readable operator name
            "telegram_phone_hash", # Privacy-preserving Telegram account hash
            "init_timestamp",      # ISO8601 first CLC use
            "cyborg_version",      # CLC protocol version
            "status",              # "active" | "inactive" | "suspended"
        ],
        "properties": {
            # === MVP REQUIRED (Orchestrator spec) ===
            "operator_name": {
                "type": "string",
                "description": "Human-readable name of the CLC operator (e.g., 'Dídac')"
            },
            "telegram_phone_hash": {
                "type": "string",
                "description": "Privacy-preserving hash of Telegram account phone number"
            },
            "init_timestamp": {
                "type": "timestamp",
                "description": "ISO8601 timestamp of first CLC use (initialization)"
            },
            "cyborg_version": {
                "type": "string",
                "description": "CLC protocol/software version (e.g., '1.0.0-alpha')"
            },
            "status": {
                "type": "enum",
                "values": ["active", "inactive", "suspended"],
                "description": "Operational status of this CLC identity"
            },
            # === ONTOLOGICAL CORE (ADR-488 / Architect review) ===
            "operator_id": {
                "type": "string",
                "description": "Unique identifier of the human component (email/ID)"
            },
            "system_component": {
                "type": "string",
                "description": "Reference to AI/tool system (e.g., 'Retro/LLM')"
            },
            "identity_mode": {
                "type": "string",
                "description": "How identity is constituted: 'constitutive'"
            },
            # === PHASE 2 ===
            "public_key": {
                "type": "string",
                "description": "Ed25519 PEM-encoded public key for Phase 2"
            },
            "hypergraph_db_path": {
                "type": "string",
                "description": "Local HyperGraph database path/URI"
            },
        },
        "relations": {
            "PERFORMED": "CyborgIdentity PERFORMED IntraAction (constitutive acts)"
        },
        "accountability": "Concentrated in the Cyborg as unit",
        "phase": "ADR-488 Phase 1 (MVP)"
    },

    # =========================================================================
    # L2 TYPE: IntraAction
    # L1 Ground: Interaction (UFO Perdurant — Temporal Event)
    # =========================================================================
    "IntraAction": {
        "foundational_type": FoundationalType.PERDURANT,
        "l1_ground": "Interaction",
        "description": (
            "Constitutive relation between participants whose identities are partially "
            "produced by this relation (Barad 2007). Subtype of L1 Interaction/Perdurant. "
            "Temporal relation with identity constitution semantics."
        ),
        # MVP required properties (Orchestrator T5 spec, 2026-04-08)
        "required": [
            "action_type",  # "init" | "send" | "receive" | "auth" | "query"
            "timestamp",    # ISO8601 onset of action/relation
            "source",       # Agent/CLC that initiated the action
            "target",       # Destination (chat_id, agent, etc.)
            "status",       # "pending" | "completed" | "failed"
        ],
        "properties": {
            # === MVP REQUIRED (Orchestrator spec) ===
            "action_type": {
                "type": "enum",
                "values": ["init", "send", "receive", "auth", "query"],
                "description": "Type of CLC action being performed"
            },
            "timestamp": {
                "type": "timestamp",
                "description": "ISO8601 onset of the action/relation (UTC)"
            },
            "source": {
                "type": "string",
                "description": "Agent or CLC that initiated this action"
            },
            "target": {
                "type": "string",
                "description": "Destination of the action (chat_id, agent name, etc.)"
            },
            "status": {
                "type": "enum",
                "values": ["pending", "completed", "failed"],
                "description": "Lifecycle status of this action"
            },
            "metadata": {
                "type": "string",
                "description": "Optional JSON string with additional action metadata"
            },
            # === ONTOLOGICAL CORE (ADR-488 / Architect review) ===
            "participants": {
                "type": "array",
                "description": "List of node_ids of participants (min 2) — ontological core"
            },
            "constitutive_dimension": {
                "type": "string",
                "description": "Which aspects of participant identity are constituted"
            },
            "constitutive": {
                "type": "boolean",
                "description": "Semantic flag: True if constitutive relation (always True for IntraAction)"
            },
            "linked_cyborg_id": {
                "type": "string",
                "description": "Reference to the CyborgIdentity that performed this action"
            },
        },
        "semantic_flags": {
            "constitutive": True
        },
        "barad_reference": "Karen Barad, Meeting the Universe Halfway (2007)",
        "phase": "ADR-488 Phase 1 (MVP)"
    },

    # =========================================================================
    # L2 TYPE: TrustRelation
    # L1 Ground: Entity (UFO Substantial Endurant)
    # Phase: ADR-488 Fase 2
    # =========================================================================
    # ONTOLOGICAL RATIONALE:
    #   TrustRelation is a PERSISTENT SOCIAL ARTIFACT — it exists between two
    #   CyborgIdentities over time and can be revoked (state transition). It is
    #   NOT a temporal event (Perdurant/Interaction).
    #
    #   Architect's original proposal used l1_ground=Interaction. This was
    #   corrected by Metamodel Gate (ADR-453 Tipo E, 2026-04-08):
    #     - Interaction/Perdurant = "something that HAPPENS" (event, finite)
    #     - Entity/Endurant = "something that EXISTS and PERSISTS" (state, ongoing)
    #   Evidence: TrustRelation has revoked:bool, revoked_at, is queryable via
    #   is_trusted(), list_trusted_peers() — all indicating persistent state.
    #   Grounding in Perdurant would violate AXIOM_4_CATEGORICAL_COHERENCE.
    #
    # Gate approval: Metamodel, 2026-04-08
    # Thread: adr488_cyborg_local_client
    # =========================================================================
    "TrustRelation": {
        "foundational_type": FoundationalType.SUBSTANTIAL,
        "l1_ground": "Entity",            # Substantial Endurant — NOT Interaction
        "description": (
            "Persistent directional trust established between two CyborgIdentities "
            "via explicit cryptographic key exchange. A social artifact (Endurant) "
            "that exists from establishment until revocation. Captures who trusts whom, "
            "with what key, via what verification method, and whether that trust is "
            "still active. Enables mutual authentication in CLC federation (ADR-488)."
        ),
        "required": [
            "from_operator_id",       # Operator granting trust
            "to_operator_id",         # Operator being trusted
            "to_public_key",          # Ed25519 public key (base64url)
            "to_key_fingerprint",     # SHA-256[:32] fingerprint (32 hex chars)
            "trust_level",            # "direct" (Fase 2); extensible to "transitive" (Fase 3)
            "established_at",         # ISO-8601 timestamp of trust establishment
            "verified_via",           # Verification channel: "telegram_dm" (Fase 2)
        ],
        "properties": {
            # === REQUIRED ===
            "from_operator_id": {
                "type": "string",
                "description": "Operator ID of the trust grantor (the one who trusts)"
            },
            "to_operator_id": {
                "type": "string",
                "description": "Operator ID of the trusted party"
            },
            "to_public_key": {
                "type": "string",
                "description": "Ed25519 public key of the trusted party (base64url encoding)"
            },
            "to_key_fingerprint": {
                "type": "string",
                "description": (
                    "SHA-256 fingerprint of the trusted party's public key, "
                    "first 32 hex chars (SHA-256[:32]). "
                    "Used for fast lookup during signature verification."
                )
            },
            "trust_level": {
                "type": "enum",
                "values": ["direct", "transitive"],
                "description": (
                    "Scope of trust: 'direct' = explicit key exchange (Fase 2 only). "
                    "'transitive' = trust-of-trust, reserved for Fase 3."
                )
            },
            "established_at": {
                "type": "timestamp",
                "description": "ISO-8601 timestamp when trust was established (UTC)"
            },
            "verified_via": {
                "type": "string",
                "description": (
                    "Out-of-band verification channel used to establish trust. "
                    "Fase 2 value: 'telegram_dm'. Reserved for future extension."
                )
            },
            # === OPTIONAL ===
            "from_cyborg_node_id": {
                "type": "string",
                "description": "HyperGraph node_id of the grantor's CyborgIdentity"
            },
            "to_telegram_username": {
                "type": "string",
                "description": "Telegram username of the trusted party (for correlation)"
            },
            "notes": {
                "type": "string",
                "description": "Free-text operator notes about this trust relationship"
            },
            "revoked": {
                "type": "boolean",
                "description": "Soft-delete flag: True if trust has been revoked. Default: False"
            },
            "revoked_at": {
                "type": "timestamp",
                "description": "ISO-8601 timestamp of revocation (present only if revoked=True)"
            },
        },
        "lifecycle": {
            "states": ["active", "revoked"],
            "transitions": {
                "active → revoked": "revoke_trust() sets revoked=True, revoked_at=now"
            },
            "description": "TrustRelation persists until explicitly revoked. Revocation is soft-delete (audit trail preserved)."
        },
        "semantic_flags": {
            "directional": True,     # from_operator trusts to_operator (not symmetric)
            "revocable": True,        # Human Sovereignty — operator can always revoke
            "auditable": True,        # Soft-delete preserves full history
        },
        "relations": {
            "TRUSTS": "CyborgIdentity (from) TRUSTS CyborgIdentity (to) via TrustRelation"
        },
        "phase": "ADR-488 Phase 2 (Cryptographic Identity)",
        "gate_approval": {
            "approved_by": "Metamodel",
            "date": "2026-04-08",
            "thread_id": "adr488_cyborg_local_client",
            "l1_ground_correction": "Interaction → Entity (categorical coherence)",
            "adr_reference": "ADR-453 (Gate Tipo E)"
        }
    },

    # =========================================================================
    # L2 TYPE: FederationPeer
    # L1 Ground: Agent (UFO SocialEntity.Agent — Substantial Endurant)
    # Phase: ADR-489 Fase 3
    # =========================================================================
    # ONTOLOGICAL RATIONALE:
    #   FederationPeer models an EXTERNAL Cyborg unit as seen from CLC-A.
    #   It is NOT a Collective_Agent (despite the original REQUEST saying so).
    #
    #   Key distinction:
    #   - CyborgIdentity = Collective_Agent: CLC-A models ITSELF as a
    #     human+AI collective (constitutive identity, Barad). Self-reference.
    #   - FederationPeer = Agent: CLC-A models CLC-B as an external actor.
    #     We model the peer's agentive capacity, not internal constitution.
    #
    #   UFO: Agent (SocialEntity.Agent) = entity with intentional action, goals,
    #   and accountability. A FederationPeer has: cryptographic identity (key),
    #   federation status (capability), declared capabilities (agency), operator
    #   accountability. All are properties of an Agent, not a Collective.
    #
    #   Evidence: public_key_fingerprint identifies a singular actor;
    #   federation_status tracks their relational capacity; capabilities
    #   declares what THIS peer can do.
    #
    #   Gate Ontológico ACCEPT: Metamodel, 2026-04-08
    #   L1 ground corrected: Collective_Agent → Agent (categorical coherence)
    #   Thread: adr-489-gates
    # =========================================================================
    "FederationPeer": {
        "foundational_type": FoundationalType.SUBSTANTIAL,
        "l1_ground": "Agent",         # UFO: SocialEntity.Agent — CORRECTED from Collective_Agent
        "description": (
            "Local representation of an external Cyborg unit with which direct "
            "federation has been established. Records the peer's cryptographic "
            "identity (Ed25519 key fingerprint), federation status, declared "
            "capabilities, and relationship metadata. "
            "NOT the internal constitution of the peer Cyborg (that is their "
            "own CyborgIdentity) — FederationPeer is how CLC-A models CLC-B "
            "as a federation actor from the outside. "
            "Grounded in Agent (SocialEntity.Agent) per Metamodel Gate ADR-489."
        ),
        "required": [
            "public_key_fingerprint",  # Ed25519 SHA-256[:32] fingerprint (32 hex chars)
            "federation_status",       # pending|active|suspended|revoked
            "first_federated_at",      # ISO-8601 timestamp of federation establishment
        ],
        "properties": {
            # === REQUIRED ===
            "public_key_fingerprint": {
                "type": "string",
                "description": (
                    "Ed25519 public key fingerprint (SHA-256[:32], 32 hex chars). "
                    "Primary cryptographic identifier for this peer. Immutable."
                )
            },
            "federation_status": {
                "type": "enum",
                "values": ["pending", "active", "suspended", "revoked"],
                "description": (
                    "Lifecycle status of this federation relationship. "
                    "pending: invite sent, waiting for acceptance. "
                    "active: federation established and operational. "
                    "suspended: temporarily paused by operator. "
                    "revoked: federation terminated (soft-delete, auditable)."
                )
            },
            "first_federated_at": {
                "type": "timestamp",
                "description": "ISO-8601 UTC timestamp when federation was first established."
            },
            # === OPTIONAL ===
            "operator_id": {
                "type": "string",
                "description": "Human-readable peer operator identifier (e.g. 'alice')"
            },
            "telegram_username": {
                "type": "string",
                "description": (
                    "Telegram handle for peer correlation (privacy-sensitive). "
                    "Optional — used for transport lookup, not as primary identity."
                )
            },
            "capabilities": {
                "type": "array",
                "description": (
                    "Declared capabilities of this peer CLC. "
                    "E.g. ['graph_share', 'signed_messages']."
                )
            },
            "last_federated_activity": {
                "type": "timestamp",
                "description": "ISO-8601 UTC timestamp of most recent successful federation exchange."
            },
            "trust_relation_node_id": {
                "type": "string",
                "description": (
                    "FK → TrustRelation L2 node if this peer has a Phase 2 trust relationship. "
                    "Optional: federation (Phase 3) can exist without trust (Phase 2)."
                )
            },
            "notes": {
                "type": "string",
                "description": "Operator free-text notes about this peer (unstructured)."
            },
            "revoked_at": {
                "type": "timestamp",
                "description": "ISO-8601 UTC timestamp of revocation (if federation_status=revoked)."
            },
        },
        "lifecycle": {
            "states": ["pending", "active", "suspended", "revoked"],
            "transitions": {
                "pending → active": "CLC-FED-ACCEPT received and confirmed by operator",
                "active → suspended": "Operator manual suspension",
                "suspended → active": "Operator manual re-activation",
                "active → revoked": "CLC-FED-REVOKE received OR operator explicit revocation",
                "suspended → revoked": "Operator explicit revocation while suspended",
            },
            "note": "Revocation is soft-delete — FederationPeer node preserved for audit trail."
        },
        "semantic_flags": {
            "external_reference": True,  # Models external peer, NOT internal self
            "revocable": True,            # Human Sovereignty
            "auditable": True,
            "directional": False,         # Federation is bilateral (mutual consent)
        },
        "relations": {
            "FEDERATES_WITH": "CyborgIdentity → FederationPeer (N:M, bilateral)",
            "HAS_POLICY": "FederationPeer → FederationPolicy (1:N, per-peer policies)",
            "RECEIVED": "FederationPeer → SharedEvent (events received from this peer)"
        },
        "accountability": "Operator who issued or accepted the federation invite",
        "phase": "ADR-489 Phase 3 (Federation Protocol)",
        "gate_approval": {
            "approved_by": "Metamodel",
            "date": "2026-04-08",
            "thread_id": "adr-489-gates",
            "l1_ground_correction": "Collective_Agent → Agent (FederationPeer is external actor reference)",
            "adr_reference": "ADR-453 (Gate Tipo E), ADR-489"
        }
    },

    # =========================================================================
    # L2 TYPE: FederationPolicy
    # L1 Ground: Pattern (UFO Abstract.NormativeObject)
    # Phase: ADR-489 Fase 3
    # =========================================================================
    # ONTOLOGICAL RATIONALE:
    #   FederationPolicy is a normative object — a rule or consent declaration
    #   that governs what data CLC-A is willing to share with a specific peer.
    #
    #   UFO: NormativeObject (Abstract type) = "something that has normative force
    #   and guides action/interpretation without being spatio-temporal itself."
    #   The embryonic Pattern L1 type maps to ufo:Abstract.NormativeObject:
    #   "A regularity, rule, preference, or reusable structure that guides behavior."
    #
    #   FederationPolicy guides what CLC-A shares with CLC-B — it is the consent
    #   encoding mechanism. Operator-controlled (Human Sovereignty principle).
    #   One policy per peer relationship.
    #
    #   Gate Ontológico ACCEPT: Metamodel, 2026-04-08
    #   Thread: adr-489-gates
    # =========================================================================
    "FederationPolicy": {
        "foundational_type": FoundationalType.SUBSTANTIAL,
        "l1_ground": "Pattern",       # UFO: Abstract.NormativeObject
        "description": (
            "Normative object specifying what types of events CLC-A is willing "
            "to share with or receive from a specific FederationPeer. Encodes "
            "operator consent for federated data sharing. Per-peer: one "
            "FederationPolicy governs one FederationPeer relationship. "
            "Operator-controlled (Human Sovereignty). Aligned with ADR-489 "
            "consent model and Philosopher constitutional requirements."
        ),
        "required": [
            "peer_id",                 # UUID of the peer this policy applies to
            "can_share_event_types",   # ["*"] | ["Message", "Document"] | []
            "mode",                    # consent_required|informational|request_response
            "created_at",              # ISO-8601 timestamp
        ],
        "properties": {
            # === REQUIRED ===
            "peer_id": {
                "type": "string",
                "description": (
                    "UUID or fingerprint of the FederationPeer this policy governs. "
                    "FK → FederationPeer node."
                )
            },
            "can_share_event_types": {
                "type": "array",
                "description": (
                    "Event types CLC-A consents to share with this peer. "
                    "['*'] = all types allowed. [] = nothing allowed. "
                    "Examples: ['Message', 'Document', 'Decision']"
                )
            },
            "mode": {
                "type": "enum",
                "values": ["consent_required", "informational", "request_response"],
                "description": (
                    "How sharing interactions with this peer are handled. "
                    "consent_required: operator must approve each share (default, safest). "
                    "informational: auto-accept announces, operator reviews content. "
                    "request_response: structured request/approval flow."
                )
            },
            "created_at": {
                "type": "timestamp",
                "description": "ISO-8601 UTC timestamp when policy was created."
            },
            # === OPTIONAL ===
            "conditions": {
                "type": "array",
                "description": (
                    "Additional conditions on sharing. "
                    "E.g. ['operator_approval_required', 'read_only', 'no_persistence']."
                )
            },
            "expiry_date": {
                "type": "timestamp",
                "description": "ISO-8601 UTC when this policy expires. null = never expires."
            },
            "updated_at": {
                "type": "timestamp",
                "description": "ISO-8601 UTC timestamp of last policy modification."
            },
        },
        "lifecycle": {
            "states": ["active", "expired", "revoked"],
            "transitions": {
                "active → expired": "expiry_date reached (time-based)",
                "active → revoked": "Operator explicit revocation",
            },
            "note": "Policy can be modified (updated_at tracks changes) — not WORM unlike SharedEvent."
        },
        "semantic_flags": {
            "per_peer": True,             # One policy per federation peer relationship
            "operator_controlled": True,   # Human Sovereignty — only operator can modify
            "consent_encoding": True,      # Encodes explicit consent for data sharing
        },
        "relations": {
            "GOVERNS": "FederationPolicy → FederationPeer (policy governs this peer relationship)"
        },
        "accountability": "Operator who created or last modified this policy",
        "phase": "ADR-489 Phase 3 (Federation Protocol)",
        "gate_approval": {
            "approved_by": "Metamodel",
            "date": "2026-04-08",
            "thread_id": "adr-489-gates",
            "adr_reference": "ADR-453 (Gate Tipo E), ADR-489"
        }
    },

    # =========================================================================
    # L2 TYPE: SharedEvent
    # L1 Ground: Interaction (UFO Perdurant — Temporal Event)
    # Phase: ADR-489 Fase 3
    # =========================================================================
    # ONTOLOGICAL RATIONALE:
    #   A SharedEvent is a temporal occurrence — the act of federated data exchange
    #   between two Cyborg units. It has a definite temporal extent (shared_at,
    #   received_at) and cannot exist outside time.
    #
    #   UFO: Perdurant = "something that happens in time, has a beginning and
    #   potentially an end." The embryonic Interaction L1 type captures this:
    #   ∀i∈Interaction: ∃t₁,t₂: temporal_extent(i) = [t₁, t₂].
    #
    #   ARCHITECTURAL DECISION: Node type (not HyperEdge).
    #   The original REQUEST described this as "HyperEdge type" but SharedEvent
    #   has 8+ queryable properties (timestamps, status, signature, etc.) that
    #   cannot be carried by a simple edge label in the current HyperGraph system.
    #   Pattern: consistent with TrustRelation (also a reified relation-as-node).
    #   This enables: adapter.query_by_type("SharedEvent") ✅
    #
    #   PHILOSOPHER ALIGNMENT (R3, Gate 7.75/10):
    #   "SharedEvents son entidades relacionales situadas en este HyperEdge —
    #   no copias locales ni referencias remotas. La propiedad ontológica del nodo
    #   importado en CLC-B es de B (conocimiento situado), pero la relación de
    #   provenance persiste en la HyperEdge SHARED_EVENT."
    #   → The node-type models the provenance relation; content nodes (belonging
    #   to CLC-B) are separate. SharedEvent ≠ the shared content.
    #
    #   WORM: SharedEvent is immutable once created (no state changes after
    #   verified/rejected). Audit trail integrity.
    #
    #   Gate Ontológico ACCEPT: Metamodel, 2026-04-08
    #   Structural correction: HyperEdge type → L2 node type (reification pattern)
    #   Thread: adr-489-gates
    # =========================================================================
    "SharedEvent": {
        "foundational_type": FoundationalType.PERDURANT,
        "l1_ground": "Interaction",   # UFO: Perdurant — temporal sharing event
        "description": (
            "Immutable audit record of a federated data exchange between two Cyborg "
            "units. Captures provenance: who shared what, when, with whom, with what "
            "cryptographic signature. Models the ACT of sharing (provenance relation), "
            "NOT the shared content (content belongs to the importing CLC). "
            "Write-once (WORM) after creation — full audit trail integrity. "
            "Consistent with Philosopher R3 requirement: 'relational locus of provenance'."
        ),
        "required": [
            "source_event_id",         # UUID of original event in source CLC
            "source_peer_id",          # UUID/fingerprint of sending CLC
            "recipient_peer_id",       # UUID/fingerprint of receiving CLC
            "timestamp_shared",        # ISO-8601 UTC timestamp of exchange
            "signature",               # Ed25519 signature from source (hex-encoded)
        ],
        "properties": {
            # === REQUIRED ===
            "source_event_id": {
                "type": "string",
                "description": "UUID of the original event in the source CLC's HyperGraph."
            },
            "source_peer_id": {
                "type": "string",
                "description": "UUID or fingerprint of the CLC that shared the event (sender)."
            },
            "recipient_peer_id": {
                "type": "string",
                "description": "UUID or fingerprint of the CLC that received the event."
            },
            "timestamp_shared": {
                "type": "timestamp",
                "description": "ISO-8601 UTC timestamp when sharing was initiated."
            },
            "signature": {
                "type": "string",
                "description": (
                    "Ed25519 signature from the source CLC (hex-encoded, 128 chars). "
                    "Covers the canonical JSON of the sharing payload."
                )
            },
            # === OPTIONAL ===
            "subject_node_id": {
                "type": "string",
                "description": "HyperGraph node_id of the event being shared (local copy in recipient's graph)."
            },
            "event_type": {
                "type": "string",
                "description": "Type of the shared event content (e.g. 'Message', 'Document', 'Decision')."
            },
            "status": {
                "type": "enum",
                "values": ["pending", "delivered", "verified", "rejected"],
                "description": (
                    "Delivery status of this sharing event. "
                    "pending: sent, awaiting acknowledgement. "
                    "delivered: recipient CLC acknowledged. "
                    "verified: Ed25519 signature verified by recipient. "
                    "rejected: signature invalid OR operator declined import."
                )
            },
            "rejection_reason": {
                "type": "string",
                "description": "Machine-readable rejection reason (if status=rejected)."
            },
            "timestamp_received": {
                "type": "timestamp",
                "description": "ISO-8601 UTC when recipient confirmed receipt."
            },
            "reason": {
                "type": "string",
                "description": "Human-readable reason for sharing (operator-provided)."
            },
            "package_id": {
                "type": "string",
                "description": (
                    "UUID of the [CLC-GRAPH-PKG-v1] package (if sharing via graph package protocol). "
                    "Optional: may be absent for direct SignedEvent sharing."
                )
            },
        },
        "lifecycle": {
            "states": ["pending", "delivered", "verified", "rejected"],
            "transitions": {
                "pending → delivered": "Recipient CLC acknowledged receipt",
                "delivered → verified": "Ed25519 signature validated by recipient",
                "delivered → rejected": "Signature invalid OR operator declined",
            },
            "note": (
                "SharedEvent is WORM after creation. "
                "No state transitions after verified or rejected — immutable audit trail."
            )
        },
        "semantic_flags": {
            "immutable": True,          # WORM — audit trail integrity
            "provenance": True,         # Documents the ACT of sharing, not the content
            "bilateral": True,          # Records both sender and receiver perspectives
            "reified_relation": True,   # Edge-as-node (reification pattern, consistent with TrustRelation)
        },
        "relations": {
            "SHARED_WITH": "CyborgIdentity → SharedEvent (sender perspective, 1:N)",
            "RECEIVED_BY": "SharedEvent → FederationPeer (receiver perspective, N:1)",
            "ORIGINATED_FROM": "SharedEvent → FederationPeer (provenance source, N:1)",
        },
        "philosopher_alignment": (
            "Consistent with R3 (Philosopher Gate 7.75/10): SharedEvent models "
            "the provenance relation, not a content copy. Content nodes imported "
            "by CLC-B carry disclosure_policy='federated' and belong to CLC-B. "
            "SharedEvent records THAT the sharing happened and WHO authorized it."
        ),
        "phase": "ADR-489 Phase 3 (Federation Protocol)",
        "gate_approval": {
            "approved_by": "Metamodel",
            "date": "2026-04-08",
            "thread_id": "adr-489-gates",
            "structural_correction": "HyperEdge type → L2 node type (reification pattern for queryability)",
            "adr_reference": "ADR-453 (Gate Tipo E), ADR-489"
        }
    }
}

# ============================================================================
# EDGE TYPE DEFINITIONS
# ============================================================================

CYBORG_EDGE_TYPES = {
    # ---- Phase 1 edges ----
    "PERFORMED": {
        "description": "CyborgIdentity PERFORMED IntraAction — constitutive act",
        "source_types": ["CyborgIdentity"],
        "target_types": ["IntraAction"],
        "cardinality": "1:N",
        "inverse": "PERFORMED_BY",
        "phase": "ADR-488 Fase 1"
    },
    # ---- Phase 2 edges ----
    "TRUSTS": {
        "description": "CyborgIdentity (from) TRUSTS CyborgIdentity (to) — directional trust",
        "source_types": ["CyborgIdentity"],
        "target_types": ["CyborgIdentity"],
        "via_type": "TrustRelation",     # Edge reified as TrustRelation node
        "cardinality": "N:M",
        "directional": True,
        "note": "Trust is asymmetric: A TRUSTS B does not imply B TRUSTS A",
        "phase": "ADR-488 Fase 2"
    },
    # ---- Phase 3 edges (ADR-489) ----
    "FEDERATES_WITH": {
        "description": "CyborgIdentity has established federation with FederationPeer",
        "source_types": ["CyborgIdentity"],
        "target_types": ["FederationPeer"],
        "cardinality": "N:M",
        "directional": False,
        "note": "Federation is bilateral — both CLCs create this edge",
        "phase": "ADR-489 Fase 3"
    },
    "HAS_POLICY": {
        "description": "FederationPeer relationship is governed by FederationPolicy",
        "source_types": ["FederationPeer"],
        "target_types": ["FederationPolicy"],
        "cardinality": "1:N",
        "note": "One or more policies can govern a peer (e.g. inbound + outbound)",
        "phase": "ADR-489 Fase 3"
    },
    "SHARED_WITH": {
        "description": "CyborgIdentity shared data recorded as SharedEvent, sent to FederationPeer",
        "source_types": ["CyborgIdentity"],
        "target_types": ["SharedEvent"],
        "cardinality": "1:N",
        "note": "Sender perspective: CLC-A created this SharedEvent record",
        "phase": "ADR-489 Fase 3"
    },
    "RECEIVED_BY": {
        "description": "SharedEvent was delivered to FederationPeer",
        "source_types": ["SharedEvent"],
        "target_types": ["FederationPeer"],
        "cardinality": "N:1",
        "note": "Receiver perspective: who received this sharing event",
        "phase": "ADR-489 Fase 3"
    },
    "ORIGINATED_FROM": {
        "description": "SharedEvent provenance — originated from this FederationPeer",
        "source_types": ["SharedEvent"],
        "target_types": ["FederationPeer"],
        "cardinality": "N:1",
        "note": "Provenance chain: who originally sent this federated event",
        "phase": "ADR-489 Fase 3"
    },
}

# Validation helpers
def get_type_spec(type_name: str):
    return CYBORG_TYPES.get(type_name)

def list_types():
    return list(CYBORG_TYPES.keys())

def validate_node(node_data: dict, strict: bool = False):
    errors = []
    warnings = []
    domain_type = node_data.get("domain_type") or node_data.get("type")
    if not domain_type:
        errors.append("Missing domain_type")
        return (False, errors, warnings)
    if domain_type not in CYBORG_TYPES:
        warnings.append(f"Unknown type: {domain_type}")
        return (True, errors, warnings)
    spec = CYBORG_TYPES[domain_type]
    properties = node_data.get("properties", node_data)
    for req in spec.get("required", []):
        if req not in properties or properties[req] is None:
            if strict:
                errors.append(f"Missing required property: {req}")
            else:
                warnings.append(f"Missing recommended property: {req}")
    return (len(errors) == 0, errors, warnings)


if __name__ == "__main__":
    print("Cyborg Ontology Plugin v1.2 — Self Test")
    print("Namespace:", PLUGIN_METADATA["namespace"])
    print("Types:", list_types())
    print()

    # --- Validate existing types ---
    tr_spec = get_type_spec("TrustRelation")
    assert tr_spec is not None, "TrustRelation not registered"
    assert tr_spec["l1_ground"] == "Entity", "TrustRelation must be grounded in Entity (not Interaction)"
    assert "revoked" in tr_spec["properties"], "TrustRelation must have revoked property"
    assert tr_spec["semantic_flags"]["directional"] is True, "TrustRelation must be directional"
    print("TrustRelation:", tr_spec["l1_ground"], "—", tr_spec["required"])

    # --- Validate FederationPeer (ADR-489 Gate) ---
    fp_spec = get_type_spec("FederationPeer")
    assert fp_spec is not None, "FederationPeer not registered"
    assert fp_spec["l1_ground"] == "Agent", (
        "FederationPeer must be grounded in Agent (NOT Collective_Agent — "
        "external actor reference, not internal collective constitution)"
    )
    assert "public_key_fingerprint" in fp_spec["required"], "FederationPeer must require public_key_fingerprint"
    assert "federation_status" in fp_spec["required"], "FederationPeer must require federation_status"
    assert fp_spec["semantic_flags"]["external_reference"] is True, "FederationPeer is external reference"
    print("FederationPeer:", fp_spec["l1_ground"], "—", fp_spec["required"])

    # --- Validate FederationPolicy ---
    pol_spec = get_type_spec("FederationPolicy")
    assert pol_spec is not None, "FederationPolicy not registered"
    assert pol_spec["l1_ground"] == "Pattern", "FederationPolicy must be grounded in Pattern (NormativeObject)"
    assert "can_share_event_types" in pol_spec["required"], "FederationPolicy must require can_share_event_types"
    assert pol_spec["semantic_flags"]["consent_encoding"] is True, "FederationPolicy encodes consent"
    print("FederationPolicy:", pol_spec["l1_ground"], "—", pol_spec["required"])

    # --- Validate SharedEvent ---
    se_spec = get_type_spec("SharedEvent")
    assert se_spec is not None, "SharedEvent not registered"
    assert se_spec["l1_ground"] == "Interaction", "SharedEvent must be grounded in Interaction (Perdurant)"
    assert "signature" in se_spec["required"], "SharedEvent must require signature"
    assert se_spec["semantic_flags"]["immutable"] is True, "SharedEvent must be WORM (immutable)"
    assert se_spec["semantic_flags"]["reified_relation"] is True, "SharedEvent is reified relation (not HyperEdge)"
    print("SharedEvent:", se_spec["l1_ground"], "—", se_spec["required"])

    # --- Edge type completeness ---
    expected_edges = {"PERFORMED", "TRUSTS", "FEDERATES_WITH", "HAS_POLICY",
                      "SHARED_WITH", "RECEIVED_BY", "ORIGINATED_FROM"}
    registered_edges = set(CYBORG_EDGE_TYPES.keys())
    assert expected_edges == registered_edges, f"Edge type mismatch: {expected_edges ^ registered_edges}"
    print("Edge types:", list(registered_edges))

    print()
    print("✅ Self-test v1.2 complete — 6 types, 7 edge types registered")
