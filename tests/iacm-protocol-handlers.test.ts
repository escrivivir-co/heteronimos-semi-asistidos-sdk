import { describe, test, expect } from "bun:test";
import { iacmProtocolHandler, PROTOCOL_HELP } from "../src/core/iacm/iacm-protocol-handlers";
import { IACM_INTENTS } from "../src/core/iacm/iacm-categories";
import { buildRequest, buildUrgent, formatIacmForChat } from "../src/core/iacm/iacm-templates";
import type { IacmBotVars } from "../src/core/iacm/iacm-bot-plugin";
import type { IntentResult } from "../src/core/aiml/aiml-types";

type TestVars = IacmBotVars;

function makeVars(overrides?: Partial<TestVars>): TestVars {
  return {
    agent_role: "dispatch",
    flow_state: "idle",
    interlocutor: undefined,
    last_received_message_id: undefined,
    pending_replies: undefined,
    ...overrides,
  };
}

function makeResult(intent: string, overrides?: Partial<IntentResult>): IntentResult {
  return {
    intent,
    confidence: 0.95,
    entities: {},
    stars: [],
    originalInput: "",
    ...overrides,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Handler basics
// ──────────────────────────────────────────────────────────────────────────────

describe("iacmProtocolHandler", () => {
  test("returns undefined for non-iacm intents", () => {
    const handler = iacmProtocolHandler<TestVars>("dispatch");
    const vars = makeVars();
    const result = handler(makeResult("greet"), vars, { chatId: 1, text: "", timestamp: new Date() });
    expect(result).toBeUndefined();
  });

  test("returns status page for iacm.status", () => {
    const handler = iacmProtocolHandler<TestVars>("dispatch");
    const vars = makeVars({ flow_state: "processing", interlocutor: "meteo" });
    const result = handler(makeResult(IACM_INTENTS.STATUS), vars, { chatId: 1, text: "", timestamp: new Date() });
    expect(typeof result).toBe("string");
    expect(result).toContain("dispatch");
    expect(result).toContain("processing");
    expect(result).toContain("meteo");
  });

  test("returns PROTOCOL_HELP for iacm.protocol.help", () => {
    const handler = iacmProtocolHandler<TestVars>("dispatch");
    const vars = makeVars();
    const result = handler(makeResult(IACM_INTENTS.HELP), vars, { chatId: 1, text: "", timestamp: new Date() });
    expect(result).toBe(PROTOCOL_HELP);
  });

  // ── Receiving protocol messages ────────────────────────────────────────────

  test("RECEIVED_REQUEST: auto-ACK and sets flow_state=processing", () => {
    const handler = iacmProtocolHandler<TestVars>("dispatch");
    const msg = buildRequest("meteo", "dispatch", { task: "weather" }, "n");
    const text = formatIacmForChat(msg);
    const vars = makeVars();
    const result = handler(makeResult(IACM_INTENTS.RECEIVED_REQUEST, {
      entities: { from_agent: "meteo", to_agent: "dispatch", raw_message: text },
    }), vars, { chatId: 1, text, timestamp: new Date() });
    expect(result).toContain("[ACKNOWLEDGE]");
    expect(vars.flow_state).toBe("processing");
    expect(vars.interlocutor).toBe("meteo");
  });

  test("RECEIVED_URGENT: auto-ACK and sets flow_state=processing", () => {
    const handler = iacmProtocolHandler<TestVars>("dispatch");
    const msg = buildUrgent("alpha", "dispatch", {
      issue: "outage", severity: "critical",
      urgency_reason: "prod down", action_needed: "restart", action_needed_by: "now",
    }, "emergency");
    const text = formatIacmForChat(msg);
    const vars = makeVars();
    const result = handler(makeResult(IACM_INTENTS.RECEIVED_URGENT, {
      entities: { from_agent: "alpha", to_agent: "dispatch", raw_message: text },
    }), vars, { chatId: 1, text, timestamp: new Date() });
    expect(result).toContain("[ACKNOWLEDGE]");
    expect(vars.flow_state).toBe("processing");
  });

  test("RECEIVED_QUESTION: auto-ACK and sets flow_state=processing", () => {
    const handler = iacmProtocolHandler<TestVars>("dispatch");
    const vars = makeVars();
    const result = handler(makeResult(IACM_INTENTS.RECEIVED_QUESTION, {
      entities: { from_agent: "meteo", to_agent: "dispatch", raw_message: "[QUESTION] ❓ meteo → dispatch\n📋 q?\nid: q-1\n───────────────\ndetails" },
      stars: ["meteo", "dispatch"],
    }), vars, { chatId: 1, text: "", timestamp: new Date() });
    expect(result).toContain("[ACKNOWLEDGE]");
    expect(vars.flow_state).toBe("processing");
  });

  test("RECEIVED_PROPOSAL: sets flow_state=awaiting_confirmation", () => {
    const handler = iacmProtocolHandler<TestVars>("dispatch");
    const vars = makeVars();
    const result = handler(makeResult(IACM_INTENTS.RECEIVED_PROPOSAL, {
      entities: { from_agent: "meteo", to_agent: "dispatch", raw_message: "" },
    }), vars, { chatId: 1, text: "", timestamp: new Date() });
    expect(result).toContain("[ACKNOWLEDGE]");
    expect(vars.flow_state).toBe("awaiting_confirmation");
  });

  test("RECEIVED_REPORT: sets flow_state=idle after ACK", () => {
    const handler = iacmProtocolHandler<TestVars>("dispatch");
    const vars = makeVars({ flow_state: "processing" });
    handler(makeResult(IACM_INTENTS.RECEIVED_REPORT, {
      entities: { from_agent: "meteo", to_agent: "dispatch", raw_message: "" },
    }), vars, { chatId: 1, text: "", timestamp: new Date() });
    expect(vars.flow_state).toBe("idle");
  });

  test("RECEIVED_ACCEPT: sets flow_state=idle", () => {
    const handler = iacmProtocolHandler<TestVars>("dispatch");
    const vars = makeVars({ flow_state: "awaiting_confirmation" });
    const result = handler(makeResult(IACM_INTENTS.RECEIVED_ACCEPT, {
      entities: { from_agent: "meteo", to_agent: "dispatch", raw_message: "" },
    }), vars, { chatId: 1, text: "", timestamp: new Date() });
    expect(vars.flow_state).toBe("idle");
    expect(result).toContain("accepted");
  });

  test("RECEIVED_REJECT: sets flow_state=idle", () => {
    const handler = iacmProtocolHandler<TestVars>("dispatch");
    const vars = makeVars({ flow_state: "awaiting_confirmation" });
    const result = handler(makeResult(IACM_INTENTS.RECEIVED_REJECT, {
      entities: { from_agent: "meteo", to_agent: "dispatch", raw_message: "" },
    }), vars, { chatId: 1, text: "", timestamp: new Date() });
    expect(vars.flow_state).toBe("idle");
    expect(result).toContain("rejected");
  });

  test("routes guard: skips message not addressed to this agent", () => {
    const handler = iacmProtocolHandler<TestVars>("dispatch");
    const vars = makeVars();
    const result = handler(makeResult(IACM_INTENTS.RECEIVED_REQUEST, {
      entities: { from_agent: "meteo", to_agent: "OTHER_AGENT", raw_message: "" },
    }), vars, { chatId: 1, text: "", timestamp: new Date() });
    expect(result).toBeUndefined();
  });

  test("returns undefined for outbound send intents (domain bot handles)", () => {
    const handler = iacmProtocolHandler<TestVars>("dispatch");
    const vars = makeVars();
    const result = handler(makeResult(IACM_INTENTS.SEND_REQUEST), vars, { chatId: 1, text: "", timestamp: new Date() });
    expect(result).toBeUndefined();
  });

  test("RECEIVED_ACK: silent (returns undefined)", () => {
    const handler = iacmProtocolHandler<TestVars>("dispatch");
    const vars = makeVars();
    const result = handler(makeResult(IACM_INTENTS.RECEIVED_ACK, {
      entities: { from_agent: "meteo", to_agent: "dispatch", raw_message: "" },
    }), vars, { chatId: 1, text: "", timestamp: new Date() });
    expect(result).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// PROTOCOL_HELP
// ──────────────────────────────────────────────────────────────────────────────

describe("PROTOCOL_HELP", () => {
  test("contains key command descriptions", () => {
    expect(PROTOCOL_HELP).toContain("_request");
    expect(PROTOCOL_HELP).toContain("_urgent");
    expect(PROTOCOL_HELP).toContain("_status");
    expect(PROTOCOL_HELP).toContain("IACM/1.0");
  });
});
