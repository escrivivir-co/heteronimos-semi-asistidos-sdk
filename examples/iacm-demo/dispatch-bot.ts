/**
 * dispatch-bot.ts — DispatchBot: coordinador IACM controlado por el operador.
 *
 * Approach 1: TypeScript class que extiende IacmBotPlugin.
 *
 * Flujos IACM que gestiona:
 *   → REQUEST  (solicitar datos a MeteoBot)
 *   → QUESTION (pregunta de hora a MeteoBot)
 *   ← REPORT   → mostrar resultado
 *   ← ANSWER   → mostrar respuesta
 *   ← PROPOSAL → esperar decisión del operador
 *   → ACCEPT | REJECT | DEFER  (gestión de propuestas)
 *   ← URGENT   → auto-ACK
 */

import {
  IacmBotPlugin,
  type AimlCategory,
  type IntentHandler,
  type CommandDefinition,
  type MenuDefinition,
  buildRequest,
  buildQuestion,
  buildAccept,
  buildReject,
  buildDefer,
  buildAcknowledge,
  formatIacmForChat,
  IACM_INTENTS,
} from "heteronimos-semi-asistidos-sdk";
import type { IacmBotVars } from "heteronimos-semi-asistidos-sdk";

// ─── Variables de sesión ──────────────────────────────────────────────────────

export interface DispatchVars extends IacmBotVars {
  target_agent?: string;
  pending_proposal_id?: string;
  last_report_summary?: string;
  last_answer?: string;
  demo_step?: string;
}

// ─── DispatchBot ──────────────────────────────────────────────────────────────

export class DispatchBot extends IacmBotPlugin<DispatchVars> {
  name = "dispatch";
  pluginCode = "dp";
  agentName: string;

  constructor(agentName: string) {
    super();
    this.agentName = agentName;
  }

  override defaultVars(): DispatchVars {
    return {
      ...super.defaultVars(),
      target_agent: "MeteoBot",
      pending_proposal_id: undefined,
      last_report_summary: undefined,
      last_answer: undefined,
      demo_step: undefined,
    };
  }

  // ──────────────────────────────────────────────────────────────
  //  STAGE 1 — Categories
  // ──────────────────────────────────────────────────────────────

  override categories(): AimlCategory<DispatchVars>[] {
    return [
      ...super.categories(),

      // /dp_weather <city>
      {
        id: "cmd-weather-req",
        pattern: /^\/\w+_weather\s+(.+)/i,
        resolver: (_vars, stars, ctx) => ({
          intent: "dispatch.send.weather_request",
          confidence: 1,
          entities: { city: stars[0]?.trim() ?? "" },
          stars,
          originalInput: ctx.text,
        }),
        priority: 9,
      },

      // /dp_time <timezone>
      {
        id: "cmd-time-q",
        pattern: /^\/\w+_time\s+(.+)/i,
        resolver: (_vars, stars, ctx) => ({
          intent: "dispatch.send.time_question",
          confidence: 1,
          entities: { timezone: stars[0]?.trim() ?? "" },
          stars,
          originalInput: ctx.text,
        }),
        priority: 9,
      },

      // /dp_accept — priority 80 overrides IACM command categories (priority 70)
      {
        id: "cmd-accept",
        pattern: /^\/\w+_accept$/i,
        resolver: "dispatch.send.accept",
        priority: 80,
      },

      // /dp_reject <razón> — priority 80 overrides IACM command categories
      {
        id: "cmd-reject",
        pattern: /^\/\w+_reject\s+(.+)/i,
        resolver: (_vars, stars, ctx) => ({
          intent: "dispatch.send.reject",
          confidence: 1,
          entities: { rationale: stars[0]?.trim() ?? "" },
          stars,
          originalInput: ctx.text,
        }),
        priority: 80,
      },

      // /dp_defer <razón> — priority 80 overrides IACM command categories
      {
        id: "cmd-defer",
        pattern: /^\/\w+_defer\s+(.+)/i,
        resolver: (_vars, stars, ctx) => ({
          intent: "dispatch.send.defer",
          confidence: 1,
          entities: { reason: stars[0]?.trim() ?? "" },
          stars,
          originalInput: ctx.text,
        }),
        priority: 80,
      },

      // /dp_demo <city>
      {
        id: "cmd-demo",
        pattern: /^\/\w+_demo\s+(.+)/i,
        resolver: (_vars, stars, ctx) => ({
          intent: "dispatch.demo",
          confidence: 1,
          entities: { city: stars[0]?.trim() ?? "" },
          stars,
          originalInput: ctx.text,
        }),
        priority: 10,
      },
    ];
  }

  // ──────────────────────────────────────────────────────────────
  //  STAGE 2 — Handlers
  // ──────────────────────────────────────────────────────────────

  override handlers(): IntentHandler<DispatchVars>[] {
    return [
      ...super.handlers(), // protocol handler (ACK, flow state, routing guard)

      // ── Enviar REQUEST de weather a MeteoBot ───────────────────
      (intent, vars) => {
        if (intent.intent !== "dispatch.send.weather_request") return undefined;
        const city = intent.entities.city ?? "Madrid";
        const req = buildRequest(
          this.agentName,
          vars.target_agent ?? "MeteoBot",
          {
            task: `Parte meteorológico para ${city}`,
            context: `El operador solicita datos meteorológicos actuales de ${city}.`,
            priority: "medium",
          },
          `Solicito parte meteorológico actual para ${city}.`,
        );
        vars.flow_state = "awaiting_response";
        return formatIacmForChat(req);
      },

      // ── Enviar QUESTION de hora ────────────────────────────────
      (intent, vars) => {
        if (intent.intent !== "dispatch.send.time_question") return undefined;
        const tz = intent.entities.timezone ?? "Europe/Madrid";
        const q = buildQuestion(
          this.agentName,
          vars.target_agent ?? "MeteoBot",
          {
            question: `¿Qué hora es en ${tz}?`,
            context: "El operador necesita la hora actual para esa zona horaria.",
            question_type: "information",
            urgency: "medium",
          },
          `¿Qué hora es en ${tz}?`,
        );
        vars.flow_state = "awaiting_response";
        return formatIacmForChat(q);
      },

      // ── Recibir REPORT → mostrar resumen ──────────────────────
      (intent, vars) => {
        if (intent.intent !== IACM_INTENTS.REPORT_RECEIVED) return undefined;
        vars.flow_state = "idle";
        vars.last_report_summary = intent.originalInput;
        return `✅ REPORT recibido de ${intent.entities.from_agent ?? "MeteoBot"}.\nFlujo REQUEST→REPORT completado.`;
      },

      // ── Recibir ANSWER → mostrar respuesta ────────────────────
      (intent, vars) => {
        if (intent.intent !== IACM_INTENTS.ANSWER_RECEIVED) return undefined;
        vars.flow_state = "idle";
        vars.last_answer = intent.originalInput;
        return `✅ ANSWER recibida de ${intent.entities.from_agent ?? "MeteoBot"}.\nFlujo QUESTION→ANSWER completado.`;
      },

      // ── Recibir PROPOSAL → esperar decisión del operador ──────
      (intent, vars) => {
        if (intent.intent !== IACM_INTENTS.PROPOSAL_RECEIVED) return undefined;
        vars.flow_state = "awaiting_confirmation";
        vars.pending_proposal_id = vars.last_received_message_id ?? "unknown";
        return `🤝 PROPOSAL recibida de ${intent.entities.from_agent ?? "MeteoBot"}.\nUsa /dp_accept, /dp_reject <razón>, o /dp_defer <razón>.`;
      },

      // ── Enviar ACCEPT ──────────────────────────────────────────
      (intent, vars) => {
        if (intent.intent !== "dispatch.send.accept") return undefined;
        if (!vars.pending_proposal_id) return "⚠️ No hay propuesta pendiente.";
        const accept = buildAccept(
          this.agentName,
          vars.interlocutor ?? "all",
          {
            proposal_id: vars.pending_proposal_id,
            acceptance_type: "unconditional",
            commitment: "Propuesta aceptada. Procederemos según lo indicado.",
          },
          "Propuesta aceptada.",
          { reply_to: vars.pending_proposal_id },
        );
        vars.flow_state = "idle";
        vars.pending_proposal_id = undefined;
        return formatIacmForChat(accept);
      },

      // ── Enviar REJECT ──────────────────────────────────────────
      (intent, vars) => {
        if (intent.intent !== "dispatch.send.reject") return undefined;
        if (!vars.pending_proposal_id) return "⚠️ No hay propuesta pendiente.";
        const reject = buildReject(
          this.agentName,
          vars.interlocutor ?? "all",
          {
            proposal_id: vars.pending_proposal_id,
            rationale: intent.entities.rationale ?? "No procede.",
          },
          `Propuesta rechazada: ${intent.entities.rationale ?? "sin razón especificada"}.`,
          { reply_to: vars.pending_proposal_id },
        );
        vars.flow_state = "idle";
        vars.pending_proposal_id = undefined;
        return formatIacmForChat(reject);
      },

      // ── Enviar DEFER ───────────────────────────────────────────
      (intent, vars) => {
        if (intent.intent !== "dispatch.send.defer") return undefined;
        const msgId = vars.pending_proposal_id ?? vars.last_received_message_id ?? "unknown";
        const defer = buildDefer(
          this.agentName,
          vars.interlocutor ?? "all",
          {
            deferred_message_id: msgId,
            reason: intent.entities.reason ?? "Necesito más información.",
          },
          `Decisión aplazada: ${intent.entities.reason ?? "sin razón especificada"}.`,
          { reply_to: msgId },
        );
        vars.flow_state = "idle";
        vars.pending_proposal_id = undefined;
        return formatIacmForChat(defer);
      },

      // ── Recibir URGENT → respuesta adicional (protocolo ya hizo ACK) ─
      (intent, vars) => {
        if (intent.intent !== IACM_INTENTS.URGENT_RECEIVED) return undefined;
        // El protocolo handler ya envió ACKNOWLEDGE automático
        // Aquí añadimos respuesta al operador
        return `🚨 URGENTE recibido de ${intent.entities.from_agent ?? vars.interlocutor ?? "MeteoBot"}.\nRevisa la alerta y toma medidas.`;
      },

      // ── Demo automática ────────────────────────────────────────
      (intent, vars) => {
        if (intent.intent !== "dispatch.demo") return undefined;
        const city = intent.entities.city ?? "Madrid";
        const req = buildRequest(
          this.agentName,
          vars.target_agent ?? "MeteoBot",
          {
            task: `Parte meteorológico para ${city}`,
            priority: "medium",
          },
          `Demo: solicito parte meteorológico para ${city}.`,
        );
        vars.flow_state = "awaiting_response";
        vars.demo_step = "weather_requested";
        return [
          `🎬 **DEMO IACM v1.0** — Flujo A: REQUEST → REPORT`,
          ``,
          formatIacmForChat(req),
          ``,
          `⏳ Esperando REPORT de MeteoBot...`,
          `Usa /dp_demo ${city} para repetir la demo.`,
        ].join("\n");
      },
    ];
  }

  // ──────────────────────────────────────────────────────────────
  //  Comandos adicionales
  // ──────────────────────────────────────────────────────────────

  override commands(): CommandDefinition[] {
    return [
      ...super.commands(),
      { command: "dp_weather",  description: "REQUEST parte meteo (→ MeteoBot)",  buildText: (ctx: any) => this.onMessage(ctx) },
      { command: "dp_time",     description: "QUESTION hora actual (→ MeteoBot)", buildText: (ctx: any) => this.onMessage(ctx) },
      { command: "dp_accept",   description: "ACCEPT propuesta pendiente",        buildText: (ctx: any) => this.onMessage(ctx) },
      { command: "dp_reject",   description: "REJECT propuesta pendiente",        buildText: (ctx: any) => this.onMessage(ctx) },
      { command: "dp_defer",    description: "DEFER decisión pendiente",          buildText: (ctx: any) => this.onMessage(ctx) },
      { command: "dp_demo",     description: "🎬 Demo completa IACM",            buildText: (ctx: any) => this.onMessage(ctx) },
    ];
  }

  override menus(): MenuDefinition[] {
    return [
      ...super.menus(),
      {
        command: "dp_menu",
        description: "DispatchBot menú",
        entryPage: "home",
        pages: [
          {
            id: "home",
            text: "<b>📡 DispatchBot</b>\n\nCoordinador IACM.",
            buttons: [
              { label: "📋 Solicitar", goTo: "request" },
              { label: "🗳️ Gestionar", goTo: "manage" },
              { label: "🎬 Demo", goTo: "demo" },
            ],
          },
          {
            id: "request",
            text: "<b>Solicitar datos</b>\n\n<code>/dp_weather Madrid</code> — REQUEST meteo\n<code>/dp_time Europe/Madrid</code> — QUESTION hora",
            buttons: [{ label: "‹ Volver", goTo: "home" }],
          },
          {
            id: "manage",
            text: "<b>Gestionar propuestas</b>\n\n<code>/dp_accept</code> — Aceptar\n<code>/dp_reject razón</code> — Rechazar\n<code>/dp_defer razón</code> — Aplazar",
            buttons: [{ label: "‹ Volver", goTo: "home" }],
          },
          {
            id: "demo",
            text: "<b>Demo IACM</b>\n\n<code>/dp_demo Madrid</code> — Ejecuta Flujo A: REQUEST + REPORT\n\nLos 11 tipos de mensaje del protocolo en acción.",
            buttons: [{ label: "‹ Volver", goTo: "home" }],
          },
        ],
      },
    ];
  }
}
