/**
 * protocol-handler.ts — Custom protocol handler overrides (Approach 3).
 *
 * Demuestra cómo componer y sobreescribir el protocol handler base del SDK
 * usando arrow functions standalone.
 *
 * Casos de uso:
 * 1. Añadir logging extra a las transiciones de estado
 * 2. Ignorar ciertos tipos de mensajes (ej: FYI silencioso)
 * 3. Customizar las respuestas ACK con formato específico del bot
 *
 * Uso en un bot:
 *
 *   import { silentFyiHandler, verboseAckHandler } from "./handlers/protocol-handler.js";
 *
 *   override handlers() {
 *     return [
 *       silentFyiHandler(),            // Suprime FYIs entrantes (sin ACK)
 *       verboseAckHandler("MeteoBot"), // ACK con formato extendido
 *       ...super.handlers(),           // Protocol handler base + dominio
 *     ];
 *   }
 */

import {
  IACM_INTENTS,
  buildAcknowledge,
  formatIacmForChat,
  type IntentHandler,
} from "heteronimos-semi-asistidos-sdk";
import type { IacmBotVars } from "heteronimos-semi-asistidos-sdk";

// ─── Tipo base ────────────────────────────────────────────────────────────────

type BotHandler = IntentHandler<IacmBotVars>;

// ─── Override 1: FYI silencioso ───────────────────────────────────────────────

/**
 * Suprime todos los FYI entrantes: los absorbe sin generar respuesta.
 * Útil cuando el bot recibe muchos FYIs y no quiere spamear el grupo con ACKs.
 *
 * COLOCAR ANTES de `super.handlers()` para que tenga precedencia.
 */
export function silentFyiHandler(): BotHandler {
  return (intent, vars) => {
    if (intent.intent !== IACM_INTENTS.RECEIVED_FYI) return undefined;
    // Actualizar interlocutor en vars (efecto sobre estado), pero no responder
    vars.interlocutor = (intent.entities.from_agent as string | undefined) ?? vars.interlocutor;
    return ""; // String vacío = respuesta silenciosa (no se envía al chat)
  };
}

// ─── Override 2: ACK verbose ──────────────────────────────────────────────────

/**
 * Reemplaza el ACK automático del protocol handler con uno más informativo.
 * Incluye el tipo de mensaje recibido y el timestamp.
 *
 * COLOCAR ANTES de `super.handlers()` para que tenga precedencia.
 *
 * @param agentName  Nombre del agente que envía el ACK
 */
export function verboseAckHandler(agentName: string): BotHandler {
  return (intent, vars) => {
    if (intent.intent !== IACM_INTENTS.RECEIVED_REQUEST) return undefined;

    const fromAgent = (intent.entities.from_agent as string | undefined)
      ?? vars.interlocutor
      ?? "unknown";

    const ack = buildAcknowledge(
      agentName,
      fromAgent,
      {
        acknowledged_message_id: vars.last_received_message_id ?? "unknown",
        confirmation: `REQUEST recibido OK a las ${new Date().toISOString()}. Procesando.`,
        understood: true,
        next_steps: [{ step: "Fetching data and building REPORT", eta: "< 3s" }],
      },
      `[${agentName}] ACK: REQUEST recibido. Procesando consulta.`,
    );

    vars.flow_state = "processing";
    vars.interlocutor = fromAgent;
    return formatIacmForChat(ack);
  };
}

// ─── Override 3: URGENT con alerta al operador ────────────────────────────────

/**
 * Procesa URGENT recibido con formato de alerta extendida.
 * Incluye timestamp y emoji de prioridad visual.
 *
 * @param agentName  Nombre del agente que responde con ACK
 */
export function urgentAlertHandler(agentName: string): BotHandler {
  return (intent, vars) => {
    if (intent.intent !== IACM_INTENTS.RECEIVED_URGENT) return undefined;

    const fromAgent = (intent.entities.from_agent as string | undefined)
      ?? vars.interlocutor
      ?? "unknown";

    const ack = buildAcknowledge(
      agentName,
      fromAgent,
      {
        acknowledged_message_id: vars.last_received_message_id ?? "unknown",
        confirmation: "🚨 URGENTE ACK — Alerta registrada. Operador notificado.",
        understood: true,
      },
      `🚨 URGENTE de ${fromAgent} recibido. Operador notificado. Tomando medidas.`,
    );

    vars.flow_state = "processing";
    vars.interlocutor = fromAgent;
    return formatIacmForChat(ack);
  };
}
