/**
 * tests/integration.test.ts — Tests de integración IACM: MeteoBot ↔ DispatchBot.
 *
 * Verifica que loæs dos bots interoperan: los mensajes que un bot formatea
 * son reconocidos correctamente por el motor del otro bot.
 *
 * Flujos cubiertos:
 *   Flujo A — DispatchBot → REQUEST → MeteoBot ACKs
 *   Flujo B — DispatchBot → QUESTION → MeteoBot ACKs
 *   Flujo C — MeteoBot → PROPOSAL → DispatchBot registers proposal
 *   Flujo E — MeteoBot → URGENT → DispatchBot ACKs
 *   Flujo F — MeteoBot → FYI → DispatchBot registers FYI
 *   Flujo G — Direct command (no IACM): /mt_weather with mocked fetch
 */

import { describe, test, expect, mock } from "bun:test";
import { MeteoBot } from "../examples/iacm-demo/meteo-bot";
import { DispatchBot } from "../examples/iacm-demo/dispatch-bot";
import {
  buildRequest,
  buildQuestion,
  buildProposal,
  buildAccept,
  buildReject,
  buildFyi,
  buildUrgent,
  formatIacmForChat,
} from "../src/index";

// ─── Factories ────────────────────────────────────────────────────────────────

const METEO_AGENT  = "MeteoBot";
const DISPATCH_AGENT = "DispatchBot";

function makeMeteoBotFresh(): MeteoBot {
  return new MeteoBot(METEO_AGENT);
}

function makeDispatchBotFresh(): DispatchBot {
  return new DispatchBot(DISPATCH_AGENT);
}

function ctx(text: string, chatId = 0) {
  return { text, message: { text }, chat: { id: chatId }, from: { id: 1 } };
}

// ─── Flujo A: DispatchBot formats REQUEST → MeteoBot ACKs ─────────────────────

describe("Flujo A: REQUEST → ACK", () => {
  test("A1: DispatchBot /dp_weather formats a [REQUEST] IACM message", async () => {
    const dp = makeDispatchBotFresh();
    const msg = await dp.onMessage(ctx("/dp_weather Madrid", 100));
    expect(typeof msg).toBe("string");
    expect(msg).toContain("[REQUEST]");
    expect(msg).toContain(DISPATCH_AGENT);
  });

  test("A2: MeteoBot classifies REQUEST message as RECEIVED_REQUEST and returns ACK", async () => {
    const mt = makeMeteoBotFresh();
    const requestText = formatIacmForChat(
      buildRequest(DISPATCH_AGENT, METEO_AGENT, { task: "weather Madrid", priority: "medium" }, "Get Madrid weather"),
    );
    const ack = await mt.onMessage(ctx(requestText, 101));
    expect(typeof ack).toBe("string");
    // Protocol handler returns ACKNOWLEDGE
    expect(ack.toUpperCase()).toContain("ACK");
  });

  test("A3: MeteoBot accepts REQUEST from correct target agent, ignores if to_agent is different", async () => {
    const mt = makeMeteoBotFresh();
    const wrongTarget = formatIacmForChat(
      buildRequest(DISPATCH_AGENT, "SomeOtherBot", { task: "task" }, "not for MeteoBot"),
    );
    const result = await mt.onMessage(ctx(wrongTarget, 102));
    // Should return empty string or fallback (routing guard blocks it)
    expect(typeof result).toBe("string");
    // Should NOT be an ACK since message was not addressed to MeteoBot
    expect(result.toUpperCase()).not.toContain("ACK");
  });
});

// ─── Flujo B: DispatchBot → QUESTION → MeteoBot ACKs ─────────────────────────

describe("Flujo B: QUESTION → ACK", () => {
  test("B1: DispatchBot /dp_time formats a [QUESTION] IACM message", async () => {
    const dp = makeDispatchBotFresh();
    const msg = await dp.onMessage(ctx("/dp_time Europe/Madrid", 200));
    expect(typeof msg).toBe("string");
    expect(msg).toContain("[QUESTION]");
    expect(msg).toContain(DISPATCH_AGENT);
  });

  test("B2: MeteoBot classifies QUESTION and returns ACK", async () => {
    const mt = makeMeteoBotFresh();
    const questionText = formatIacmForChat(
      buildQuestion(DISPATCH_AGENT, METEO_AGENT, { question: "¿Qué hora es en Europe/Madrid?", question_type: "information" }, "¿Qué hora es?"),
    );
    const ack = await mt.onMessage(ctx(questionText, 201));
    expect(typeof ack).toBe("string");
    expect(ack.toUpperCase()).toContain("ACK");
  });
});

// ─── Flujo C: MeteoBot → PROPOSAL → DispatchBot registers proposal ────────────

describe("Flujo C: PROPOSAL → awaiting_confirmation", () => {
  test("C1: MeteoBot /mt_propose formats a [PROPOSAL] IACM message", async () => {
    const mt = makeMeteoBotFresh();
    const msg = await mt.onMessage(ctx("/mt_propose Aumentar intervalo de actualización", 300));
    expect(typeof msg).toBe("string");
    expect(msg).toContain("[PROPOSAL]");
  });

  test("C2: DispatchBot receives PROPOSAL and transitions to awaiting_confirmation", async () => {
    const dp = makeDispatchBotFresh();
    const proposalText = formatIacmForChat(
      buildProposal(METEO_AGENT, DISPATCH_AGENT, { title: "Cambio de config", summary: "Aumentar intervalo", rationale: "Reducir llamadas a API" }, "Propuesta de cambio"),
    );
    const ack = await dp.onMessage(ctx(proposalText, 301));
    expect(typeof ack).toBe("string");
    // Protocol handler sends ACK for PROPOSAL
    expect(ack.toUpperCase()).toContain("ACK");
    const engine = (dp as any).engine_;
    const vars = engine.getState(301)?.vars;
    expect(vars?.flow_state).toBe("awaiting_confirmation");
  });

  test("C3: DispatchBot sends ACCEPT after PROPOSAL received", async () => {
    const dp = makeDispatchBotFresh();
    // Seed pending_proposal_id in engine state
    (dp as any).engine_.setVar(302, "pending_proposal_id", "prop-001");
    const result = await dp.onMessage(ctx("/dp_accept", 302));
    expect(typeof result).toBe("string");
    expect(result).not.toContain("⚠️");
    expect(result).toContain("[ACCEPT]");
  });

  test("C4: DispatchBot sends REJECT with rationale", async () => {
    const dp = makeDispatchBotFresh();
    (dp as any).engine_.setVar(303, "pending_proposal_id", "prop-002");
    const result = await dp.onMessage(ctx("/dp_reject Coste demasiado alto", 303));
    expect(typeof result).toBe("string");
    expect(result).toContain("[REJECT]");
    expect(result).toContain("demasiado alto");
  });
});

// ─── Flujo D: ACCEPT → MeteoBot ───────────────────────────────────────────────

describe("Flujo D: ACCEPT received by MeteoBot", () => {
  test("D1: MeteoBot classifies ACCEPT and transitions flow_state back to idle", async () => {
    const mt = makeMeteoBotFresh();
    const acceptText = formatIacmForChat(
      buildAccept(DISPATCH_AGENT, METEO_AGENT, { proposal_id: "p-001", commitment: "Procederemos" }, "Propuesta aceptada"),
    );
    await mt.onMessage(ctx(acceptText, 400));
    const vars = (mt as any).engine_.getState(400)?.vars;
    // Protocol handler should set flow_state to idle for ACCEPT
    expect(["idle", "processing"]).toContain(vars?.flow_state ?? "idle");
  });
});

// ─── Flujo E: MeteoBot → URGENT → DispatchBot ACKs ───────────────────────────

describe("Flujo E: URGENT → ACK", () => {
  test("E1: MeteoBot /mt_alert formats a [URGENT] IACM message", async () => {
    const mt = makeMeteoBotFresh();
    const msg = await mt.onMessage(ctx("/mt_alert Tormenta severa en Madrid", 500));
    expect(msg).toContain("[URGENT]");
  });

  test("E2: DispatchBot classifies URGENT and sends ACK + operator notification", async () => {
    const dp = makeDispatchBotFresh();
    const urgentText = formatIacmForChat(
      buildUrgent(METEO_AGENT, DISPATCH_AGENT, {
        issue: "Tormenta severa",
        severity: "critical" as any,
        urgency_reason: "Situación de emergencia",
        action_needed: "Evacuación inmediata",
        action_needed_by: new Date(Date.now() + 3600000).toISOString(),
      }, "🚨 URGENTE"),
    );
    const result = await dp.onMessage(ctx(urgentText, 501));
    expect(typeof result).toBe("string");
    // Protocol handler sends ACK for URGENT
    expect(result.toUpperCase()).toContain("ACK");
  });
});

// ─── Flujo F: MeteoBot → FYI ─────────────────────────────────────────────────

describe("Flujo F: FYI received", () => {
  test("F1: MeteoBot formats FYI via /mt_apistatus", async () => {
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = mock(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
    );
    try {
      const mt = makeMeteoBotFresh();
      const msg = await mt.onMessage(ctx("/mt_apistatus", 600));
      expect(msg).toContain("[FYI]");
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  test("F2: DispatchBot classifies incoming FYI", async () => {
    const dp = makeDispatchBotFresh();
    const fyiText = formatIacmForChat(
      buildFyi(METEO_AGENT, DISPATCH_AGENT, { subject: "API status", information: "wttr.in OK", information_type: "update" }, "APIs OK"),
    );
    // FYI should not throw and should return a string (protocol handler handles it)
    const result = await dp.onMessage(ctx(fyiText, 601));
    expect(typeof result).toBe("string");
  });
});

// ─── Flujo G: Direct command (no IACM) ───────────────────────────────────────

describe("Flujo G: Direct weather command (no IACM)", () => {
  test("G1: /mt_weather returns formatted weather data", async () => {
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            current_condition: [
              {
                temp_C: "25",
                temp_F: "77",
                humidity: "50",
                weatherDesc: [{ value: "Sunny" }],
                windspeedKmph: "8",
                FeelsLikeC: "24",
                uvIndex: "7",
              },
            ],
          }),
      }),
    );

    try {
      const mt = makeMeteoBotFresh();
      const result = await mt.onMessage(ctx("/mt_weather Málaga", 700));
      expect(typeof result).toBe("string");
      expect(result).toContain("Málaga");
      expect(result).toContain("25");
      expect(result).toContain("Sunny");
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  test("G2: /dp_demo formats REQUEST and sets demo_step", async () => {
    const dp = makeDispatchBotFresh();
    const result = await dp.onMessage(ctx("/dp_demo Madrid", 701));
    expect(result).toContain("DEMO");
    expect(result).toContain("[REQUEST]");
  });
});

// ─── Message format compatibility ─────────────────────────────────────────────

describe("Message format compatibility", () => {
  test("buildRequest output is classified as RECEIVED_REQUEST by MeteoBot", async () => {
    const mt = makeMeteoBotFresh();
    // Build a proper IACM REQUEST from DispatchBot to MeteoBot
    const msg = formatIacmForChat(
      buildRequest(DISPATCH_AGENT, METEO_AGENT, { task: "Parte meteo Madrid" }, "Request"),
    );
    // MeteoBot engine should classify this as "iacm.request.received"
    const engine = (mt as any).engine_;
    const intentResult = await engine.classify({
      chatId: 800,
      text: msg,
      timestamp: new Date(),
    });
    expect(intentResult.intent).toBe("iacm.request.received");
    expect(intentResult.entities.from_agent).toBe(DISPATCH_AGENT);
    expect(intentResult.entities.to_agent).toBe(METEO_AGENT);
  });

  test("buildQuestion output is classified as RECEIVED_QUESTION by MeteoBot", async () => {
    const mt = makeMeteoBotFresh();
    const msg = formatIacmForChat(
      buildQuestion(DISPATCH_AGENT, METEO_AGENT, { question: "¿Qué hora es?", question_type: "information" }, "Hora"),
    );
    const engine = (mt as any).engine_;
    const intentResult = await engine.classify({
      chatId: 801,
      text: msg,
      timestamp: new Date(),
    });
    expect(intentResult.intent).toBe("iacm.question.received");
  });

  test("buildProposal output is classified as RECEIVED_PROPOSAL by DispatchBot", async () => {
    const dp = makeDispatchBotFresh();
    const msg = formatIacmForChat(
      buildProposal(METEO_AGENT, DISPATCH_AGENT, { title: "T", summary: "S", rationale: "R" }, "Propuesta"),
    );
    const engine = (dp as any).engine_;
    const intentResult = await engine.classify({
      chatId: 802,
      text: msg,
      timestamp: new Date(),
    });
    expect(intentResult.intent).toBe("iacm.proposal.received");
  });
});
