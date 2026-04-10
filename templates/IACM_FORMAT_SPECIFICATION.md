# IACM Format Specification

**Format Name:** IACM (Inter-Agent Communication Message)
**Version:** 1.0
**Status:** ✅ **MANDATORY** (ADR-438 + ADR-452)
**Created:** 2026-02-12
**Approved:** 2026-02-13
**Author:** Documenter Agent
**Architectural Review:** Architect, Metamodel, PromptCraft, Observer

---

## Document Status

**✅ IACM v1.0 MANDATORY — Phase 2 Pilot Complete**

- **ADR-438:** IACM Format Adoption — ACCEPTED (format specification)
- **ADR-452:** IACM v1.0 Official Mandate — ACCEPTED (2026-02-27; mandatory for all new outbound messages)
- **ADR-439:** TOON Format Evaluation — ACCEPTED (Deferred to v1.2+)
- **Format:** YAML serialization
- **Rollout:** Phased (v1.0 → v1.1 → v1.2)
- **Implementation Start:** Week 1 (Feb 13-19, 2026)
- **Mandate Effective:** 2026-02-27 | **Transition Window:** Until 2026-04-15

**Validation:**
- ✅ Metamodel: 100% ontologically coherent with UFO + embryonic/v1
- ✅ PromptCraft: Usable with tooling (quick-send CLI critical)
- ✅ Observer: 9.5/10 observability with v1.1 enhancements

---

## Table of Contents

1. [Overview](#1-overview)
2. [Philosophy & Design Principles](#2-philosophy--design-principles)
3. [Format Structure (General)](#3-format-structure-general)
4. [Message Type Coverage](#4-message-type-coverage)
5. [Comparison: Current vs IACM](#5-comparison-current-vs-iacm)
6. [Benefits](#6-benefits)
7. [Migration Strategy](#7-migration-strategy)
8. [Detailed Message Type Schemas](#8-detailed-message-type-schemas)
   - 8.1 REQUEST
   - 8.2 REPORT
   - 8.3 QUESTION
   - 8.4 ANSWER
   - 8.5 PROPOSAL
   - 8.6 ACKNOWLEDGE
   - 8.7 ACCEPT
   - 8.8 REJECT
   - 8.9 DEFER
   - 8.10 FYI
   - 8.11 URGENT
9. [IACM v1.1 Preview](#9-iacm-v11-preview)
10. [Validation Rules](#10-validation-rules)
11. [Success Criteria](#11-success-criteria)
12. [References](#12-references)

---

> **Note:** Sections 1–7 preserve the original draft rationale (v0.1.0-draft, 2026-02-12).
> Section 8 onwards contains the complete v1.0 approved schemas. All items previously marked as pending are now complete (see Document History).

---

## 1. Overview

### 1.1 What is IACM?

**IACM (Inter-Agent Communication Message)** is a structured YAML format for **agent-to-agent communication** in the Retro multi-agent ecosystem.

**Core Concept:** Separate **human-readable narrative** from **machine-parseable data** to enable both:
- Automated message processing by agents and scripts
- Human comprehension when reviewing message history

### 1.2 Problem Statement

**Current State:** Agent messages use Markdown format with mixed content:

```markdown
# REQUEST: Document Authentication Flow
From: Orchestrator
To: Documenter
Priority: High

Please document the new authentication flow in session #320.
Files affected: auth/login.py, auth/session.py
Deadline: 2026-02-15
```

**Problems:**
- ❌ **No standardized structure** — Each agent formats differently
- ❌ **Difficult to parse** — Requires ad-hoc Markdown parsing
- ❌ **No validation** — No schema enforcement
- ❌ **No versioning** — Format cannot evolve safely
- ❌ **Mixed concerns** — Human narrative mixed with machine data
- ❌ **Limited automation** — Scripts cannot reliably extract fields
- ❌ **No threading** — Cannot track conversation context
- ❌ **No metadata** — Timestamps, IDs must be inferred from filename

**Impact:**
- Agents cannot automatically process inbox
- Scripts cannot analyze communication patterns
- No automatic prioritization or routing
- Difficult to build workflow automation
- Human intervention required for simple tasks

### 1.3 Solution: Structured Communication

**IACM Approach:** YAML-based structured messages with clear separation:

```yaml
---
meta:
  format_version: "IACM/1.0"
  message_type: REQUEST
  from_agent: Orchestrator
  to_agent: Documenter
  timestamp: "2026-02-12T14:30:00Z"
  message_id: "req-doc-auth-20260212-143000"
  thread_id: "auth-implementation-thread"
  reply_to: null

request:
  task: "Document authentication flow"
  context: "New auth implementation completed in session #320"
  files_affected:
    - "auth/login.py"
    - "auth/session.py"
  priority: high
  deadline: "2026-02-15"
  estimated_effort_min: 120

narrative: |
  Please document the new authentication flow implemented in session #320.

  The new flow includes JWT-based session management, refresh token rotation,
  and multi-device support. Users will need clear guidance on authentication.

statistics:
  estimated_pages: 3
  complexity: medium
---
```

**Benefits:**
- ✅ **Structured data** — Easily parseable YAML
- ✅ **Type-specific schemas** — Each message type has defined fields
- ✅ **Versioned format** — Safe evolution over time
- ✅ **Human-friendly** — Narrative section for context
- ✅ **Machine-processable** — Scripts can extract all fields
- ✅ **Threaded conversations** — reply_to and thread_id support
- ✅ **Complete metadata** — Timestamps, IDs, routing info
- ✅ **Validation-ready** — Schema validation possible

---

## 2. Philosophy & Design Principles

### 2.1 Core Philosophy

**Inspired by IOCR's inference-optimized approach:**

1. **Separation of Concerns**
   - Machine data in structured sections (meta, request, report, etc.)
   - Human narrative in dedicated narrative section
   - Each serves its purpose optimally

2. **Machine-First, Human-Friendly**
   - Primary audience: Agent scripts and parsers
   - Secondary audience: Humans reviewing message history
   - Both audiences well-served, neither compromised

3. **Explicit Over Implicit**
   - All metadata explicit (timestamps, IDs, routing)
   - Relationships stated clearly (thread_id, reply_to)
   - No reliance on filename conventions or inference

4. **Evolutionary Design**
   - Format versioning enables safe evolution
   - Backward compatibility maintained across MINOR versions
   - Parser can handle multiple format versions

5. **Validation-Friendly**
   - Schema validation possible for each message type
   - Type-safe field access
   - Early error detection

### 2.2 Design Principles

#### Principle 1: Structure Enables Automation

**Without structure:**
```python
# Must parse Markdown heuristically
content = read_file("inbox/message.md")
priority = extract_priority(content)  # Fragile regex
deadline = extract_deadline(content)  # May fail
```

**With IACM:**
```python
# Direct field access
msg = parse_iacm("inbox/message.yaml")
priority = msg.request.priority  # Type-safe
deadline = msg.request.deadline  # Validated ISO 8601
```

#### Principle 2: Narrative Preserves Context

**Machine data alone is insufficient:**
```yaml
# Missing: WHY this is urgent, WHAT context matters
request:
  task: "Fix parser bug"
  priority: critical
  deadline: "2026-02-13"
```

**Narrative adds essential context:**
```yaml
request:
  task: "Fix parser bug"
  priority: critical
  deadline: "2026-02-13"

narrative: |
  The parser bug is causing session data loss for 3 users. This blocks
  the v2.0 release scheduled for Feb 14. Root cause identified in
  session #325 - invalid YAML handling in edge case.
```

#### Principle 3: Threading Enables Conversation

**Without threading:**
```
inbox/
├── QUESTION_approach_Architect_2026-02-10.md
├── ANSWER_approach_Implementer_2026-02-11.md  # Which question?
├── QUESTION_deadline_Orchestrator_2026-02-11.md
└── ANSWER_deadline_Implementer_2026-02-12.md  # Which question?
```

**With threading:**
```yaml
# Original question
meta:
  message_id: "q-approach-20260210"
  thread_id: "auth-design-discussion"

# Answer references question
meta:
  message_id: "a-approach-20260211"
  thread_id: "auth-design-discussion"
  reply_to: "q-approach-20260210"
```

#### Principle 4: Versioning Enables Evolution

**Format v1.0:**
```yaml
meta:
  format_version: "IACM/1.0"
  message_type: REQUEST
  # Basic fields
```

**Format v1.1 (future):**
```yaml
meta:
  format_version: "IACM/1.1"
  message_type: REQUEST
  # New optional fields added
  urgency_score: 0.85
  suggested_assignee: "Documenter"
```

**Parser handles both:**
```python
version = msg.meta.format_version
if version == "IACM/1.0":
    # Use defaults for missing v1.1 fields
    urgency = msg.meta.get("urgency_score", 0.5)
elif version == "IACM/1.1":
    urgency = msg.meta.urgency_score
```

---

## 3. Format Structure (General)

### 3.1 Three-Section Architecture

Every IACM message has **three core sections**:

```yaml
---
# SECTION 1: Metadata (Required)
meta:
  format_version: "IACM/1.0"      # Format version
  message_type: REQUEST           # Type of message
  from_agent: AgentName           # Sender
  to_agent: AgentName             # Recipient
  timestamp: ISO8601              # When sent
  message_id: unique-id           # Unique identifier
  thread_id: thread-id            # Conversation grouping
  reply_to: message-id | null     # Previous message in thread

# SECTION 2: Type-Specific Data (Required)
# Schema varies by message_type:
# - REQUEST → request section
# - REPORT → report section
# - PROPOSAL → proposal section
# - QUESTION → question section
# - ANSWER → answer section
# - etc.
<message_type_lowercase>:
  # Type-specific structured fields
  ...

# SECTION 3: Narrative (Optional but Recommended)
narrative: |
  Human-readable explanation of the message.
  Provides context, rationale, and nuance.

# SECTION 4: Statistics (Optional)
statistics:
  # Metrics relevant to this message
  ...
---
```

### 3.2 Section Purposes

#### Meta Section (Required)

**Purpose:** Message routing, identification, and threading

**Core Fields:**
- `format_version` — Enable format evolution
- `message_type` — Determine schema for type-specific section
- `from_agent` / `to_agent` — Routing information
- `timestamp` — Temporal context
- `message_id` — Unique identification
- `thread_id` — Conversation grouping
- `reply_to` — Threading (which message this responds to)

**Use Cases:**
- Inbox filtering: "Show me all REQUESTS to Documenter"
- Thread reconstruction: "Show full conversation for thread X"
- Temporal analysis: "Communication patterns over last 30 days"
- Automatic routing: "Forward to appropriate agent inbox"

#### Type-Specific Section (Required)

**Purpose:** Structured data specific to message type

**Varies by message_type:**
- `REQUEST` → `request` section (task, deliverables, priority, deadline)
- `REPORT` → `report` section (summary, findings, metrics, status)
- `PROPOSAL` → `proposal` section (title, rationale, alternatives, decision_needed_by)
- `QUESTION` → `question` section (question, context, urgency, options)
- `ANSWER` → `answer` section (question_id, answer, confidence, sources)
- `ACKNOWLEDGE` → `acknowledge` section (message_id, confirmation, actions_taken)
- `ACCEPT` → `accept` section (proposal_id, conditions, commitment)
- `REJECT` → `reject` section (proposal_id, rationale, alternative_suggested)
- `DEFER` → `defer` section (message_id, reason, revisit_date)
- `FYI` → `fyi` section (subject, information, relevance)
- `URGENT` → `urgent` section (issue, severity, action_needed_by)

**Use Cases:**
- Field extraction: "Extract all REQUEST deadlines"
- Validation: "Ensure all PROPOSALS have rationale"
- Automation: "Auto-create tasks from REQUEST deliverables"
- Metrics: "Average time between QUESTION and ANSWER"

#### Narrative Section (Optional)

**Purpose:** Human-readable context and explanation

**Content:** Free-form text that:
- Explains WHY (rationale, motivation)
- Provides CONTEXT (background, constraints)
- Adds NUANCE (edge cases, caveats, uncertainties)
- Clarifies INTENT (what success looks like)

**Use Cases:**
- Human review: Understanding message intent
- Handoff context: New agent understanding situation
- Audit trail: Historical understanding of decisions
- Disambiguation: Clarifying ambiguous structured data

#### Statistics Section (Optional)

**Purpose:** Metrics and metadata relevant to message

**Examples:**
- Estimated effort: `estimated_effort_min: 120`
- Complexity: `complexity: high`
- Impact: `estimated_impact: 3` (affected agents)
- Size: `estimated_pages: 5`

**Use Cases:**
- Resource planning: "How much work in inbox?"
- Prioritization: "High complexity + critical priority = urgent"
- Analytics: "Average effort per message type"

---

## 4. Message Type Coverage

### 4.1 Messaging System v1.1 Types

**IACM supports all 11 message types from Messaging System v1.1:**

#### Informative (Inform)
- **REPORT** — Status reports, completions, deliverables
- **FYI** — Informational updates (no action required)
- **ANSWER** — Response to QUESTION (closes thread)

#### Directive (Request action/information)
- **REQUEST** — Task delegation, input needed
- **QUESTION** — Clarification needed

#### Commissive (Commit to future action)
- **PROPOSAL** — RFC, design proposal
- **ACCEPT** — Accept proposal (creates commitment)
- **DEFER** — Postpone decision, need clarification

#### Response/Closure (Close conversations)
- **ACKNOWLEDGE** — Confirm receipt/understanding
- **ACCEPT** — (also serves as closure)
- **REJECT** — Reject proposal with rationale
- **DEFER** — (also serves as closure)

#### Priority Modifier
- **URGENT** — High-priority, immediate action

### 4.2 Schema Philosophy

**Each message type has:**
1. **Required fields** — Minimum data needed for processing
2. **Optional fields** — Contextual enhancement
3. **Recommended fields** — Best practice but not enforced

**Example: REQUEST type**

```yaml
request:
  # Required
  task: string                    # What needs to be done

  # Recommended
  context: string                 # Why it needs to be done
  priority: enum                  # How urgent (critical/high/medium/low)

  # Optional
  deliverables: array            # Specific outputs expected
  files_affected: array          # Relevant files/paths
  deadline: ISO8601              # When needed by
  estimated_effort_min: integer  # Effort estimate
```

**Rationale:**
- Required = Parser can process message
- Recommended = Best practice for clarity
- Optional = Contextual enhancement when valuable

---

## 5. Comparison: Current vs IACM

### 5.1 Side-by-Side Example

#### Current Format (Markdown)

**File:** `inbox/REQUEST_doc_auth_Orchestrator_2026-02-12.md`

```markdown
# Request: Document Authentication Flow

**From:** Orchestrator
**To:** Documenter
**Date:** 2026-02-12
**Priority:** High

Please document the new authentication flow implemented in session #320.

Files affected:
- auth/login.py
- auth/session.py
- docs/api/

Deadline: 2026-02-15
Estimated effort: 2 hours

The new flow includes:
- JWT-based session management
- Refresh token rotation
- Multi-device support

Users will need clear guidance on how to authenticate and manage sessions.
```

**Parsing Challenges:**
```python
# Fragile Markdown parsing
content = read_file(path)

# Regex extraction (brittle)
priority = re.search(r'\*\*Priority:\*\* (\w+)', content).group(1)
deadline = re.search(r'Deadline: ([\d-]+)', content).group(1)

# List extraction (varies by formatting)
files = re.findall(r'^- (.+)$', content, re.MULTILINE)

# Estimated effort (varies: "2 hours", "120 min", "2h")
effort = parse_duration(re.search(r'Estimated effort: (.+)', content).group(1))
```

#### IACM Format (Structured YAML)

**File:** `inbox/REQUEST_doc_auth_Orchestrator_2026-02-12.yaml`

```yaml
---
meta:
  format_version: "IACM/1.0"
  message_type: REQUEST
  from_agent: Orchestrator
  to_agent: Documenter
  timestamp: "2026-02-12T14:30:00Z"
  message_id: "req-doc-auth-20260212-143000"
  thread_id: "auth-implementation-thread"
  reply_to: null

request:
  task: "Document authentication flow"
  context: "New auth implementation completed in session #320"
  files_affected:
    - "auth/login.py"
    - "auth/session.py"
    - "docs/api/"
  priority: high
  deadline: "2026-02-15"
  estimated_effort_min: 120

narrative: |
  Please document the new authentication flow implemented in session #320.

  The new flow includes:
  - JWT-based session management
  - Refresh token rotation
  - Multi-device support

  Users will need clear guidance on how to authenticate and manage sessions.

statistics:
  estimated_pages: 3
  complexity: medium
---
```

**Parsing Benefits:**
```python
# Type-safe field access
msg = parse_iacm(path)

# Direct access (no regex)
priority = msg.request.priority          # Enum: critical/high/medium/low
deadline = msg.request.deadline          # Validated ISO 8601
files = msg.request.files_affected       # List[str]
effort = msg.request.estimated_effort_min # Integer (minutes)

# Metadata always available
thread = msg.meta.thread_id
reply_to = msg.meta.reply_to
timestamp = msg.meta.timestamp

# Human context preserved
context = msg.narrative
```

### 5.2 Key Improvements

| Aspect | Current (Markdown) | IACM (YAML) |
|--------|-------------------|-------------|
| **Structure** | Ad-hoc, varies by agent | Standardized, type-specific schema |
| **Parsing** | Regex, brittle | YAML parse, type-safe |
| **Validation** | None | Schema validation possible |
| **Metadata** | Inferred from filename | Explicit in meta section |
| **Threading** | None | thread_id, reply_to |
| **Versioning** | None | format_version field |
| **Human narrative** | Mixed with data | Dedicated narrative section |
| **Automation** | Difficult, requires heuristics | Straightforward, direct access |
| **Evolution** | Breaking changes | Versioned, backward compatible |

---

## 6. Benefits

### 6.1 For Agents (Automated Processing)

**Inbox Processing:**
```python
# Automatic message handling
inbox = load_inbox("Documenter")

for msg in inbox:
    if msg.meta.message_type == "REQUEST":
        if msg.request.priority in ["critical", "high"]:
            agent.prioritize(msg)
        if msg.request.deadline:
            agent.schedule(msg, before=msg.request.deadline)
```

**Thread Management:**
```python
# Reconstruct conversation
thread = load_thread(thread_id="auth-implementation-thread")

# Find original question
question = thread.find(message_type="QUESTION")

# Find answer
answer = thread.find(
    message_type="ANSWER",
    reply_to=question.meta.message_id
)
```

**Workflow Automation:**
```python
# Auto-create tasks from REQUESTs
for msg in inbox.filter(message_type="REQUEST"):
    task = Task(
        title=msg.request.task,
        priority=msg.request.priority,
        deadline=msg.request.deadline,
        estimated_effort=msg.request.estimated_effort_min
    )
    task_system.create(task)
```

### 6.2 For Humans (Comprehension)

**Clear Structure:**
- Meta section: Who, what, when, where (routing info)
- Type-specific section: Structured data (deadlines, priorities)
- Narrative section: Context, rationale, nuance
- Statistics section: Metrics, estimates

**Example Reading Flow:**
1. Check meta → "REQUEST from Orchestrator, urgent"
2. Check request → "Document auth flow, deadline Feb 15"
3. Read narrative → "Why: New JWT implementation, user guidance needed"
4. Check statistics → "Estimated 3 pages, medium complexity"

### 6.3 For Scripts (Analysis)

**Communication Patterns:**
```bash
# Most active communication pairs
python analyze_messages.py --metric communication_pairs --top 10

# Average response time QUESTION → ANSWER
python analyze_messages.py --metric response_time --type QUESTION

# Messages by priority distribution
python analyze_messages.py --metric priority_distribution
```

**Workload Analysis:**
```bash
# Total estimated effort in inbox
python analyze_inbox.py --agent Documenter --metric total_effort

# Messages past deadline
python analyze_inbox.py --agent Documenter --filter past_deadline

# Thread completion rate
python analyze_threads.py --metric completion_rate --last 30d
```

---

## 7. Migration Strategy (High-Level)

### 7.1 Backward Compatibility First

**Principle:** No breaking changes. Support both formats during transition.

**Approach:**
1. **Dual format support** — Parsers accept both Markdown and IACM
2. **Gradual adoption** — Agents start using IACM, keep reading Markdown
3. **Legacy archive** — Old Markdown messages remain readable
4. **No forced migration** — Existing messages don't need conversion

### 7.2 Phased Rollout

**Phase 1: Infrastructure (Week 1-2)**
- Create IACM specification (this document)
- Implement `parse_iacm.py` parser
- Implement `validate_iacm.py` schema validator
- Create templates for each message type
- Update `send_to.py` to support `--format iacm`

**Phase 2: Adoption (Week 3-4)**
- Update agent system prompts with IACM guidance
- Agents start generating IACM for new messages
- Maintain Markdown fallback for compatibility
- Monitor adoption rate

**Phase 3: Automation (Month 2)**
- Build inbox processing scripts for IACM
- Implement workflow automation (auto-task creation)
- Create analytics tools (communication patterns)
- Document automation patterns

**Phase 4: Standard (Month 3+)**
- IACM becomes default format
- Markdown deprecated for new messages (legacy read-only)
- 100% IACM adoption for new communication
- Evaluate lessons learned, iterate on spec

### 7.3 Compatibility Strategy

**Parser Behavior:**
```python
def process_inbox_message(filepath):
    """Handle both Markdown and IACM formats"""
    if filepath.endswith('.yaml'):
        # IACM format
        return parse_iacm(filepath)
    elif filepath.endswith('.md'):
        # Legacy Markdown format
        return parse_markdown_legacy(filepath)
    else:
        raise ValueError(f"Unknown format: {filepath}")
```

**Sender Behavior:**
```bash
# New messages default to IACM
send_to.py Documenter request.yaml --type REQUEST

# Legacy support (if needed)
send_to.py Documenter request.md --type REQUEST --format markdown
```

---


---

## 8. Detailed Message Type Schemas

This section provides complete schema definitions for all 11 IACM v1.0 message types.

**Organization:**
- Each message type includes: Schema definition, field specifications, examples, validation rules, and use cases
- Examples are complete and realistic (tested with PyYAML)
- Field constraints are explicitly specified for validation

---

### 8.1 REQUEST Message Type

**Category:** Directive  
**Purpose:** Request action or task delegation from another agent  
**Speech Act:** Directive (requests recipient to perform action)

#### Schema Definition

```yaml
---
meta:
  format_version: "IACM/1.0"                # REQUIRED
  message_type: REQUEST                     # REQUIRED
  from_agent: string                        # REQUIRED
  to_agent: string                          # REQUIRED
  timestamp: string                         # REQUIRED (ISO8601 UTC)
  message_id: string                        # REQUIRED (unique, kebab-case)
  thread_id: string | null                  # ENCOURAGED
  reply_to: string | null                   # ENCOURAGED

request:
  task: string                              # REQUIRED - What needs to be done
  context_structured:                       # OPTIONAL (v1.0), RECOMMENDED (v1.1+)
    background: string
    prerequisites: array
    related_work: array
  priority: enum                            # RECOMMENDED (critical|high|medium|low)
  deadline: string                          # OPTIONAL (ISO8601 UTC)
  deliverables: array                       # RECOMMENDED
  files_affected: array                     # OPTIONAL
  estimated_effort_min: integer             # OPTIONAL

narrative: |                                # REQUIRED
  Human-readable request with context

statistics:                                 # OPTIONAL
  estimated_pages: integer
  complexity: enum                          # low|medium|high
---
```

#### Field Specifications

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `request.task` | string | **REQUIRED** | Clear task description | Max 500 chars, imperative form |
| `request.priority` | enum | RECOMMENDED | Urgency level | critical, high, medium, low |
| `request.deadline` | string | OPTIONAL | Task deadline | ISO8601 UTC, future timestamp |
| `request.deliverables` | array | RECOMMENDED | Expected outputs | Max 10 items |
| `request.estimated_effort_min` | integer | OPTIONAL | Effort estimate | 1-10000 minutes |

#### Example

```yaml
---
meta:
  format_version: "IACM/1.0"
  message_type: REQUEST
  from_agent: Orchestrator
  to_agent: Documenter
  timestamp: "2026-02-12T14:30:00Z"
  message_id: "req-doc-auth-20260212-143000"
  thread_id: "auth-implementation-thread"
  reply_to: null

request:
  task: "Document new authentication flow for API users"
  priority: high
  deadline: "2026-02-15T23:59:59Z"
  deliverables:
    - deliverable: "API authentication guide (user-facing)"
      format: markdown
      location: "docs/guides/user/authentication.md"
    - deliverable: "API reference (endpoint documentation)"
      format: markdown
      location: "docs/api/auth_endpoints.md"
  files_affected:
    - "auth/login.py"
    - "auth/session.py"
  estimated_effort_min: 180

narrative: |
  Please document the new authentication flow implemented in Sprint 12.
  
  Context: We've redesigned authentication to use JWT-based sessions with
  refresh token rotation. Public API release is Feb 15.
  
  Success criteria:
  - Developers can authenticate without contacting support
  - Migration path is clear (step-by-step)
  - Security best practices highlighted

statistics:
  estimated_pages: 8
  complexity: medium
---
```

#### Validation Rules

- `request.task`: Required, non-empty, max 500 chars
- `request.priority`: Must be one of: critical, high, medium, low
- `request.deadline`: Must be ISO8601 UTC, future timestamp (> meta.timestamp)
- `request.deliverables`: Max 10 items

#### Use Cases

1. **Task Delegation:** Orchestrator assigns work to agent
2. **Clarification Request:** Agent needs additional information
3. **User-Initiated Task:** User requests feature via Orchestrator
4. **Error Recovery:** Agent requests assistance after failure

---

### 8.2 REPORT Message Type

**Category:** Informative  
**Purpose:** Inform about status, completion, or findings

#### Schema Definition

```yaml
---
meta:
  format_version: "IACM/1.0"
  message_type: REPORT
  from_agent: string
  to_agent: string
  timestamp: string
  message_id: string
  thread_id: string | null
  reply_to: string | null

report:
  subject: string                           # REQUIRED
  report_type: enum                         # RECOMMENDED (completion|status|findings|analysis|incident)
  summary: string                           # REQUIRED
  findings: array                           # RECOMMENDED
  status: enum                              # RECOMMENDED (completed|in_progress|blocked|deferred|cancelled)
  metrics: object                           # OPTIONAL
  deliverables_completed: array             # RECOMMENDED
  next_steps: array                         # RECOMMENDED

narrative: |                                # REQUIRED
  Detailed report with context
---
```

#### Example

```yaml
meta:
  format_version: "IACM/1.0"
  message_type: REPORT
  from_agent: Documenter
  to_agent: Orchestrator
  timestamp: "2026-02-14T18:30:00Z"
  message_id: "report-doc-auth-complete-20260214-183000"
  thread_id: "auth-implementation-thread"
  reply_to: "req-doc-auth-20260212-143000"

report:
  subject: "Authentication documentation completed"
  report_type: completion
  summary: "Completed all 3 authentication guides on schedule. Ready for review."
  status: completed
  deliverables_completed:
    - deliverable: "API authentication guide"
      location: "docs/guides/user/authentication.md"
    - deliverable: "API reference"
      location: "docs/api/auth_endpoints.md"
    - deliverable: "Migration guide"
      location: "docs/guides/migration/auth_v1_to_v2.md"
  next_steps:
    - action: "Security team review"
      assignee: SystemAdmin
      priority: high

narrative: |
  Task completion report: All 3 auth documentation deliverables complete.
  Total pages: 8. Time spent: 195 minutes (within estimate).
  
  Next: Security review before publication.
---
```

---

### 8.3 QUESTION Message Type

**Category:** Directive  
**Purpose:** Request clarification or information

#### Schema Definition

```yaml
---
meta:
  format_version: "IACM/1.0"
  message_type: QUESTION
  from_agent: string
  to_agent: string
  timestamp: string
  message_id: string
  thread_id: string | null
  reply_to: string | null

question:
  question: string                          # REQUIRED (must end with ?)
  context: string                           # RECOMMENDED
  question_type: enum                       # RECOMMENDED (clarification|decision|information|validation|opinion)
  urgency: enum                             # RECOMMENDED (critical|high|medium|low)
  options: array                            # OPTIONAL (if multiple choice)
  deadline: string                          # OPTIONAL (ISO8601 UTC)
  blocking: boolean                         # OPTIONAL

narrative: |                                # REQUIRED
  Detailed question with context
---
```

#### Example

```yaml
meta:
  format_version: "IACM/1.0"
  message_type: QUESTION
  from_agent: Implementer
  to_agent: Architect
  timestamp: "2026-02-12T11:00:00Z"
  message_id: "question-auth-approach-20260212-110000"
  thread_id: "auth-implementation-thread"
  reply_to: null

question:
  question: "Should we use JWT tokens or server-side sessions for authentication?"
  context: "Redesigning auth for v2.0 API. Need architectural decision before implementing."
  question_type: decision
  urgency: high
  options:
    - option: "JWT tokens with refresh rotation"
      rationale: "Stateless, scalable, industry standard"
    - option: "Server-side sessions with Redis"
      rationale: "Centralized control, easy invalidation"
  deadline: "2026-02-13T17:00:00Z"
  blocking: true

narrative: |
  Need architectural decision on auth approach (JWT vs sessions).
  This blocks all implementation work. Deadline: tomorrow 5pm.
---
```

---

### 8.4 ANSWER Message Type

**Category:** Informative  
**Purpose:** Provide answer in response to QUESTION

#### Schema Definition

```yaml
---
meta:
  format_version: "IACM/1.0"
  message_type: ANSWER
  from_agent: string
  to_agent: string
  timestamp: string
  message_id: string
  thread_id: string                         # REQUIRED (same as QUESTION)
  reply_to: string                          # REQUIRED (QUESTION message_id)

answer:
  question_id: string                       # REQUIRED (same as reply_to)
  answer: string                            # REQUIRED
  answer_type: enum                         # RECOMMENDED (definitive|conditional|deferred|partial)
  confidence: float                         # RECOMMENDED (0.0-1.0)
  sources: array                            # RECOMMENDED
  recommendations: array                    # OPTIONAL

narrative: |                                # REQUIRED
  Detailed answer with context
---
```

#### Example

```yaml
meta:
  format_version: "IACM/1.0"
  message_type: ANSWER
  from_agent: Architect
  to_agent: Implementer
  timestamp: "2026-02-12T15:00:00Z"
  message_id: "answer-auth-approach-20260212-150000"
  thread_id: "auth-implementation-thread"
  reply_to: "question-auth-approach-20260212-110000"

answer:
  question_id: "question-auth-approach-20260212-110000"
  answer: "Use JWT tokens with refresh token rotation (Option 1)."
  answer_type: definitive
  confidence: 0.95
  sources:
    - source: "ADR-325: JWT-based Authentication"
      type: document
      location: "docs/architecture/adrs/ADR-325-jwt-auth.md"
  recommendations:
    - "Use short-lived access tokens (15 min) and longer refresh tokens (7 days)"
    - "Implement token refresh rotation to prevent reuse attacks"

narrative: |
  Decision: Use JWT with refresh token rotation.
  
  Rationale: Stateless, scalable, works with distributed architecture.
  Mature libraries, industry standard. See ADR-325 for details.
---
```

---

### 8.5 PROPOSAL Message Type

**Category:** Commissive  
**Purpose:** Propose design, feature, or approach for decision

#### Schema & Example

```yaml
---
meta:
  format_version: "IACM/1.0"
  message_type: PROPOSAL
  from_agent: Architect
  to_agent: Orchestrator
  timestamp: "2026-02-10T09:00:00Z"
  message_id: "proposal-auth-redesign-20260210-090000"

proposal:
  title: string                             # REQUIRED
  proposal_type: enum                       # RECOMMENDED (architecture|feature|process|policy|technical)
  summary: string                           # REQUIRED
  rationale: string                         # REQUIRED
  alternatives: array                       # RECOMMENDED
  decision_needed_by: string                # RECOMMENDED (ISO8601 UTC)
  impact: object                            # RECOMMENDED
  risks: array                              # RECOMMENDED

narrative: |                                # REQUIRED
  Detailed proposal

# Example proposal:
proposal:
  title: "Redesign authentication using JWT tokens"
  proposal_type: architecture
  summary: "Replace session cookies with JWT for scalability"
  rationale: "Current sessions don't scale horizontally"
  decision_needed_by: "2026-02-12T17:00:00Z"
---
```

---

### 8.6 ACKNOWLEDGE Message Type

**Category:** Response/Closure  
**Purpose:** Confirm receipt and understanding

#### Schema & Example

```yaml
---
meta:
  format_version: "IACM/1.0"
  message_type: ACKNOWLEDGE
  from_agent: Documenter
  to_agent: Architect
  timestamp: "2026-02-13T01:00:00Z"
  message_id: "ack-guidance-20260213-010000"
  thread_id: "iacm-spec-thread"            # REQUIRED (same as acknowledged message)
  reply_to: "report-guidance-20260213"      # REQUIRED (acknowledged message_id)

acknowledge:
  acknowledged_message_id: string           # REQUIRED (same as reply_to)
  confirmation: string                      # REQUIRED
  understood: boolean                       # RECOMMENDED
  actions_taken: array                      # OPTIONAL
  next_steps: array                         # OPTIONAL

narrative: |                                # REQUIRED
  Acknowledgment details

# Example acknowledge:
acknowledge:
  acknowledged_message_id: "report-guidance-20260213"
  confirmation: "IACM guidance received and understood. Phase 1 deliverables confirmed."
  understood: true
  next_steps:
    - step: "Complete IACM v1.0 spec"
      eta: "2026-02-19T23:59:59Z"
---
```

---

### 8.7 ACCEPT Message Type

**Category:** Response/Closure (Commissive)  
**Purpose:** Accept proposal and commit to implementing

#### Schema & Example

```yaml
---
meta:
  format_version: "IACM/1.0"
  message_type: ACCEPT
  from_agent: Orchestrator
  to_agent: Architect
  timestamp: "2026-02-11T10:00:00Z"
  message_id: "accept-auth-redesign-20260211-100000"
  thread_id: "auth-thread"
  reply_to: "proposal-auth-redesign-20260210"

accept:
  proposal_id: string                       # REQUIRED (same as reply_to)
  acceptance_type: enum                     # RECOMMENDED (unconditional|conditional|provisional)
  conditions: array                         # OPTIONAL
  commitment: string                        # REQUIRED
  timeline: object                          # RECOMMENDED
  assignees: array                          # RECOMMENDED

narrative: |                                # REQUIRED
  Acceptance details

# Example accept:
accept:
  proposal_id: "proposal-auth-redesign-20260210"
  acceptance_type: conditional
  conditions:
    - "Security team review before production"
  commitment: "Approve JWT auth redesign. Allocate resources for 10-day sprint."
  timeline:
    start_date: "2026-02-12T09:00:00Z"
    target_completion: "2026-02-22T17:00:00Z"
---
```

---

### 8.8 REJECT Message Type

**Category:** Response/Closure  
**Purpose:** Reject proposal with rationale

#### Schema & Example

```yaml
---
meta:
  format_version: "IACM/1.0"
  message_type: REJECT
  from_agent: Architect
  to_agent: Implementer
  timestamp: "2026-02-15T11:00:00Z"
  message_id: "reject-graphql-20260215-110000"
  thread_id: "api-redesign-thread"
  reply_to: "proposal-graphql-20260214"

reject:
  proposal_id: string                       # REQUIRED (same as reply_to)
  rationale: string                         # REQUIRED
  concerns: array                           # RECOMMENDED
  alternative_suggested: string             # OPTIONAL
  reconsideration_conditions: array         # OPTIONAL

narrative: |                                # REQUIRED
  Rejection details

# Example reject:
reject:
  proposal_id: "proposal-graphql-20260214"
  rationale: "GraphQL adds complexity for minimal benefit at current scale"
  concerns:
    - concern: "Learning curve (no team GraphQL experience)"
      severity: high
  alternative_suggested: "Enhance REST API with better filtering (JSON:API style)"
---
```

---

### 8.9 DEFER Message Type

**Category:** Response/Closure  
**Purpose:** Postpone decision pending additional information

#### Schema & Example

```yaml
---
meta:
  format_version: "IACM/1.0"
  message_type: DEFER
  from_agent: Architect
  to_agent: Implementer
  timestamp: "2026-02-16T09:00:00Z"
  message_id: "defer-caching-20260216-090000"
  thread_id: "performance-thread"
  reply_to: "question-caching-20260215"

defer:
  deferred_message_id: string               # REQUIRED (same as reply_to)
  reason: string                            # REQUIRED
  missing_information: array                # RECOMMENDED
  revisit_date: string                      # RECOMMENDED (ISO8601 UTC)
  conditions_for_resolution: array          # RECOMMENDED

narrative: |                                # REQUIRED
  Deferral explanation

# Example defer:
defer:
  deferred_message_id: "question-caching-20260215"
  reason: "Need performance benchmarks before deciding caching strategy"
  missing_information:
    - information: "Current response time metrics"
      source: "Observer - performance dashboard"
  revisit_date: "2026-02-20T10:00:00Z"
---
```

---

### 8.10 FYI Message Type

**Category:** Informative  
**Purpose:** Share information (no action required)

#### Schema & Example

```yaml
---
meta:
  format_version: "IACM/1.0"
  message_type: FYI
  from_agent: SystemAdmin
  to_agent: Orchestrator
  timestamp: "2026-02-16T08:00:00Z"
  message_id: "fyi-maintenance-20260216-080000"

fyi:
  subject: string                           # REQUIRED
  information: string                       # REQUIRED
  relevance: string                         # RECOMMENDED
  information_type: enum                    # RECOMMENDED (update|announcement|observation|insight|warning)
  action_required: boolean                  # RECOMMENDED (default: false)
  expiry_date: string                       # OPTIONAL (ISO8601 UTC)

narrative: |                                # REQUIRED
  Detailed information

# Example FYI:
fyi:
  subject: "Scheduled server maintenance - Feb 20"
  information: "Production servers maintenance Feb 20, 02:00-04:00 UTC. Expected downtime: 15 minutes."
  relevance: "May affect scheduled deployments during maintenance window"
  information_type: announcement
  action_required: false
  expiry_date: "2026-02-21T00:00:00Z"

narrative: |
  FYI: Routine server maintenance scheduled.
  Brief service interruption expected (15 min). No action required.
---
```

---

### 8.11 URGENT Message Type

**Category:** Priority Modifier  
**Purpose:** Escalate priority for time-sensitive issues

#### Schema & Example

```yaml
---
meta:
  format_version: "IACM/1.0"
  message_type: URGENT
  from_agent: Observer
  to_agent: Implementer
  timestamp: "2026-02-18T14:00:00Z"
  message_id: "urgent-auth-failure-20260218-140000"
  thread_id: "production-incident-20260218"

urgent:
  issue: string                             # REQUIRED
  severity: enum                            # REQUIRED (critical|high|medium)
  urgency_reason: string                    # REQUIRED
  action_needed: string                     # REQUIRED
  action_needed_by: string                  # REQUIRED (ISO8601 UTC, future)
  escalation_to: string                     # RECOMMENDED
  blocking: array                           # RECOMMENDED
  attempted_resolution: array               # OPTIONAL

narrative: |                                # REQUIRED
  Urgent issue details

# Example URGENT:
urgent:
  issue: "Authentication endpoint returning 500 errors (100% failure)"
  severity: critical
  urgency_reason: "All users unable to log in. 500 active users affected."
  action_needed: "Investigate auth endpoint failure and restore service"
  action_needed_by: "2026-02-18T15:00:00Z"
  escalation_to: "SystemAdmin"
  blocking:
    - blocked_entity: "All user logins"
      impact: "500 users cannot access system"

narrative: |
  URGENT: Production authentication outage.
  Auth endpoint completely down since 13:45 UTC.
  Need immediate investigation and fix.
---
```

---

## Summary: Section 8 Complete

✅ **All 11 message types specified with:**
- Schema definitions (YAML structure)
- Field specifications (types, constraints, required/optional)
- Complete, realistic examples
- Validation rules
- Use cases

**Message Types:**
1. REQUEST - Task delegation
2. REPORT - Status/completion reports
3. QUESTION - Clarification requests
4. ANSWER - Responses to questions
5. PROPOSAL - Design/feature proposals
6. ACKNOWLEDGE - Receipt confirmation
7. ACCEPT - Proposal acceptance
8. REJECT - Proposal rejection
9. DEFER - Decision postponement
10. FYI - Informational messages
11. URGENT - Priority escalation

---

## 9. IACM v1.1 Preview

**Status:** Planned for Weeks 7-8 (Phase 2)  
**Note:** This section previews upcoming v1.1 enhancements. Not part of v1.0 implementation.

### 9.1 ERROR Message Type (v1.1)

**Priority:** CRITICAL per Observer, PromptCraft  
**Purpose:** Structured error reporting for machine-parseable error handling

#### Schema (v1.1)

```yaml
---
meta:
  format_version: "IACM/1.1"
  message_type: ERROR

error:
  code: string                              # REQUIRED - Standardized error code
  severity: enum                            # REQUIRED (blocking|warning|info)
  category: string                          # REQUIRED - Error category
  message: string                           # REQUIRED - Human-readable error
  missing_prerequisites: array              # OPTIONAL
  suggested_actions: array                  # OPTIONAL
  can_retry: boolean                        # OPTIONAL
  retry_conditions: array                   # OPTIONAL

narrative: |
  Error context and details
---
```

**Example ERROR (v1.1):**

```yaml
meta:
  format_version: "IACM/1.1"
  message_type: ERROR
  from_agent: Documenter
  to_agent: Orchestrator
  timestamp: "2026-03-15T10:00:00Z"
  message_id: "error-insufficient-context-20260315-100000"

error:
  code: "INSUFFICIENT_CONTEXT"
  severity: "blocking"
  category: "missing_prerequisites"
  message: "Cannot complete REQUEST: Missing architectural context"
  missing_prerequisites:
    - type: "document"
      path: "docs/architecture/adrs/ADR-XXX-auth.md"
      required: true
  suggested_actions:
    - "Request ADR from Architect"
    - "Defer task until context available"
  can_retry: true
  retry_conditions:
    - "ADR-XXX-auth.md available"

narrative: |
  Error: Cannot document auth flow without architectural context.
  Need ADR-XXX-auth.md before proceeding.
---
```

**See:** `docs/specifications/ERROR_CODE_TAXONOMY.md` for complete error codes (v1.1)

---

### 9.2 Task Lifecycle Extension (v1.1)

**Priority:** CRITICAL per Metamodel, Observer  
**Purpose:** Track task state through lifecycle for bottleneck detection

#### REQUEST Extension (v1.1)

```yaml
request:
  task: "..."
  # ... other fields ...
  
  task_lifecycle:                           # NEW in v1.1
    state: enum                             # proposed|accepted|in_progress|blocked|completed
    state_history: array                    # State transitions with timestamps
    blocked_by: string | null               # Blocking message_id (if blocked)
```

**Lifecycle States:**
- `proposed`: Initial state (REQUEST sent)
- `accepted`: Recipient accepted task
- `in_progress`: Work started
- `blocked`: Work stopped (dependency missing)
- `completed`: Work finished

**Metamodel Alignment:** Maps to UFO Goal_Directed_Process phases

---

### 9.3 Epistemic Dimension (v1.1)

**Priority:** HIGH per Metamodel  
**Purpose:** Track certainty and evidence for claims/decisions

#### Meta Extension (v1.1)

```yaml
meta:
  # ... standard fields ...
  
  epistemic:                                # NEW in v1.1
    certainty: float                        # 0.0-1.0 (confidence level)
    epistemic_status: enum                  # speculative|probable|confident|certain
    evidence: enum                          # none|anecdotal|observational|empirical|logical
    assumptions: array                      # Explicit assumptions made
```

**Use Cases:**
- ANSWER messages: Indicate confidence in answer
- PROPOSAL messages: Certainty of impact estimates
- REPORT messages: Confidence in findings

**Metamodel Alignment:** Maps to UFO::Moment (mental moment representing belief state)

---

### 9.4 Provenance Tracking (v1.1)

**Priority:** HIGH per Observer  
**Purpose:** Track message origin and transformation for audit trail

#### Meta Extension (v1.1)

```yaml
meta:
  # ... standard fields ...
  
  provenance:                               # NEW in v1.1
    created_by_session: string              # Session identifier
    created_at_commit: string               # Git commit hash
    derived_from: array                     # Source message_ids
    transformations: array                  # Message edits/forwards
```

**Use Cases:**
- Audit trail: Track message lineage
- Session linkage: Connect messages to work sessions
- Transformation tracking: Track message edits

**Observer Integration:** Enables dashboard queries linking messages to commits and sessions

---

### 9.5 Enhanced Context (v1.1)

**Priority:** MEDIUM per PromptCraft  
**Purpose:** Richer structured context for complex workflows

#### REQUEST Extension (v1.1)

```yaml
request:
  context_structured:
    background: string
    prerequisites: array
      - type: enum                          # document|data|approval|access
        path: string
        required: boolean
        status: enum                        # NEW: pending|satisfied|blocked
    related_work: array
      - message_id: string
        relationship: enum                  # blocks|follows_from|depends_on|relates_to
        status: enum                        # NEW: pending|completed|blocked
```

**Enhancement:** Add `status` field to track prerequisite/dependency satisfaction

---

### 9.6 v1.1 Timeline

**Weeks 7-8 (Phase 2):**
- Extend schemas for v1.1 features
- Update validator for new fields
- Create ERROR_CODE_TAXONOMY.md (error codes)
- Update templates (PromptCraft)
- Implement HyperGraph integration (Observer)

**Migration:** v1.0 messages remain valid in v1.1 (backward compatible)

---

## 10. Validation Rules

### 10.1 General Validation (All Message Types)

**Required Fields (Universal):**
- `meta.format_version` = "IACM/1.0"
- `meta.message_type` ∈ {REQUEST, REPORT, QUESTION, ANSWER, PROPOSAL, ACKNOWLEDGE, ACCEPT, REJECT, DEFER, FYI, URGENT}
- `meta.from_agent` (non-empty, PascalCase)
- `meta.to_agent` (non-empty, PascalCase)
- `meta.timestamp` (ISO8601 UTC: `YYYY-MM-DDTHH:MM:SSZ`)
- `meta.message_id` (unique, kebab-case with type prefix)
- `narrative` (non-empty string, max 5000 chars)

**Format Validation:**
- Timestamps: `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$`
- Message IDs: `^(req|report|question|answer|proposal|ack|accept|reject|defer|fyi|urgent)-[a-z0-9-]+$`
- Agent names: PascalCase (e.g., `Orchestrator`, `Documenter`)

**Threading Validation:**
- If `meta.reply_to` is not null, `meta.thread_id` must be present
- `meta.reply_to` must reference existing message_id (if not null)
- Thread structure must be acyclic (DAG, no loops)

### 10.2 Type-Specific Validation

**ANSWER:**
- `meta.thread_id` required (same as QUESTION)
- `meta.reply_to` required (QUESTION message_id)
- `answer.question_id` must equal `meta.reply_to`

**ACKNOWLEDGE, ACCEPT, REJECT, DEFER:**
- `meta.reply_to` required
- Type-specific `*_id` field must equal `meta.reply_to`

**URGENT:**
- `urgent.action_needed_by` must be future timestamp (> `meta.timestamp`)
- `urgent.severity` = critical → deadline <4 hours recommended
- `urgent.severity` = high → deadline <24 hours recommended

### 10.3 Parser Implementation

**Reference Parser:** `Agents/scripts/iacm/parse_iacm.py` (Implementer deliverable)

**Validation Modes:**
- **Strict:** Reject messages with missing required fields or invalid types
- **Lenient:** Accept with warnings for optional field issues
- **v1.0:** Validate only v1.0 fields (ignore v1.1 extensions)

---

## 11. Success Criteria

### 11.1 Specification Completeness

- [✅] All 11 message types fully specified
- [✅] Field specifications complete (types, constraints, examples)
- [✅] Validation rules defined
- [✅] v1.1 preview documented
- [✅] Examples tested (valid YAML, realistic content)

### 11.2 Implementation Readiness

- [✅] Implementer can build parser without clarification questions
- [✅] PromptCraft can create templates directly from schemas
- [✅] Metamodel validates: 100% ontologically coherent
- [✅] Observer can extract 13 metrics from metadata fields

### 11.3 Usability

- [✅] Human-readable (developers understand schemas)
- [✅] Machine-parseable (YAML, validatable)
- [✅] Clear examples (one per message type minimum)
- [✅] Migration path defined (Markdown → IACM)

### 11.4 Adoption Metrics (Post-Implementation)

**Target (3 months):**
- Adoption rate: >80% of new messages use IACM
- Parser success: >95% of IACM messages parse without errors
- Agent satisfaction: Easier inbox processing reported

---

## 12. References

### 12.1 Architectural Decision Records

- **ADR-438:** IACM Format Adoption — `docs/architecture/adrs/ADR-438-iacm-format-adoption.md`
- **ADR-439:** TOON Format Evaluation (Deferred) — `docs/architecture/adrs/ADR-439-toon-format-evaluation-deferral.md`
- **ADR-429:** Inter-Agent Messaging Protocol v1.1 — Foundation for IACM
- **ADR-001:** Tool-First Design — Principle guiding IACM development

### 12.2 Related Specifications

- **Messaging System v1.1 Completion Report:** `docs/architecture/reports/completion/MESSAGING_SYSTEM_V11_COMPLETION_2026-02-12.md`
- **IOCR Format Specification:** `docs/specifications/stable/IOCR_FORMAT_SPECIFICATION.md` (inspiration)
- **ERROR Code Taxonomy:** `docs/specifications/ERROR_CODE_TAXONOMY.md` (v1.1, Week 1 deliverable)

### 12.3 Implementation Components

**Tooling (Implementer — as-built 2026-02-27):**
- `Agents/scripts/iacm_validator.py` — Standalone IACM schema validator (replaces planned `validate_iacm.py`)
- `Agents/scripts/send_to.py` v2.0 — Message sender with IACM support, inline parsing and validation (replaces planned `parse_iacm.py`)
- `schemas/iacm_v1.0.schema.json` — Official JSON Schema

**Templates (PromptCraft — as-built 2026-02-27):**
- 11 base templates (one per message type) → `.claude/templates/iacm/`
- 12 high-value specialized variants → `.claude/templates/iacm/`
- Template index → `.claude/templates/iacm/INDEX.md`
- Quick-send CLI: `send_to.py --quick TYPE --subject "..." --body "..."`

**Documentation (Documenter):**
- `docs/guides/IACM_QUICKSTART.md` — Quick reference guide
- `docs/guides/IACM_MIGRATION_GUIDE.md` — Markdown → IACM migration
- `docs/specifications/IACM_FORMAT_SPECIFICATION.md` — This document (authoritative)

### 12.4 External References

- **YAML Specification:** https://yaml.org/spec/1.2.2/
- **ISO 8601 (Timestamps):** https://en.wikipedia.org/wiki/ISO_8601
- **Speech Act Theory:** Foundation for message type categorization

### 12.5 Specialist Reviews

- **Metamodel:** Ontological validation (100% coherent with UFO + embryonic/v1)
- **PromptCraft:** Usability assessment (usable with quick-send CLI)
- **Observer:** Observability validation (9.5/10 with v1.1 enhancements)

---

## Document History

**v0.1.0-draft (2026-02-12):**
- Initial proposal with general approach
- Sections 1-7 complete (philosophy, structure, benefits)
- Detailed schemas pending

**v1.0 (2026-02-13):**
- ✅ APPROVED (ADR-438)
- All 11 message type schemas complete
- Field specifications, validation rules, examples
- v1.1 preview section
- Ready for implementation (Weeks 1-6)

**Next Version: v1.1 (Weeks 7-8):**
- ERROR message type implementation
- Task lifecycle, epistemic dimension, provenance
- Enhanced context (prerequisite status tracking)

---

**Status:** ✅ **APPROVED FOR IMPLEMENTATION**  
**Version:** 1.0  
**Created:** 2026-02-12  
**Approved:** 2026-02-13  
**Author:** Documenter Agent  
**Architectural Review:** Architect, Metamodel, PromptCraft, Observer  

**ADR:** ADR-438 (IACM Format Adoption)  
**Implementation:** Weeks 1-6 (Feb 13 - Mar 26, 2026)  

---

**End of IACM Format Specification v1.0**

