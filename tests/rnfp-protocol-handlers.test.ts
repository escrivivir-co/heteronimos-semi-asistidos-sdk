/**
 * rnfp-protocol-handlers.test.ts — Tests for RNFP protocol state machine.
 */

import { describe, test, expect } from "bun:test";
import { rnfpProtocolHandler, FEDERATION_HELP } from "../src/core/rnfp/rnfp-protocol-handlers";
import { RNFP_INTENTS } from "../src/core/rnfp/rnfp-categories";
import type { RnfpBotVars } from "../src/core/rnfp/rnfp-bot-plugin";

function makeVars(overrides: Partial<RnfpBotVars> = {}): RnfpBotVars {
  return {
    fed_state: "idle",
    active_peer: undefined,
    pending_package_id: undefined,
    cyborg_identity: undefined,
    cyborg_fingerprint: undefined,
    ...overrides,
  } as RnfpBotVars;
}

function makeResult(intent: string, entities?: Record<string, unknown>) {
  return { intent, entities: entities ?? {}, confidence: 0.95, stars: [], originalInput: "" };
}

const OPERATOR = "alice";
const FP = "fp-alice-001";
const handler = rnfpProtocolHandler<RnfpBotVars>(OPERATOR, FP);

// ─── Guard: non-RNFP intents ──────────────────────────────────────────────────

describe("rnfpProtocolHandler guard", () => {
  test("returns undefined for non-rnfp.* intent", () => {
    const vars = makeVars();
    const result = handler(makeResult("iacm.send.request"), vars);
    expect(result).toBeUndefined();
  });
});

// ─── Meta intents ─────────────────────────────────────────────────────────────

describe("rnfpProtocolHandler meta", () => {
  test("returns status page on rnfp.status", () => {
    const vars = makeVars();
    const text = handler(makeResult(RNFP_INTENTS.STATUS), vars);
    expect(text).toContain("alice");
    expect(text).toContain("RNFP/1.0");
    expect(text).toContain("idle");
  });

  test("returns FEDERATION_HELP on rnfp.protocol.help", () => {
    const vars = makeVars();
    const text = handler(makeResult(RNFP_INTENTS.HELP), vars);
    expect(text).toBe(FEDERATION_HELP);
  });

  test("returns identity card on rnfp.identity", () => {
    const vars = makeVars();
    const text = handler(makeResult(RNFP_INTENTS.IDENTITY), vars);
    expect(text).toContain("alice");
    expect(text).toContain(FP);
  });

  test("returns peers list on rnfp.list.peers (no peers)", () => {
    const vars = makeVars();
    const text = handler(makeResult(RNFP_INTENTS.LIST_PEERS), vars);
    expect(text).toContain("No active peers");
  });
});

// ─── Inbound: RECEIVED_INVITE ─────────────────────────────────────────────────

describe("rnfpProtocolHandler RECEIVED_INVITE", () => {
  test("transitions to awaiting_accept", () => {
    const vars = makeVars();
    handler(makeResult(RNFP_INTENTS.RECEIVED_INVITE, { from_operator: "bob" }), vars);
    expect(vars.fed_state).toBe("awaiting_accept");
    expect(vars.active_peer).toBe("bob");
  });

  test("response mentions from_operator", () => {
    const vars = makeVars();
    const text = handler(makeResult(RNFP_INTENTS.RECEIVED_INVITE, { from_operator: "bob" }), vars);
    expect(text).toContain("bob");
    expect(text).toContain("invite");
  });
});

// ─── Inbound: RECEIVED_ACCEPT ─────────────────────────────────────────────────

describe("rnfpProtocolHandler RECEIVED_ACCEPT", () => {
  test("transitions awaiting_accept → active", () => {
    const vars = makeVars({ fed_state: "awaiting_accept", active_peer: "bob" });
    handler(makeResult(RNFP_INTENTS.RECEIVED_ACCEPT, { from_operator: "bob" }), vars);
    expect(vars.fed_state).toBe("active");
  });

  test("ignores ACCEPT when no pending invite", () => {
    const vars = makeVars({ fed_state: "idle" });
    const text = handler(makeResult(RNFP_INTENTS.RECEIVED_ACCEPT, { from_operator: "bob" }), vars);
    expect(text).toContain("no pending invite");
    expect(vars.fed_state).toBe("idle");
  });
});

// ─── Inbound: RECEIVED_REJECT ─────────────────────────────────────────────────

describe("rnfpProtocolHandler RECEIVED_REJECT", () => {
  test("transitions back to idle", () => {
    const vars = makeVars({ fed_state: "awaiting_accept", active_peer: "bob" });
    handler(makeResult(RNFP_INTENTS.RECEIVED_REJECT, { from_operator: "bob" }), vars);
    expect(vars.fed_state).toBe("idle");
    expect(vars.active_peer).toBeUndefined();
  });

  test("response mentions rejection", () => {
    const vars = makeVars({ fed_state: "awaiting_accept", active_peer: "bob" });
    const text = handler(makeResult(RNFP_INTENTS.RECEIVED_REJECT, { from_operator: "bob" }), vars);
    expect(text).toContain("rejected");
  });
});

// ─── Inbound: RECEIVED_REVOKE ─────────────────────────────────────────────────

describe("rnfpProtocolHandler RECEIVED_REVOKE", () => {
  test("resets state to idle", () => {
    const vars = makeVars({ fed_state: "active", active_peer: "bob" });
    handler(makeResult(RNFP_INTENTS.RECEIVED_REVOKE, { from_operator: "bob" }), vars);
    expect(vars.fed_state).toBe("idle");
    expect(vars.active_peer).toBeUndefined();
  });
});

// ─── Inbound: RECEIVED_ANNOUNCE ──────────────────────────────────────────────

describe("rnfpProtocolHandler RECEIVED_ANNOUNCE", () => {
  test("stores pending_package_id", () => {
    const vars = makeVars();
    handler(
      makeResult(RNFP_INTENTS.RECEIVED_ANNOUNCE, { from_operator: "bob", package_id: "pkg-007" }),
      vars,
    );
    expect(vars.pending_package_id).toBe("pkg-007");
  });
});

// ─── Outbound: SEND_INVITE ────────────────────────────────────────────────────

describe("rnfpProtocolHandler SEND_INVITE", () => {
  test("transitions to awaiting_accept", () => {
    const vars = makeVars();
    handler(makeResult(RNFP_INTENTS.SEND_INVITE), vars);
    expect(vars.fed_state).toBe("awaiting_accept");
  });
});

// ─── Outbound: SEND_ACCEPT ────────────────────────────────────────────────────

describe("rnfpProtocolHandler SEND_ACCEPT", () => {
  test("generates CLC-FED-ACCEPT-v1 message when pending invite exists", () => {
    const vars = makeVars({ fed_state: "awaiting_accept", active_peer: "bob" });
    const text = handler(makeResult(RNFP_INTENTS.SEND_ACCEPT), vars)!;
    expect(text).toContain("[CLC-FED-ACCEPT-v1]");
    expect(vars.fed_state).toBe("active");
  });

  test("returns warning when no pending invite", () => {
    const vars = makeVars({ fed_state: "idle" });
    const text = handler(makeResult(RNFP_INTENTS.SEND_ACCEPT), vars)!;
    expect(text).toContain("Cannot accept");
  });
});

// ─── Outbound: SEND_REVOKE ────────────────────────────────────────────────────

describe("rnfpProtocolHandler SEND_REVOKE", () => {
  test("generates CLC-FED-REVOKE-v1 and resets state", () => {
    const vars = makeVars({ fed_state: "active", active_peer: "bob" });
    const text = handler(makeResult(RNFP_INTENTS.SEND_REVOKE), vars)!;
    expect(text).toContain("[CLC-FED-REVOKE-v1]");
    expect(vars.fed_state).toBe("idle");
    expect(vars.active_peer).toBeUndefined();
  });
});
