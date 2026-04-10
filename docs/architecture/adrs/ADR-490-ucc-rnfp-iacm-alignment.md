# ADR-490: UCC/RNFP Alignment with IACM

**Status:** Proposed
**Date:** 2026-04-10
**Deciders:** Pending maintainer review
**Proposed by:** `feat/sds_ucc` integration work
**Related:** `specs/17-iacm-protocol.md`, `specs/19-cyborg-federation-protocol.md`, `docs/UNIVERSAL_CYBORG_CONSTITUTION.md`, `templates/cyborg_principle_foundations.md`, `templates/ADR-451-constitutional-framework.md`

---

## Context

This repository already has a stable IACM layer for typed inter-agent communication.

New remote material introduces a second concern:

1. a constitutional framework for Cyborg systems,
2. a federation bootstrap protocol for peer relationships,
3. an ontology for trust, policy, and shared provenance.

The new material arrived as quarantined artifacts:

- `CUARENTENA/UNIVERSAL_CYBORG_CONSTITUTION.md`
- `CUARENTENA/federation_guide.md`
- `CUARENTENA/cyborg_v1.py`

The repository does **not** currently contain:

- a `clc` CLI,
- a HyperGraph runtime,
- a Python integration path,
- a peer federation transport abstraction beyond the existing Telegram bot SDK surface.

Therefore the integration problem is architectural, not merely editorial: the repository needs a clear decision about what to adopt now and what to defer.

---

## Decision

We adopt a **docs-first alignment strategy** for UCC/RNFP work in this repository.

### 1. Canonical documents

We create canonical homes for the material inside this repository:

- `docs/UNIVERSAL_CYBORG_CONSTITUTION.md`
- `specs/19-cyborg-federation-protocol.md`
- `docs/architecture/adrs/ADR-490-ucc-rnfp-iacm-alignment.md`

### 2. Layering model

We define the following responsibility split:

- **UCC** provides the constitutional layer: sovereignty, delegation, audit, revocation semantics, and federation prerequisites.
- **RNFP** provides the federation bootstrap and sharing protocol model.
- **IACM** remains the application-layer protocol for structured inter-agent conversation.

RNFP and IACM are complementary, not competing.

### 3. Quarantine policy for the Python ontology

`CUARENTENA/cyborg_v1.py` is recognized as a **reference ontology only**.

It is not adopted as:

- executable project code,
- build dependency,
- runtime requirement,
- evidence that the repository now supports Python-based federation.

### 4. Explicit non-decisions

This ADR does **not** approve:

- implementation of a `clc` CLI,
- Telegram DM federation runtime,
- HyperGraph persistence,
- Python execution from `CUARENTENA/`,
- a Node/Python hybrid deployment model.

Those require separate ADRs.

---

## Rationale

### Preserve conceptual value without fake implementation

The remote material is rich at the normative and protocol level, but it overreaches the current runtime reality of the SDK. A docs-first adoption captures the value now without pretending that the runtime exists.

### Protect the IACM line

This work is stacked over `feat/sds_iacm`. The correct move is to extend the architectural frame around IACM, not to destabilize or replace it.

### Avoid accidental Python creep

The repository is a TypeScript/Bun SDK. Treating `cyborg_v1.py` as immediate implementation material would silently introduce a second runtime and a second dependency model without prior approval.

### Make tensions explicit

The remote material contains real tensions:

- Telegram as provisional transport vs. sovereignty,
- revocation as signal vs. deletion expectations,
- philosopher/metamodel gates vs. maintainer authority,
- peer federation concepts vs. present SDK runtime capabilities.

Capturing these tensions in docs and ADR form is better than burying them inside speculative code.

---

## Consequences

### Positive

1. The repository gains a stable constitutional and federation vocabulary.
2. Future work can build TS contracts from a documented model rather than from quarantine files.
3. IACM keeps a clear scope as the conversational protocol layer.
4. Reviewers can discuss constitutional and federative design separately from runtime implementation.

### Negative

1. The repository still lacks an executable federation stack after this ADR.
2. Some links in the promoted material remain aspirational until a future runtime exists.
3. There is temporary duplication between canonical docs and `CUARENTENA/` sources.

### Neutral

1. The quarantine files remain useful as source material and audit trail.
2. A future TypeScript port of the ontology remains possible, but is not implied by this ADR.

---

## Relationship to Existing Constitutional Material

`templates/cyborg_principle_foundations.md` remains the main philosophical precursor in this repository.

The new constitutional document does not invalidate it. Instead:

- `cyborg_principle_foundations.md` explains the philosophical grounding of Cyborg agency,
- `docs/UNIVERSAL_CYBORG_CONSTITUTION.md` states the operational constitutional commitments for federation-oriented work.

`templates/ADR-451-constitutional-framework.md` is treated as a governance precedent and style reference, not as a claim that this repository has already adopted a system-wide supreme constitution.

---

## Follow-up Work

Potential follow-up ADRs or specs may cover:

1. TypeScript contract definitions for federation concepts.
2. RNFP parser/validator APIs.
3. Mock transport and handshake tests.
4. A demo app that combines IACM flows with peer federation lifecycle.

---

## Validation

- [x] Defines canonical locations for the promoted material.
- [x] Keeps IACM in place as the existing protocol layer.
- [x] Records `cyborg_v1.py` as reference-only.
- [x] Makes non-decisions explicit to avoid scope drift.
- [x] Aligns with the docs-first implementation strategy of `feat/sds_ucc`.
