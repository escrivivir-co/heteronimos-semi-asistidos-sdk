/**
 * weather-api.ts — Cliente de wttr.in (sin API key, gratis).
 *
 * Endpoint: https://wttr.in/{city}?format=j1
 * Rate limit: ~300 req/h por IP.
 */

export interface WeatherData {
  city: string;
  tempC: number;
  tempF: number;
  humidity: number;
  description: string;
  windKph: number;
  feelsLikeC: number;
  uvIndex: number;
}

/**
 * Obtiene datos meteorológicos actuales para `city`.
 * Lanza error si la API no responde o no devuelve datos.
 */
export async function fetchWeather(city: string): Promise<WeatherData> {
  const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`wttr.in error: ${res.status} for city "${city}"`);
  const json = await res.json() as Record<string, unknown>;
  const current = (json.current_condition as Record<string, unknown>[])?.[0];
  if (!current) throw new Error("No current_condition data from wttr.in");
  return {
    city,
    tempC: Number(current.temp_C),
    tempF: Number(current.temp_F),
    humidity: Number(current.humidity),
    description: (current.weatherDesc as { value: string }[])?.[0]?.value ?? "Unknown",
    windKph: Number(current.windspeedKmph),
    feelsLikeC: Number(current.FeelsLikeC),
    uvIndex: Number(current.uvIndex),
  };
}

/**
 * Comprueba si wttr.in responde en ≤5 segundos.
 */
export async function checkWeatherApi(): Promise<boolean> {
  try {
    const res = await fetch("https://wttr.in/?format=j1", {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
