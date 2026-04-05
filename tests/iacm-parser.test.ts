import { describe, test, expect } from "bun:test";
import {
  detectsIacmMessage,
  extractIacmType,
  extractIacmAgents,
  parseIacmMessage,
  validateIacmMessage,
} from "../src/core/iacm/iacm-parser";
import { buildRequest, buildReport, buildUrgent, formatIacmForChat } from "../src/core/iacm/iacm-templates";

// ──────────────────────────────────────────────────────────────────────────────
// detectsIacmMessage
// ──────────────────────────────────────────────────────────────────────────────

describe("detectsIacmMessage", () => {
  test("returns true for REQUEST format", () => {
    const text = "[REQUEST] 📥 alpha → beta\n📋 task\nid: req-x\n───────────────\nnarrative";
    expect(detectsIacmMessage(text)).toBe(true);
  });

  test("returns true for URGENT format", () => {
    const text = "[URGENT] 🚨 alpha → beta\n📋 issue\nid: urg-x\n───────────────\nnarrative";
    expect(detectsIacmMessage(text)).toBe(true);
  });

  test("returns false for plain text", () => {
    expect(detectsIacmMessage("Hello world")).toBe(false);
  });

  test("returns false for unknown type", () => {
    expect(detectsIacmMessage("[UNKNOWN] 🔥 alpha → beta")).toBe(false);
  });

  test("case-insensitive type detection", () => {
    const text = "[report] 📊 alpha → beta\n📋 subj\nid: rep-x\n───────────────\nnarrative";
    expect(detectsIacmMessage(text)).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// extractIacmType
// ──────────────────────────────────────────────────────────────────────────────

describe("extractIacmType", () => {
  test("extracts REQUEST", () => {
    expect(extractIacmType("[REQUEST] 📥 a → b")).toBe("REQUEST");
  });

  test("extracts FYI", () => {
    expect(extractIacmType("[FYI] ℹ️ a → b")).toBe("FYI");
  });

  test("returns undefined for non-IACM", () => {
    expect(extractIacmType("plain text")).toBeUndefined();
  });

  test("normalizes to uppercase", () => {
    expect(extractIacmType("[question] ❓ a → b")).toBe("QUESTION");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// extractIacmAgents
// ──────────────────────────────────────────────────────────────────────────────

describe("extractIacmAgents", () => {
  test("returns from + to", () => {
    const result = extractIacmAgents("[REQUEST] 📥 meteo → dispatch");
    expect(result).toEqual({ from_agent: "meteo", to_agent: "dispatch" });
  });

  test("returns undefined for non-IACM", () => {
    expect(extractIacmAgents("not iacm")).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// parseIacmMessage
// ──────────────────────────────────────────────────────────────────────────────

describe("parseIacmMessage", () => {
  test("parses a REQUEST message", () => {
    const msg = buildRequest(
      "alpha", "beta",
      { task: "Get weather data" },
      "Please retrieve current conditions",
    );
    const text = formatIacmForChat(msg);
    const result = parseIacmMessage(text);
    expect(result.success).toBe(true);
    expect(result.message?.meta.message_type).toBe("REQUEST");
    expect(result.message?.meta.from_agent).toBe("alpha");
    expect(result.message?.meta.to_agent).toBe("beta");
  });

  test("parses a REPORT message", () => {
    const msg = buildReport(
      "meteo", "dispatch",
      { subject: "Weather Report", summary: "Sunny" },
      "Weather is sunny today",
    );
    const text = formatIacmForChat(msg);
    const result = parseIacmMessage(text);
    expect(result.success).toBe(true);
    expect(result.message?.meta.message_type).toBe("REPORT");
  });

  test("parses an URGENT message", () => {
    const msg = buildUrgent(
      "alpha", "beta",
      { issue: "System down", severity: "critical", urgency_reason: "prod failure", action_needed: "restart", action_needed_by: "now" },
      "System is down, immediate action required",
    );
    const text = formatIacmForChat(msg);
    const result = parseIacmMessage(text);
    expect(result.success).toBe(true);
    expect(result.message?.meta.message_type).toBe("URGENT");
  });

  test("fails for non-IACM text", () => {
    const result = parseIacmMessage("Hello world");
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  test("fails for unknown type in strict mode", () => {
    const result = parseIacmMessage("[UNKNOWN] 🔥 a → b\nid: x\n───\ntext", "strict");
    expect(result.success).toBe(false);
  });

  test("lenient mode: recovers from partial input", () => {
    const result = parseIacmMessage("[REQUEST] 📥 alpha → beta\nid: req-x\n───────────────\ndo the thing");
    expect(result.success).toBe(true);
    expect(result.message?.meta.message_type).toBe("REQUEST");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// validateIacmMessage
// ──────────────────────────────────────────────────────────────────────────────

describe("validateIacmMessage", () => {
  test("passes for a valid REQUEST", () => {
    const msg = buildRequest("a", "b", { task: "do stuff" }, "please do stuff");
    const errors = validateIacmMessage(msg);
    expect(errors).toHaveLength(0);
  });

  test("fails when narrative is missing", () => {
    const msg = buildRequest("a", "b", { task: "do stuff" }, "");
    const errors = validateIacmMessage(msg);
    expect(errors.some(e => e.includes("narrative"))).toBe(true);
  });

  test("fails when required data field missing for URGENT", () => {
    const msg = buildUrgent("a", "b", {
      issue: "x",
      severity: "high",
      urgency_reason: "y",
      action_needed: "z",
      action_needed_by: "", // missing
    }, "urgent");
    const errors = validateIacmMessage(msg);
    expect(errors.some(e => e.includes("action_needed_by"))).toBe(true);
  });
});
