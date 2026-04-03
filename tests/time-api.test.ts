/**
 * tests/time-api.test.ts — Tests unitarios del cliente worldtimeapi.org.
 */

import { describe, test, expect, mock } from "bun:test";
import { fetchTime } from "../examples/iacm-demo/services/time-api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SAMPLE_WORLDTIME_RESPONSE = {
  timezone: "Europe/Madrid",
  datetime: "2024-03-15T14:30:00.123456+01:00",
  utc_offset: "+01:00",
  day_of_week: 5,
  abbreviation: "CET",
};

function makeFetchMock(body: unknown, ok = true, status = 200) {
  return mock(() =>
    Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(body),
    }),
  );
}

// ─── fetchTime ────────────────────────────────────────────────────────────────

describe("fetchTime", () => {
  test("parses valid worldtimeapi response", async () => {
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = makeFetchMock(SAMPLE_WORLDTIME_RESPONSE);

    try {
      const data = await fetchTime("Europe/Madrid");
      expect(data.timezone).toBe("Europe/Madrid");
      expect(data.datetime).toBe("2024-03-15T14:30:00.123456+01:00");
      expect(data.utcOffset).toBe("+01:00");
      expect(data.dayOfWeek).toBe(5);
      expect(data.abbreviation).toBe("CET");
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  test("falls back to empty string when optional fields are missing", async () => {
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = makeFetchMock({
      timezone: "UTC",
      datetime: "2024-01-01T00:00:00+00:00",
      // utc_offset, day_of_week, abbreviation all missing
    });

    try {
      const data = await fetchTime("UTC");
      expect(data.timezone).toBe("UTC");
      expect(data.utcOffset).toBe("");
      expect(data.dayOfWeek).toBe(0);
      expect(data.abbreviation).toBe("");
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  test("uses provided timezone as fallback when response timezone is missing", async () => {
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = makeFetchMock({
      datetime: "2024-06-01T12:00:00+02:00",
    });

    try {
      const data = await fetchTime("America/New_York");
      expect(data.timezone).toBe("America/New_York");
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  test("throws on HTTP error", async () => {
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = makeFetchMock({}, false, 404);

    try {
      await expect(fetchTime("Invalid/Zone")).rejects.toThrow("404");
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  test("URL-encodes timezone with slashes", async () => {
    const originalFetch = globalThis.fetch;
    let capturedUrl = "";
    (globalThis as any).fetch = mock((url: string) => {
      capturedUrl = url;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(SAMPLE_WORLDTIME_RESPONSE),
      });
    });

    try {
      await fetchTime("America/New_York");
      expect(capturedUrl).toContain("worldtimeapi.org");
      expect(capturedUrl).toContain("America");
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  test("throws when fetch rejects (network error)", async () => {
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = mock(() => Promise.reject(new Error("ECONNREFUSED")));

    try {
      await expect(fetchTime("Europe/London")).rejects.toThrow("ECONNREFUSED");
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });
});
