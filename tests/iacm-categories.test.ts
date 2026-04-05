import { describe, test, expect } from "bun:test";
import { getAllIacmCategories, getIacmChatCategories, getIacmCommandCategories, IACM_INTENTS } from "../src/core/iacm/iacm-categories";
import { IntentEngine } from "../src/core/aiml/intent-engine";
import { buildRequest, buildUrgent, formatIacmForChat } from "../src/core/iacm/iacm-templates";
import type { IacmBotVars } from "../src/core/iacm/iacm-bot-plugin";

type TestVars = IacmBotVars;

function makeEngine() {
  const defaultVars: TestVars = {
    agent_role: "dispatch",
    flow_state: "idle",
    interlocutor: undefined,
    last_received_message_id: undefined,
    pending_replies: undefined,
  };
  return new IntentEngine<TestVars>(getAllIacmCategories<TestVars>(), defaultVars);
}

// ──────────────────────────────────────────────────────────────────────────────
// IACM_INTENTS constant
// ──────────────────────────────────────────────────────────────────────────────

describe("IACM_INTENTS", () => {
  test("has all required intent names", () => {
    expect(IACM_INTENTS.RECEIVED_REQUEST).toBe("iacm.request.received");
    expect(IACM_INTENTS.RECEIVED_URGENT).toBe("iacm.urgent.received");
    expect(IACM_INTENTS.SEND_REQUEST).toBe("iacm.send.request");
    expect(IACM_INTENTS.STATUS).toBe("iacm.status");
    expect(IACM_INTENTS.HELP).toBe("iacm.protocol.help");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Chat categories
// ──────────────────────────────────────────────────────────────────────────────

describe("getIacmChatCategories", () => {
  test("classifies REQUEST message", async () => {
    const engine = makeEngine();
    const msg = buildRequest("meteo", "dispatch", { task: "Give me weather" }, "Please provide weather");
    const text = formatIacmForChat(msg);
    const result = await engine.classify({ chatId: 1, text, timestamp: new Date() });
    expect(result.intent).toBe(IACM_INTENTS.RECEIVED_REQUEST);
    expect(result.entities.from_agent).toBe("meteo");
    expect(result.entities.to_agent).toBe("dispatch");
    expect(result.entities.raw_message).toBe(text);
  });

  test("classifies URGENT message", async () => {
    const engine = makeEngine();
    const msg = buildUrgent("alpha", "dispatch", {
      issue: "outage",
      severity: "critical",
      urgency_reason: "prod down",
      action_needed: "restart",
      action_needed_by: "now",
    }, "System is down");
    const text = formatIacmForChat(msg);
    const result = await engine.classify({ chatId: 1, text, timestamp: new Date() });
    expect(result.intent).toBe(IACM_INTENTS.RECEIVED_URGENT);
  });

  test("all 11 types produce iacm.*.received intents", async () => {
    const engine = makeEngine();
    const verifyType = async (formatted: string, expectedIntent: string) => {
      const result = await engine.classify({ chatId: 1, text: formatted, timestamp: new Date() });
      expect(result.intent).toBe(expectedIntent);
    };

    const { buildReport, buildQuestion, buildAnswer, buildProposal,
      buildAcknowledge, buildAccept, buildReject, buildDefer, buildFyi } =
      await import("../src/core/iacm/iacm-templates");

    await verifyType(formatIacmForChat(buildRequest("a", "b", { task: "t" }, "n")), IACM_INTENTS.RECEIVED_REQUEST);
    await verifyType(formatIacmForChat(buildReport("a", "b", { subject: "s", summary: "x" }, "n")), IACM_INTENTS.RECEIVED_REPORT);
    await verifyType(formatIacmForChat(buildQuestion("a", "b", { question: "q?" }, "n")), IACM_INTENTS.RECEIVED_QUESTION);
    await verifyType(formatIacmForChat(buildAnswer("a", "b", { question_id: "q1", answer: "a" }, "n")), IACM_INTENTS.RECEIVED_ANSWER);
    await verifyType(formatIacmForChat(buildProposal("a", "b", { title: "t", summary: "s", rationale: "r" }, "n")), IACM_INTENTS.RECEIVED_PROPOSAL);
    await verifyType(formatIacmForChat(buildAcknowledge("a", "b", { acknowledged_message_id: "m1", confirmation: "ok" }, "n")), IACM_INTENTS.RECEIVED_ACK);
    await verifyType(formatIacmForChat(buildAccept("a", "b", { proposal_id: "p1", commitment: "will do" }, "n")), IACM_INTENTS.RECEIVED_ACCEPT);
    await verifyType(formatIacmForChat(buildReject("a", "b", { proposal_id: "p1", rationale: "no" }, "n")), IACM_INTENTS.RECEIVED_REJECT);
    await verifyType(formatIacmForChat(buildDefer("a", "b", { deferred_message_id: "m1", reason: "busy" }, "n")), IACM_INTENTS.RECEIVED_DEFER);
    await verifyType(formatIacmForChat(buildFyi("a", "b", { subject: "s", information: "info" }, "n")), IACM_INTENTS.RECEIVED_FYI);
    await verifyType(formatIacmForChat(buildUrgent("a", "b", { issue: "x", severity: "high", urgency_reason: "y", action_needed: "z", action_needed_by: "now" }, "n")), IACM_INTENTS.RECEIVED_URGENT);
  });

  test("sideEffect updates interlocutor and last_received_message_id", async () => {
    const engine = makeEngine();
    const msg = buildRequest("meteo", "dispatch", { task: "weather" }, "give weather", { message_id: "req-test-123" });
    const text = formatIacmForChat(msg);
    await engine.classify({ chatId: 42, text, timestamp: new Date() });
    const state = engine.getState(42);
    expect(state?.vars.interlocutor).toBe("meteo");
    // message_id extracted from "id: req-test-123" in the body
    expect(state?.vars.last_received_message_id).toBe("req-test-123");
  });

  test("does not match plain text", async () => {
    const engine = makeEngine();
    const result = await engine.classify({ chatId: 1, text: "Hello world", timestamp: new Date() });
    expect(result.intent).toBe("unmatched");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Command categories
// ──────────────────────────────────────────────────────────────────────────────

describe("getIacmCommandCategories", () => {
  test("classifies /xx_request command", async () => {
    const engine = makeEngine();
    const result = await engine.classify({ chatId: 1, text: "/dispatch_request", timestamp: new Date() });
    expect(result.intent).toBe(IACM_INTENTS.SEND_REQUEST);
  });

  test("classifies /xx_status command", async () => {
    const engine = makeEngine();
    const result = await engine.classify({ chatId: 1, text: "/bot_status", timestamp: new Date() });
    expect(result.intent).toBe(IACM_INTENTS.STATUS);
  });

  test("classifies /xx_iacm command", async () => {
    const engine = makeEngine();
    const result = await engine.classify({ chatId: 1, text: "/dispatch_iacm", timestamp: new Date() });
    expect(result.intent).toBe(IACM_INTENTS.HELP);
  });

  test("classifies /xx_urgent command", async () => {
    const engine = makeEngine();
    const result = await engine.classify({ chatId: 1, text: "/bot_urgent", timestamp: new Date() });
    expect(result.intent).toBe(IACM_INTENTS.SEND_URGENT);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// getAllIacmCategories
// ──────────────────────────────────────────────────────────────────────────────

describe("getAllIacmCategories", () => {
  test("returns combined chat + command categories", () => {
    const all = getAllIacmCategories();
    const chat = getIacmChatCategories();
    const cmd = getIacmCommandCategories();
    expect(all.length).toBe(chat.length + cmd.length);
  });
});
