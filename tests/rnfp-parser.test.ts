/**
 * rnfp-parser.test.ts — Tests for RNFP parser functions.
 */

import { describe, test, expect } from "bun:test";
import {
  detectsRnfpMessage,
  extractRnfpType,
  extractRnfpOperators,
  extractBodyField,
  parseRnfpMessage,
  validateRnfpMessage,
} from "../src/core/rnfp/rnfp-parser";
import {
  buildFedInvite,
  buildFedAccept,
  buildFedRevoke,
  buildGraphAnnounce,
  formatRnfpForChat,
} from "../src/core/rnfp/rnfp-builders";

// ─── Sample messages ──────────────────────────────────────────────────────────

const INVITE_TEXT = `[CLC-FED-INVITE-v1] 🤝
from_operator: alice
to_operator: bob
fingerprint: a1b2c3d4e5f6a7b8
capabilities: graph_share,signed_messages
proposal: Federate our ecosystems
timestamp: 2026-04-10T12:00:00.000Z
message_id: fed-invite-test-001
signature: mock-sig-0042-alice
───────────────
alice invites bob to federate.`;

const ANNOUNCE_TEXT = `[CLC-GRAPH-ANNOUNCE-v1] 📢
from_operator: alice
to_operator: *
fingerprint: a1b2c3d4e5f6a7b8
package_id: pkg-001
node_count: 5
content_type: cyborg_session
timestamp: 2026-04-10T12:00:00.000Z
message_id: graph-announce-test-001
signature: mock-sig-0030-alice
───────────────
Announcing graph package.`;

// ─── detectsRnfpMessage ───────────────────────────────────────────────────────

describe("detectsRnfpMessage", () => {
  test("returns true for CLC-FED-INVITE-v1", () => {
    expect(detectsRnfpMessage(INVITE_TEXT)).toBe(true);
  });

  test("returns true for CLC-GRAPH-ANNOUNCE-v1", () => {
    expect(detectsRnfpMessage(ANNOUNCE_TEXT)).toBe(true);
  });

  test("returns false for IACM format", () => {
    expect(detectsRnfpMessage("[REQUEST] 📥 alpha → beta\nsome text")).toBe(false);
  });

  test("returns false for plain text", () => {
    expect(detectsRnfpMessage("Hello world")).toBe(false);
  });

  test("detects all 8 RNFP types", () => {
    const types = [
      "[CLC-FED-INVITE-v1]",
      "[CLC-FED-ACCEPT-v1]",
      "[CLC-FED-REJECT-v1]",
      "[CLC-FED-REVOKE-v1]",
      "[CLC-GRAPH-ANNOUNCE-v1]",
      "[CLC-GRAPH-REQUEST-v1]",
      "[CLC-GRAPH-PKG-v1]",
      "[CLC-UNKNOWN-MSG-v1]",
    ];
    for (const t of types) {
      expect(detectsRnfpMessage(`${t}\nfrom_operator: test`)).toBe(true);
    }
  });
});

// ─── extractRnfpType ──────────────────────────────────────────────────────────

describe("extractRnfpType", () => {
  test("extracts CLC-FED-INVITE", () => {
    expect(extractRnfpType(INVITE_TEXT)).toBe("CLC-FED-INVITE");
  });

  test("extracts CLC-GRAPH-ANNOUNCE", () => {
    expect(extractRnfpType(ANNOUNCE_TEXT)).toBe("CLC-GRAPH-ANNOUNCE");
  });

  test("returns undefined for plain text", () => {
    expect(extractRnfpType("plain text")).toBeUndefined();
  });
});

// ─── extractRnfpOperators ─────────────────────────────────────────────────────

describe("extractRnfpOperators", () => {
  test("extracts from_operator and to_operator", () => {
    const result = extractRnfpOperators(INVITE_TEXT);
    expect(result?.from_operator).toBe("alice");
    expect(result?.to_operator).toBe("bob");
  });

  test("to_operator is * for broadcast", () => {
    const result = extractRnfpOperators(ANNOUNCE_TEXT);
    expect(result?.to_operator).toBe("*");
  });

  test("returns undefined for non-RNFP text", () => {
    expect(extractRnfpOperators("not rnfp")).toBeUndefined();
  });
});

// ─── extractBodyField ─────────────────────────────────────────────────────────

describe("extractBodyField", () => {
  test("extracts fingerprint", () => {
    expect(extractBodyField(INVITE_TEXT, "fingerprint")).toBe("a1b2c3d4e5f6a7b8");
  });

  test("extracts proposal", () => {
    expect(extractBodyField(INVITE_TEXT, "proposal")).toBe("Federate our ecosystems");
  });

  test("returns undefined for missing field", () => {
    expect(extractBodyField(INVITE_TEXT, "nonexistent_field")).toBeUndefined();
  });
});

// ─── parseRnfpMessage ─────────────────────────────────────────────────────────

describe("parseRnfpMessage", () => {
  test("parses a valid CLC-FED-INVITE-v1 message", () => {
    const result = parseRnfpMessage(INVITE_TEXT);
    expect(result.success).toBe(true);
    expect(result.message?.meta.from_operator).toBe("alice");
    expect(result.message?.meta.to_operator).toBe("bob");
    expect(result.message?.meta.fingerprint).toBe("a1b2c3d4e5f6a7b8");
  });

  test("parses CLC-GRAPH-ANNOUNCE-v1 meta fields", () => {
    const result = parseRnfpMessage(ANNOUNCE_TEXT);
    expect(result.success).toBe(true);
    expect(result.message?.meta.message_id).toBe("graph-announce-test-001");
  });

  test("extracts narrative after separator", () => {
    const result = parseRnfpMessage(INVITE_TEXT);
    expect(result.message?.narrative).toBe("alice invites bob to federate.");
  });

  test("fails for non-RNFP input", () => {
    const result = parseRnfpMessage("not an rnfp message");
    expect(result.success).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  test("lenient mode succeeds even with missing optional fields", () => {
    const minimal = "[CLC-FED-REJECT-v1]\nfrom_operator: alice\n───\nrejected";
    expect(parseRnfpMessage(minimal, "lenient").success).toBe(true);
  });

  test("strict mode fails when fingerprint missing", () => {
    const noFp = "[CLC-FED-INVITE-v1]\nfrom_operator: alice\n───\nnarrative";
    const result = parseRnfpMessage(noFp, "strict");
    expect(result.success).toBe(false);
    expect(result.errors?.some(e => e.includes("fingerprint"))).toBe(true);
  });
});

// ─── Round-trip: build → format → parse ───────────────────────────────────────

describe("RNFP round-trip (build → format → parse)", () => {
  test("buildFedInvite → formatRnfpForChat → parseRnfpMessage", () => {
    const msg = buildFedInvite(
      "alice", "bob", "fp-alice-001",
      { fingerprint: "fp-alice-001", capabilities: ["graph_share"], proposal: "Let's federate!" },
      "alice invites bob.",
    );
    const text = formatRnfpForChat(msg);
    expect(detectsRnfpMessage(text)).toBe(true);

    const parsed = parseRnfpMessage(text);
    expect(parsed.success).toBe(true);
    expect(parsed.message?.meta.from_operator).toBe("alice");
    expect(parsed.message?.meta.to_operator).toBe("bob");
  });

  test("buildFedRevoke → formatRnfpForChat → detectsRnfpMessage", () => {
    const msg = buildFedRevoke(
      "bob", "alice", "fp-bob-001",
      { reason: "OPERATOR_REVOKED" },
      "bob revokes federation.",
    );
    const text = formatRnfpForChat(msg);
    expect(detectsRnfpMessage(text)).toBe(true);
    expect(extractBodyField(text, "reason")).toBe("OPERATOR_REVOKED");
  });

  test("buildGraphAnnounce includes package_id", () => {
    const msg = buildGraphAnnounce(
      "alice", "*", "fp-alice-001",
      { package_id: "pkg-xyz-001", node_count: 3, description: "test" },
      "Announcing package.",
    );
    const text = formatRnfpForChat(msg);
    expect(extractBodyField(text, "package_id")).toBe("pkg-xyz-001");
    expect(extractBodyField(text, "node_count")).toBe("3");
  });
});

// ─── validateRnfpMessage ──────────────────────────────────────────────────────

describe("validateRnfpMessage", () => {
  test("returns empty array for valid message", () => {
    const msg = buildFedAccept(
      "bob", "alice", "fp-bob-001",
      { fingerprint: "fp-bob-001", capabilities: ["graph_share"], confirmation: "Accepted." },
      "bob accepts.",
    );
    expect(validateRnfpMessage(msg)).toEqual([]);
  });

  test("detects missing fingerprint", () => {
    const msg = buildFedInvite(
      "alice", "bob", "",
      { fingerprint: "", capabilities: [], proposal: "test" },
      "narrative",
    );
    const errors = validateRnfpMessage(msg);
    expect(errors.some(e => e.includes("fingerprint"))).toBe(true);
  });
});
