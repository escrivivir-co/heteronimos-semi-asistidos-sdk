/**
 * tests/weather-api.test.ts — Tests unitarios del cliente wttr.in.
 *
 * Nota: las pruebas mockean fetch globalmente para no hacer peticiones reales.
 */

import { describe, test, expect, beforeEach, mock } from "bun:test";
import { fetchWeather, checkWeatherApi } from "../examples/iacm-demo/services/weather-api";

// ─── Mock de fetch ────────────────────────────────────────────────────────────

const SAMPLE_WTTR_RESPONSE = {
  current_condition: [
    {
      temp_C: "18",
      temp_F: "64",
      humidity: "65",
      weatherDesc: [{ value: "Partly cloudy" }],
      windspeedKmph: "15",
      FeelsLikeC: "16",
      uvIndex: "4",
    },
  ],
};

function makeFetchMock(
  body: unknown,
  ok = true,
  status = 200,
): ReturnType<typeof mock> {
  return mock(() =>
    Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(body),
    }),
  );
}

// ─── fetchWeather ─────────────────────────────────────────────────────────────

describe("fetchWeather", () => {
  test("parses valid wttr.in response", async () => {
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = makeFetchMock(SAMPLE_WTTR_RESPONSE);

    try {
      const data = await fetchWeather("Madrid");
      expect(data.city).toBe("Madrid");
      expect(data.tempC).toBe(18);
      expect(data.tempF).toBe(64);
      expect(data.humidity).toBe(65);
      expect(data.description).toBe("Partly cloudy");
      expect(data.windKph).toBe(15);
      expect(data.feelsLikeC).toBe(16);
      expect(data.uvIndex).toBe(4);
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  test("throws on HTTP error", async () => {
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = makeFetchMock({}, false, 503);

    try {
      await expect(fetchWeather("London")).rejects.toThrow("503");
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  test("throws when no current_condition in response", async () => {
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = makeFetchMock({ current_condition: [] });

    try {
      await expect(fetchWeather("Unknown")).rejects.toThrow();
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  test("throws when response is empty object", async () => {
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = makeFetchMock({});

    try {
      await expect(fetchWeather("BadCity")).rejects.toThrow();
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  test("URL-encodes city with special characters", async () => {
    const originalFetch = globalThis.fetch;
    let capturedUrl = "";
    (globalThis as any).fetch = mock((url: string) => {
      capturedUrl = url;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(SAMPLE_WTTR_RESPONSE),
      });
    });

    try {
      await fetchWeather("São Paulo");
      expect(capturedUrl).toContain(encodeURIComponent("São Paulo"));
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });
});

// ─── checkWeatherApi ──────────────────────────────────────────────────────────

describe("checkWeatherApi", () => {
  test("returns true when fetch succeeds with ok:true", async () => {
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = makeFetchMock({}, true);

    try {
      const result = await checkWeatherApi();
      expect(result).toBe(true);
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  test("returns false when fetch returns ok:false", async () => {
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = makeFetchMock({}, false, 503);

    try {
      const result = await checkWeatherApi();
      expect(result).toBe(false);
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  test("returns false when fetch throws (network error)", async () => {
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = mock(() => Promise.reject(new Error("Network error")));

    try {
      const result = await checkWeatherApi();
      expect(result).toBe(false);
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });
});
