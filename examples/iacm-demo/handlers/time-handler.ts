/**
 * time-handler.ts — Approach 3: standalone arrow-function IntentHandler.
 *
 * Responde QUESTION_RECEIVED con un ANSWER de hora actual, llamando a la API
 * pública worldtimeapi.org. No requiere clase ni instancia.
 *
 * Ejemplo de uso:
 *
 *   import { timeQuestionHandler } from "./handlers/time-handler.js";
 *
 *   class MyBot extends IacmBotPlugin<MyVars> {
 *     override handlers() {
 *       return [...super.handlers(), timeQuestionHandler("MyBot")];
 *     }
 *   }
 */

import {
  IACM_INTENTS,
  buildAnswer,
  formatIacmForChat,
  type IntentHandler,
} from "heteronimos-semi-asistidos-sdk";
import { fetchTime } from "../services/time-api.js";

/**
 * Devuelve un IntentHandler que responde a QUESTION_RECEIVED con la hora actual
 * en la zona horaria solicitada, obtenida de worldtimeapi.org.
 *
 * @param agentName  Nombre del agente que envía el ANSWER (origen del mensaje).
 */
export function timeQuestionHandler(agentName: string): IntentHandler {
  return async (intent, vars) => {
    if (intent.intent !== IACM_INTENTS.QUESTION_RECEIVED) return undefined;

    const tz: string =
      intent.entities?.timezone?.trim() ||
      (vars as Record<string, unknown>).last_timezone as string ||
      "Europe/Madrid";

    let answerBody: string;
    let confidence: number;

    try {
      const t = await fetchTime(tz);
      answerBody = [
        `🕐 Hora actual en ${tz}`,
        `Fecha/hora : ${t.datetime}`,
        `UTC offset : ${t.utcOffset}`,
        `Día semana : ${t.dayOfWeek}`,
        `Zona abrev.: ${t.abbreviation}`,
      ].join("\n");
      confidence = 1.0;
    } catch (err) {
      answerBody = `Error al obtener hora para ${tz}: ${err instanceof Error ? err.message : String(err)}`;
      confidence = 0;
    }

    const answer = buildAnswer(
      agentName,
      intent.entities?.from_agent ?? "all",
      {
        question_id: vars.last_received_message_id ?? "unknown",
        answer: answerBody,
        confidence,
        sources: [{ source: `worldtimeapi.org/api/timezone/${tz}` }],
        recommendations: ["La precisión depende de la latencia de red."],
      },
      answerBody,
      { reply_to: vars.last_received_message_id },
    );

    return formatIacmForChat(answer);
  };
}
