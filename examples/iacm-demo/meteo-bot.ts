/**
 * meteo-bot.ts — MeteoBot: especialista meteo/horario con protocolo IACM.
 *
 * Approach 1: TypeScript class que extiende IacmBotPlugin.
 *
 * Flujos IACM que gestiona:
 *   ← REQUEST  → ACKNOWLEDGE + REPORT  (weather data)
 *   ← QUESTION → ACKNOWLEDGE + ANSWER  (time data)
 *   → FYI      (api status check)
 *   → URGENT   (alertas)
 *   → PROPOSAL (propuestas de configuración)
 *   → QUESTION (preguntas al interlocutor)
 */

import {
  IacmBotPlugin,
  type AimlCategory,
  type IntentHandler,
  type IntentResult,
  type CommandDefinition,
  type MenuDefinition,
  buildReport,
  buildAnswer,
  buildFyi,
  buildUrgent,
  buildProposal,
  buildQuestion,
  formatIacmForChat,
  IACM_INTENTS,
} from "heteronimos-semi-asistidos-sdk";
import { fetchWeather, checkWeatherApi } from "./services/weather-api.js";
import { fetchTime } from "./services/time-api.js";
import type { IacmBotVars } from "heteronimos-semi-asistidos-sdk";

// ─── Variables de sesión ──────────────────────────────────────────────────────

export interface MeteoVars extends IacmBotVars {
  last_city?: string;
  last_timezone?: string;
  update_interval_min?: string;
  pending_proposal_id?: string;
}

// ─── MeteoBot ─────────────────────────────────────────────────────────────────

export class MeteoBot extends IacmBotPlugin<MeteoVars> {
  name = "meteo";
  pluginCode = "mt";
  agentName: string;

  constructor(agentName: string) {
    super();
    this.agentName = agentName;
  }

  override defaultVars(): MeteoVars {
    return {
      ...super.defaultVars(),
      last_city: undefined,
      last_timezone: undefined,
      update_interval_min: "60",
      pending_proposal_id: undefined,
    };
  }

  // ──────────────────────────────────────────────────────────────
  //  STAGE 1 — Categories
  // ──────────────────────────────────────────────────────────────

  override categories(): AimlCategory<MeteoVars>[] {
    return [
      ...super.categories(), // IACM protocol + base categories

      // /mt_weather <city>
      {
        id: "cmd-weather",
        pattern: /^\/\w+_weather\s+(.+)/i,
        resolver: (_vars, stars, ctx) => ({
          intent: "meteo.weather.direct",
          confidence: 1,
          entities: { city: stars[0]?.trim() ?? "" },
          stars,
          originalInput: ctx.text,
        }),
        priority: 9,
      },

      // /mt_apistatus
      {
        id: "cmd-apistatus",
        pattern: /^\/\w+_apistatus$/i,
        resolver: "meteo.fyi.apistatus",
        priority: 9,
      },

      // /mt_alert <msg>
      {
        id: "cmd-alert",
        pattern: /^\/\w+_alert\s+(.+)/i,
        resolver: (_vars, stars, ctx) => ({
          intent: "meteo.urgent.alert",
          confidence: 1,
          entities: { issue: stars[0]?.trim() ?? "" },
          stars,
          originalInput: ctx.text,
        }),
        priority: 9,
      },

      // /mt_propose <texto>
      {
        id: "cmd-propose",
        pattern: /^\/\w+_propose\s+(.+)/i,
        resolver: (_vars, stars, ctx) => ({
          intent: "meteo.proposal.send",
          confidence: 1,
          entities: { title: stars[0]?.trim() ?? "" },
          stars,
          originalInput: ctx.text,
        }),
        priority: 9,
      },

      // /mt_question <texto>
      {
        id: "cmd-question-send",
        pattern: /^\/\w+_question\s+(.+)/i,
        resolver: (_vars, stars, ctx) => ({
          intent: "meteo.question.send",
          confidence: 1,
          entities: { question: stars[0]?.trim() ?? "" },
          stars,
          originalInput: ctx.text,
        }),
        priority: 9,
      },
    ];
  }

  // ──────────────────────────────────────────────────────────────
  //  STAGE 2 — Handlers
  // ──────────────────────────────────────────────────────────────

  override handlers(): IntentHandler<MeteoVars>[] {
    return [
      ...super.handlers(), // protocol handler (ACK, flow state, routing guard)

      // ── REQUEST recibido → fetch weather → REPORT ──────────────
      async (intent, vars) => {
        if (intent.intent !== IACM_INTENTS.REQUEST_RECEIVED) return undefined;
        const city = this.extractCity(intent) ?? vars.last_city ?? "Madrid";
        vars.last_city = city;
        try {
          const wx = await fetchWeather(city);
          const report = buildReport(
            this.agentName,
            intent.entities.from_agent ?? vars.interlocutor ?? "unknown",
            {
              subject: `Parte meteorológico: ${city}`,
              report_type: "findings",
              summary: `${wx.description}, ${wx.tempC}°C, humedad ${wx.humidity}%`,
              findings: [
                `Temperatura: ${wx.tempC}°C (sensación: ${wx.feelsLikeC}°C)`,
                `Humedad: ${wx.humidity}%`,
                `Viento: ${wx.windKph} km/h`,
                `UV: ${wx.uvIndex}`,
              ],
              status: "completed",
            },
            `Parte meteorológico para ${city}: ${wx.description}, ${wx.tempC}°C.`,
            {
              thread_id: vars.active_thread_id,
              reply_to: vars.last_received_message_id,
            },
          );
          vars.flow_state = "idle";
          return formatIacmForChat(report);
        } catch (err) {
          return `⚠️ Error al consultar wttr.in: ${err instanceof Error ? err.message : "desconocido"}`;
        }
      },

      // ── QUESTION recibida → fetch time → ANSWER ────────────────
      async (intent, vars) => {
        if (intent.intent !== IACM_INTENTS.QUESTION_RECEIVED) return undefined;
        const tz = this.extractTimezone(intent) ?? vars.last_timezone ?? "Europe/Madrid";
        vars.last_timezone = tz;
        try {
          const time = await fetchTime(tz);
          const answer = buildAnswer(
            this.agentName,
            intent.entities.from_agent ?? vars.interlocutor ?? "unknown",
            {
              question_id: vars.last_received_message_id ?? "",
              answer: `${time.datetime} (${time.abbreviation}, UTC${time.utcOffset})`,
              answer_type: "definitive",
              confidence: 1.0,
            },
            `Son las ${time.datetime} en ${time.timezone} (${time.abbreviation}).`,
            {
              thread_id: vars.active_thread_id,
              reply_to: vars.last_received_message_id,
            },
          );
          vars.flow_state = "idle";
          return formatIacmForChat(answer);
        } catch (err) {
          return `⚠️ Error al consultar worldtimeapi: ${err instanceof Error ? err.message : "desconocido"}`;
        }
      },

      // ── Comando directo de weather (sin IACM) ─────────────────
      async (intent, vars) => {
        if (intent.intent !== "meteo.weather.direct") return undefined;
        const city = intent.entities.city ?? "Madrid";
        vars.last_city = city;
        try {
          const wx = await fetchWeather(city);
          return `🌤️ ${city}: ${wx.description}, ${wx.tempC}°C (sen. ${wx.feelsLikeC}°C), hum. ${wx.humidity}%, 💨 ${wx.windKph} km/h`;
        } catch (err) {
          return `⚠️ Error: ${err instanceof Error ? err.message : "desconocido"}`;
        }
      },

      // ── FYI: estado de APIs ───────────────────────────────────
      async (intent, vars) => {
        if (intent.intent !== "meteo.fyi.apistatus") return undefined;
        const ok = await checkWeatherApi();
        const fyi = buildFyi(
          this.agentName,
          vars.interlocutor ?? "all",
          {
            subject: "Estado de APIs meteorológicas",
            information: ok ? "wttr.in operativo." : "wttr.in NO responde.",
            information_type: ok ? "update" : "warning",
            action_required: !ok,
          },
          ok
            ? "APIs meteorológicas funcionando con normalidad."
            : "⚠️ API wttr.in no responde. Datos pueden estar desactualizados.",
        );
        return formatIacmForChat(fyi);
      },

      // ── URGENT: alerta ────────────────────────────────────────
      (intent, vars) => {
        if (intent.intent !== "meteo.urgent.alert") return undefined;
        const urgent = buildUrgent(
          this.agentName,
          vars.interlocutor ?? "all",
          {
            issue: intent.entities.issue ?? "Alerta meteorológica",
            severity: "high",
            urgency_reason: intent.entities.issue ?? "Situación requiere atención",
            action_needed: "Revisar estado y tomar medidas",
            action_needed_by: new Date(Date.now() + 3600_000).toISOString(),
          },
          `🚨 URGENTE: ${intent.entities.issue ?? "alerta"}`,
        );
        return formatIacmForChat(urgent);
      },

      // ── PROPOSAL: proponer cambio ─────────────────────────────
      (intent, vars) => {
        if (intent.intent !== "meteo.proposal.send") return undefined;
        const proposal = buildProposal(
          this.agentName,
          vars.interlocutor ?? "all",
          {
            title: intent.entities.title ?? "Propuesta",
            proposal_type: "technical",
            summary: intent.entities.title ?? "",
            rationale: "Optimizar flujo de trabajo",
          },
          `Propuesta: ${intent.entities.title ?? "sin título"}`,
        );
        vars.flow_state = "awaiting_confirmation";
        return formatIacmForChat(proposal);
      },

      // ── QUESTION: hacer pregunta al interlocutor ──────────────
      (intent, vars) => {
        if (intent.intent !== "meteo.question.send") return undefined;
        const q = buildQuestion(
          this.agentName,
          vars.interlocutor ?? "all",
          {
            question: intent.entities.question ?? "",
            context: "Pregunta de configuración",
            question_type: "information",
          },
          intent.entities.question ?? "",
        );
        return formatIacmForChat(q);
      },
    ];
  }

  // ──────────────────────────────────────────────────────────────
  //  Comandos adicionales
  // ──────────────────────────────────────────────────────────────

  override commands(): CommandDefinition[] {
    return [
      ...super.commands(),
      { command: "weather",   description: "🌤️ Tiempo directo (sin IACM)", buildText: (ctx: any) => this.onMessage(ctx) },
      { command: "apistatus", description: "📡 Estado de APIs (envía FYI)", buildText: (ctx: any) => this.onMessage(ctx) },
      { command: "alert",     description: "🚨 Enviar alerta (URGENT)",     buildText: (ctx: any) => this.onMessage(ctx) },
      { command: "propose",   description: "📝 Proponer cambio (PROPOSAL)", buildText: (ctx: any) => this.onMessage(ctx) },
      { command: "question",  description: "❓ Hacer pregunta (QUESTION)",  buildText: (ctx: any) => this.onMessage(ctx) },
    ];
  }

  override menus(): MenuDefinition[] {
    return [
      ...super.menus(),
      {
        command: "menu",
        description: "MeteoBot menú",
        entryPage: "home",
        pages: [
          {
            id: "home",
            text: "<b>🌤️ MeteoBot</b>\n\nDatos meteorológicos y horarios via IACM.",
            buttons: [
              { label: "📋 Comandos", goTo: "cmds" },
              { label: "📡 Protocolo", goTo: "proto" },
            ],
          },
          {
            id: "cmds",
            text: "<b>Comandos</b>\n\n<code>/mt_weather Madrid</code> — tiempo directo\n<code>/mt_apistatus</code> — FYI estado APIs\n<code>/mt_alert msg</code> — URGENT\n<code>/mt_propose msg</code> — PROPOSAL\n<code>/mt_question msg</code> — QUESTION",
            buttons: [{ label: "‹ Volver", goTo: "home" }],
          },
          {
            id: "proto",
            text: "<b>Protocolo IACM</b>\n\nMeteoBot responde a:\n• REQUEST → REPORT (weather)\n• QUESTION → ANSWER (time)\n\nMeteoBot envía:\n• FYI (api status)\n• URGENT (alertas)\n• PROPOSAL (cambios de config)\n• QUESTION (preguntas al interlocutor)",
            buttons: [{ label: "‹ Volver", goTo: "home" }],
          },
        ],
      },
    ];
  }

  // ──────────────────────────────────────────────────────────────
  //  Utilidades privadas
  // ──────────────────────────────────────────────────────────────

  private extractCity(intent: IntentResult): string | undefined {
    if (intent.entities.city) return intent.entities.city;
    const m = intent.originalInput.match(
      /(?:weather|tiempo|meteo|parte)\s+(?:for|para|de|en)?\s*([\w\s-]+?)(?:\s*[,\n]|$)/i,
    );
    return m?.[1]?.trim();
  }

  private extractTimezone(intent: IntentResult): string | undefined {
    if (intent.entities.timezone) return intent.entities.timezone;
    const m = intent.originalInput.match(/(?:time|hora)\s+(?:in|en|de)?\s*([\w/]+)/i);
    return m?.[1];
  }
}
