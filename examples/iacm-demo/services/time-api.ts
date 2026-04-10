/**
 * time-api.ts — Cliente de worldtimeapi.org (sin API key, gratis).
 *
 * Endpoint: https://worldtimeapi.org/api/timezone/{tz}
 * Rate limit: ~300 req/h por IP.
 */

export interface TimeData {
  timezone: string;
  datetime: string;
  utcOffset: string;
  dayOfWeek: number;
  abbreviation: string;
}

/**
 * Obtiene la hora actual para `timezone` (ej: "Europe/Madrid").
 */
export async function fetchTime(timezone: string): Promise<TimeData> {
  const url = `https://worldtimeapi.org/api/timezone/${encodeURIComponent(timezone)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`worldtimeapi error: ${res.status} for timezone "${timezone}"`);
  const json = await res.json() as Record<string, unknown>;
  return {
    timezone: String(json.timezone ?? timezone),
    datetime: String(json.datetime ?? ""),
    utcOffset: String(json.utc_offset ?? ""),
    dayOfWeek: Number(json.day_of_week ?? 0),
    abbreviation: String(json.abbreviation ?? ""),
  };
}
