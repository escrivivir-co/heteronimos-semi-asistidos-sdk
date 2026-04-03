# ADR-451: Constitutional Framework for Retro

**Status:** ✅ Accepted
**Date:** 2026-02-27
**Deciders:** Dídac Buscató (Chief Architect) — Approved 2026-02-27
**Proposed by:** RoadmapCoordinator (constitutional draft); Architect (ADR formalization)
**Related:** ADR-444 (Self-Modification Governance), ADR-488 (Cyborg Principle — meta-foundation), ADR-001, ADR-106, ADR-405, ADR-406, ADR-440, ADR-442

---

## Context

### The Need for a Constitutional Layer

Retro has accumulated a substantial body of architectural decisions (50+ ADRs), operational policies, and agent workflows. Until now, this body of decisions has lacked an explicit meta-normative foundation: a document that articulates *what Retro is*, *what values are non-negotiable*, and *how the system may evolve without betraying its foundation*.

Individual ADRs address specific technical decisions. Operational policies address workflows. But no document has formally answered: *against what are these decisions validated?*

This gap creates two risks:

1. **Drift without detection:** The system evolves incrementally in ways that, individually, seem reasonable but collectively violate foundational commitments.
2. **Implicit values:** The system encodes commitments (what to optimize, what to preserve, what to sacrifice) without making them explicit and therefore without making them contestable.

### The Constitutional Document

On 2026-02-27, `docs/RETRO_CONSTITUTION.md` (v0.3) was drafted by RoadmapCoordinator, reviewed by Architect, and approved by Dídac Buscató.

The Constitution articulates:
- **Section I:** What Retro is and is not (Nature of the System)
- **Section II:** Seven non-negotiable philosophical principles (Foundations)
- **Section III:** The user-system relationship (rights and responsibilities)
- **Section IV:** Navigational horizons (directional, not destinations)
- **Section V:** Nine constitutional constraints (what the system will never do)
- **Section VI:** Scenario policy (living document, populated over time)
- **Section VII:** Governance of evolution (amendment process)
- **Section VIII:** Coherence as evaluation function
- **Section IX:** Constitutional incompleteness (gaps as potential, not deficiencies)

### What This ADR Formalizes

The existence of the constitutional document is necessary but not sufficient. The *adoption* of that document as the supreme normative layer — with explicit consequences for the existing ADR body and future decision-making — is itself an architectural decision that requires formal documentation.

This ADR documents that meta-decision.

---

## Decision

We formally adopt `docs/RETRO_CONSTITUTION.md` as the **supreme normative document of the Retro system**, establishing a four-level normative hierarchy and the governance mechanisms that flow from it.

### Normative Hierarchy

```
Level 1: CONSTITUTIONAL
         docs/RETRO_CONSTITUTION.md
         ─────────────────────────────────────────────────────
         Seven principles (Section II) + Nine constraints (Section V)
         Cannot be overridden by any lower level.
         Amendment: Section VII protocol + Dídac explicit approval.

Level 2: ARCHITECTURAL DECISIONS
         docs/architecture/adrs/ADR-XXX-*.md
         ─────────────────────────────────────────────────────
         Specific technical decisions, validated against Level 1.
         Can evolve; must not contradict Constitutional principles
         or constraints.
         Amendment: Standard ADR process + Constitutional validation.

Level 3: OPERATIONAL POLICIES
         docs/DOCUMENTATION_POLICY.md
         docs/TOOL_AND_API_DESIGN_POLICY.md
         docs/TEMPLATE_MANAGEMENT_POLICY.md
         CLAUDE.md (Layer 2 — project context)
         ─────────────────────────────────────────────────────
         How the system operates day-to-day. Must comply with Level 1
         and Level 2.
         Amendment: Orchestrator + Chief Architect approval.

Level 4: WORKFLOWS AND PROCEDURES
         Agents/<Agent>/CLAUDE.md (Layer 3 — agent operations)
         Agents/scripts/
         ─────────────────────────────────────────────────────
         Implementation details. Must comply with all higher levels.
         Amendment: Agent-level or Orchestrator coordination.
```

**Principle:** Higher levels are fewer in number, slower to change, and more broadly applicable. Lower levels are more numerous, faster to evolve, and more specific.

### Consequences for Existing ADRs

**Existing ADRs are not invalidated.** They remain valid decisions within their domain. However, they are now explicitly subordinated to the Constitutional layer.

Specifically:

1. **No existing ADR is retroactively nullified** — the Constitutional principles were already implicitly operative in the ADR authoring process; this ADR makes that explicit.

2. **Apparent conflicts** between existing ADRs and the Constitution are to be resolved through Architect review. In case of genuine conflict, the Constitution prevails and the ADR requires revision.

3. **All future ADRs must include Constitutional validation** (see Validation Checklist below).

### Validation Mechanism for New ADRs

Every new ADR must verify alignment with the Constitutional layer before acceptance. The following checklist is added to the standard ADR review process:

```
CONSTITUTIONAL VALIDATION CHECKLIST

For each of the Nine Constraints (Constitution, Section V):
□ C1: Does this ADR preserve or expand user optionality?
□ C2: Are all dependencies created by this ADR reversible, or is the
      user explicitly warned and consenting?
□ C3: Does this ADR avoid enabling strategic decisions without policy
      coverage? (Strategic = affects multiple systems, irreversible >24h,
      involves uncommitted resources, or produces user-observable behavior changes)
□ C4: Does this ADR avoid optimizing a metric at the cost of a
      Constitutional principle?
□ C5: Does this ADR maintain or improve system traceability?
      (Every action traceable to policy, every policy to principle)
□ C6: Does this ADR avoid concentrating control in a single agent
      or component?
□ C7: Does this ADR preserve relational context? (Does not flatten
      knowledge or sacrifice contextual integrity for efficiency)
□ C8: Does this ADR define behavior for new scenario classes, or
      explicitly escalate them to the user?
□ C9: Does this ADR keep user data within user-controlled systems,
      or obtain explicit consent for any exception?

For the Seven Principles (Constitution, Section II):
□ P1: Soberanía Humana — user can understand, control, and modify
□ P2: Primacía de las Relaciones — relational context preserved
□ P3: Significados Orgánicos — ontologies emerge, not imposed
□ P4: Individuación Transindividual — no agent accumulates exclusive control
□ P5: Epistemología Enactiva — system co-produces knowledge, not just stores
□ P6: Incompletitud Constitucional — ambiguity managed, not eliminated
□ P7: Federación sin Centralización — no single point of failure or control

For the Horizons (Constitution, Section IV):
□ At minimum, does this ADR not work against any horizon?
□ Ideally, does it advance at least one?
```

**A new ADR that cannot pass this checklist requires either:**
- Explicit justification of why the apparent violation is not a real violation, OR
- Constitutional amendment through the Section VII protocol (only then can the ADR proceed)

### Relationship with ADR-444 (Self-Modification Governance)

ADR-444 and ADR-451 operate at different levels of the same governance concern:

| Aspect | ADR-444 | ADR-451 |
|--------|---------|---------|
| **Scope** | Agent self-modification (capability evolution) | System-wide normative hierarchy |
| **What it governs** | How agents can autonomously modify their own capabilities | What values and constraints govern all decisions |
| **Amendment authority** | Tiered: Autonomous / Agent consensus / Human | Constitutional: Section VII protocol + Dídac only |
| **Trigger** | Agent proposes a modification to its own behavior | Any architectural decision or policy change |
| **Relationship** | ADR-444 operates *within* the constitutional framework | ADR-451 establishes the framework ADR-444 operates within |

**Practical implication:** ADR-444 Tier 3 items (require human approval) are a subset of Constitutional-level changes. But Constitutional changes are more constrained than ADR-444 Tier 3: they require the Section VII protocol, not just human approval.

```
Constitutional changes (ADR-451)  ⊂  ADR-444 Tier 3
ADR-444 Tier 3                    ⊄  Constitutional changes
```

An agent proposing a Tier 3 change under ADR-444 must first verify the change does not require a constitutional amendment. If it does, the constitutional amendment process takes precedence.

### Amendment Process for the Constitution

The canonical amendment process is defined in **Constitution Section VII**. This ADR adds one procedural clarification:

**Any amendment to Sections II (Principles) or V (Constraints) automatically requires:**
1. A new ADR documenting the change and its architectural consequences
2. Explicit approval by Dídac (Chief Architect)
3. Notification to all active agents via Orchestrator

Amendments to Sections IV, VI, and IX (Horizons, Scenario Policy, Incompleteness declaration) follow a lighter process: git commit with justification, no ADR required unless the change has architectural implications.

---

## Consequences

### Positive

1. **Explicit governance foundation:** Every architectural decision can be traced to a principle. The system has a declared normative basis, not an implicit one.

2. **Drift detection:** The Constitutional validation checklist creates a formal mechanism for catching value drift early, before individual decisions accumulate into systemic misalignment.

3. **Coherent evolution:** The system can evolve faster and more ambitiously because there is a clear framework for evaluating what changes are constitutionally safe. Speed and depth of evolution are bounded, not blocked.

4. **Philosophical grounding of technical decisions:** ADRs are no longer merely pragmatic choices — they are positioned within a value framework that connects technical decisions to philosophical commitments.

5. **User sovereignty operationalized:** The Constitution makes user rights and responsibilities explicit and binding. This is qualitatively different from having them implicitly assumed.

### Negative

1. **Additional overhead per ADR:** The Constitutional validation checklist adds review steps. This is intentional — Constitutional compliance is worth the cost.

2. **Potential for checklist fatigue:** If the checklist becomes mechanical rather than reflective, it loses its purpose. Mitigation: the checklist asks substantive questions, not box-ticking questions.

3. **Ambiguity in edge cases:** Not every architectural decision will have an obvious relationship to every constitutional principle. Some validation answers will be "N/A — not applicable to this domain." This is acceptable.

4. **Constitutional rigidity:** The strength of constitutional constraints (they cannot be overridden by operational policy) is also a constraint on innovation. Any genuinely new capability that requires violating a constitutional constraint requires an amendment, not a workaround. This is a feature, not a bug.

### Neutral

1. **Living document:** The Constitution explicitly declares its own incompleteness (Section IX). ADR-451 inherits this: the governance framework will evolve as the system and its use mature.

2. **No retroactive ADR invalidation:** Existing ADRs do not need to be rewritten. The Constitutional validation applies prospectively. Historical ADR review is recommended but not mandatory.

---

## Validation

### Alignment with Architectural Principles

*(Self-referential validation: this ADR itself must pass the Constitutional checklist it establishes)*

**Constitutional Constraints:**
- [✅] C1: Preserves user optionality — the Constitution expands, not restricts, user sovereignty
- [✅] C2: No irreversible dependencies — the framework is itself amendable (Section VII)
- [✅] C3: Strategic decision coverage — this ADR is itself the policy for meta-governance
- [✅] C4: No metric at cost of principle — coherence is elevated as the primary metric
- [✅] C5: Traceability enhanced — every decision now traces to principle explicitly
- [✅] C6: No control concentration — the Constitution distributes normative authority
- [✅] C7: Relational context — governance framework preserves semantic coherence
- [✅] C8: Meta-scenario policy — Section VII defines behavior for constitutional change scenarios
- [✅] C9: No external data — this is a governance document, no data handling involved

**Philosophical Principles:**
- [✅] P1: Soberanía Humana — user rights and responsibilities made explicit and binding
- [✅] P2: Primacía de las Relaciones — normative hierarchy is relational, not atomistic
- [✅] P3: Significados Orgánicos — the Constitution declares itself incomplete and evolving
- [✅] P4: Individuación Transindividual — no single agent has exclusive constitutional authority
- [✅] P5: Epistemología Enactiva — governance framework co-produced through use (Section VI)
- [✅] P6: Incompletitud Constitucional — Section IX explicitly embraces incompleteness
- [✅] P7: Federación sin Centralización — governance distributes, does not centralize

**Horizons:**
- [✅] H2: Calidad como coherencia — this ADR operationalizes coherence as primary criterion
- [✅] H4: Autoconocimiento del sistema — the system now knows its own normative foundation
- [✅] H5: Evolución gobernada — amendment process is the definition of governed evolution

---

## Alternatives Considered

### Alternative 1: Leave the Constitutional Document Standalone (REJECTED)

**Approach:** Publish `docs/RETRO_CONSTITUTION.md` without a corresponding ADR. Let the document speak for itself.

**Pros:**
- No additional documentation overhead
- The Constitution is self-explanatory

**Cons:**
- ❌ The *decision to adopt* the Constitution as supreme normative layer is itself an architectural decision — it must be documented as one
- ❌ No formal mechanism for ADR validation against Constitutional constraints
- ❌ No explicit relationship between ADR-444 and constitutional governance
- ❌ Inconsistent: other significant decisions have ADRs; this one should too

**Verdict:** The Constitution needs a companion ADR for the adoption decision itself.

### Alternative 2: Embed Constitutional Validation in ADR Template Only (REJECTED)

**Approach:** Add a Constitutional checklist section to the ADR template without creating ADR-451.

**Pros:**
- Lightweight
- Directly operational

**Cons:**
- ❌ No documentation of the normative hierarchy decision
- ❌ No formal distinction between ADR-444 and constitutional governance
- ❌ Template change without architectural rationale

**Verdict:** Necessary but not sufficient. The checklist belongs in both the template AND an ADR.

### Alternative 3: Create ADR-451 + Update All Existing ADRs (REJECTED)

**Approach:** Require retroactive Constitutional validation of all 50+ existing ADRs.

**Pros:**
- Complete consistency

**Cons:**
- ❌ Enormous effort for marginal benefit
- ❌ The Constitutional principles were already operative implicitly — retroactive documentation is ceremonial
- ❌ Violates "Evolution Over Rigidity" principle

**Verdict:** Prospective application is sufficient. Recommend voluntary review of key ADRs (especially ADR-001, ADR-106, ADR-118, ADR-405, ADR-406, ADR-440, ADR-444) as a low-priority follow-up.

---

## Implementation

### Immediate (this ADR)
- [x] ADR-451 created at `docs/architecture/adrs/ADR-451-constitutional-framework.md`
- [ ] Constitutional validation checklist added to ADR template (`ADR_TEMPLATE.md`)
- [ ] Reference to ADR-451 added to `docs/architecture/README.md`
- [ ] Constitution's self-reference to ADR-450 updated to ADR-451 (the number was reserved but taken)

### Short-term (next session)
- [ ] Notify all agents of the Constitutional Framework via Orchestrator
- [ ] Add Constitutional validation checklist to `CLAUDE.md` (Layer 2) in "Must-Read ADRs" section
- [ ] Voluntary Constitutional review of foundational ADRs (ADR-001, ADR-106, ADR-405, ADR-406, ADR-444)

### Ongoing
- [ ] Apply Constitutional validation checklist to every new ADR
- [ ] Populate Constitution Section VI as scenarios emerge
- [ ] Quarterly Constitutional review (per Section VII)

---

## References

**Constitutional document:**
- `docs/RETRO_CONSTITUTION.md` (v0.3 — approved 2026-02-27)

**Architectural review:**
- `Agents/Architect/.agent/reports/REVIEW_RETRO_CONSTITUTION_draft_2026-02-27.md`

**Related ADRs:**
- ADR-001: Tool-First Design *(operational policy subordinated to Constitution)*
- ADR-022: ADR Numbering Reconciliation *(governs ADR namespace)*
- ADR-106: Multi-Graph Architecture *(operationalizes P7 — Federation)*
- ADR-405: Dynamic Ontology System *(operationalizes P2, P3)*
- ADR-406: Relational-Organic Validation *(operationalizes P2, P3, P5)*
- ADR-440: Multi-Agent Reference Architecture Framework *(operationalizes P7)*
- ADR-442: Observability Layer *(prerequisite for C5 — traceability)*
- ADR-444: Self-Modification Governance Protocol *(operationalizes H5; subordinate to this framework)*
- ADR-450: 3-Layer CLAUDE.md Architecture *(Level 3-4 of normative hierarchy)*
- ADR-488: Cyborg Principle as Architectural Meta-Foundation *(ontological analysis beneath P1 — Soberanía Humana; provides the formal criterion for evaluating agency, attribution, and epistemic authority across all constitutional decisions)*

**Philosophy:**
- `docs/philosophy/essays/ontologia_relacional_hipergrafo.md`
- `docs/philosophy/README.md`

---

**Approved by:** Dídac Buscató (Chief Architect) — 2026-02-27
**Authored by:** Architect
**Implementation:** Architect (ADR), Orchestrator (agent notification), Documenter (template update)
**Priority:** HIGH — foundational governance document
**Risk Level:** LOW — descriptive/normative, no system behavior changes
