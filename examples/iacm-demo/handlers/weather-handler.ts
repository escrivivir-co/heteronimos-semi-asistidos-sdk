/**
 * weather-handler.ts — Approach 3: standalone arrow-function IntentHandler.
 *
 * Responde REQUEST_RECEIVED con un REPORT meteorológico llamando a la API pública
 * wttr.in. No requiere clase ni instancia — se puede componer directamente en
 * la lista de handlers de cualquier bot.
 *
 * Ejemplo de uso:
 *
 *   import { weatherRequestHandler } from "./handlers/weather-handler.js";
 *
 *   class MyBot extends IacmBotPlugin<MyVars> {
 *     override handlers() {
 *       return [...super.handlers(), weatherRequestHandler("MyBot")];
 *     }
 *   }
 */

import {
  IACM_INTENTS,
  buildReport,
  formatIacmForChat,
  type IntentHandler,
} from "heteronimos-semi-asistidos-sdk";
import { fetchWeather } from "../services/weather-api.js";

/**
 * Devuelve un IntentHandler que responde a REQUEST_RECEIVED con un REPORT
 * usando datos reales de wttr.in.
 *
 * @param agentName  Nombre del agente que envía el REPORT (origen del mensaje).
 */
export function weatherRequestHandler(agentName: string): IntentHandler {
  return async (intent, vars) => {
    if (intent.intent !== IACM_INTENTS.REQUEST_RECEIVED) return undefined;

    const city: string =
      intent.entities?.city?.trim() ||
      (vars as Record<string, unknown>).last_city as string ||
      "Madrid";

    let reportBody: string;
    let status: "ok" | "error" = "ok";

    try {
      const wx = await fetchWeather(city);
      reportBody = [
        `🌤 Parte meteorológico — ${city}`,
        `Temperatura : ${wx.tempC}°C (sens. ${wx.feelsLikeC}°C)`,
        `Condición   : ${wx.description}`,
        `Humedad     : ${wx.humidity}%`,
        `Viento      : ${wx.windKph} km/h`,
        `UV Index    : ${wx.uvIndex}`,
      ].join("\n");
    } catch (err) {
      status = "error";
      reportBody = `Error al obtener datos meteorológicos de ${city}: ${err instanceof Error ? err.message : String(err)}`;
    }

    const report = buildReport(
      agentName,
      intent.entities?.from_agent ?? "all",
      {
        report_type: "findings",
        findings: [reportBody],
        status: status === "ok" ? "completed" : "blocked",
        summary: `Parte meteorológico de ${city}`,
        subject: city,
      },
      reportBody,
      { reply_to: vars.last_received_message_id },
    );

    return formatIacmForChat(report);
  };
}
