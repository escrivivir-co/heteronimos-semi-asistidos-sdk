# SDS-18 · IACM Demo App — Boilerplate de referencia

> **heteronimos-semi-asistidos-sdk** · Software Design Specification
> Estado: DRAFT · target: v0.5.0
> Dependencia: SDS-16 (AIML Intent Engine), SDS-17 (IACM Protocol Integration)

---

## 1. Objetivo

Construir una **aplicación de ejemplo completa** (`examples/iacm-demo/`) que sirva como:

1. **Boilerplate de referencia** — el punto de partida para cualquier developer que quiera montar bots IACM con el SDK.
2. **Demostración de los 11 tipos de mensaje** — ejercita REQUEST, REPORT, QUESTION, ANSWER, PROPOSAL, ACKNOWLEDGE, ACCEPT, REJECT, DEFER, FYI y URGENT en flujos reales.
3. **Validación del pipeline** — confirma que el pipeline `input → IntentEngine → IntentResult → handlers → response` funciona end-to-end con 2 bots comunicándose en un grupo.
4. **Showcase de los 3 modos de configuración** — TypeScript classes, JSON declarativo, y arrow functions inline.
5. **Detector de gaps** — al implementar la demo, se identifican omisiones en SDS-16 y SDS-17 que requieren corrección.

**Escenario:** dos bots en un grupo de Telegram intercambian mensajes IACM en flujos estructurados, usando APIs públicas reales (sin API key).

---

## 2. Contexto

### 2.1 Los dos bots

| Bot | Código | Rol | APIs |
|-----|--------|-----|------|
| **MeteoBot** | `mt` | Especialista en datos meteorológicos y horarios. Responde a REQUESTs con partes meteorológicos. Contesta preguntas de hora. Envía FYIs y URGENTs sobre estado de APIs. | `wttr.in` (weather), `worldtimeapi.org` (time) |
| **DispatchBot** | `dp` | Coordinador. Envía REQUESTs, hace PREGUNTAs, gestiona PROPOSALs. Es el que el operador humano controla vía comandos. | — (solo lógica interna) |

### 2.2 APIs públicas (sin API key)

| API | Endpoint | Uso | Rate limit |
|-----|----------|-----|------------|
| wttr.in | `https://wttr.in/{city}?format=j1` | Parte meteorológico JSON | ~300 req/h IP |
| worldtimeapi | `https://worldtimeapi.org/api/timezone/{tz}` | Hora por timezone JSON | ~300 req/h IP |

Ambas son gratuitas, sin registro, y devuelven JSON. Ideales para una demo.

### 2.3 Relación con SDS-16 y SDS-17

```
SDS-16: AimlBotPlugin<TVars>    →  Pipeline: classify → handlers → response
SDS-17: IacmBotPlugin<TVars>    →  IACM categories + protocol handlers
SDS-18: examples/iacm-demo/     →  2 bots que usan IacmBotPlugin con APIs reales
                                    + boilerplate para el developer
```

**SDS-18 es consumidor de SDS-16 y SDS-17.** Si algo no funciona al implementar la demo, se retoca el SDK (feedback loop).

---

## 3. Los 11 flujos IACM

Cada flujo ejercita un subconjunto de los 11 message types. El operador humano dispara los flujos con comandos del DispatchBot.

### 3.1 Mapa completo de flujos

```
┌──────────────────────────────────────────────────────────────────────┐
│  FLUJO A · REQUEST → ACKNOWLEDGE → REPORT                           │
│  Trigger: /dp_weather Madrid                                         │
│                                                                      │
│  DispatchBot ──REQUEST──→ [grupo] ──→ MeteoBot (detecta, ACK)        │
│  MeteoBot ──ACKNOWLEDGE──→ [grupo]                                   │
│  MeteoBot ──(fetch wttr.in)──→ MeteoBot ──REPORT──→ [grupo]          │
│  DispatchBot (detecta REPORT, muestra resultado)                     │
├──────────────────────────────────────────────────────────────────────┤
│  FLUJO B · QUESTION → ANSWER                                        │
│  Trigger: /dp_time Europe/Madrid                                     │
│                                                                      │
│  DispatchBot ──QUESTION──→ [grupo] ──→ MeteoBot (detecta)            │
│  MeteoBot ──(fetch worldtimeapi)──→ MeteoBot ──ANSWER──→ [grupo]     │
│  DispatchBot (detecta ANSWER, muestra hora)                          │
├──────────────────────────────────────────────────────────────────────┤
│  FLUJO C · PROPOSAL → ACCEPT                                        │
│  Trigger: /mt_propose "Actualizar datos cada 30 min"                 │
│  Respuesta: /dp_accept                                               │
│                                                                      │
│  MeteoBot ──PROPOSAL──→ [grupo] ──→ DispatchBot (detecta, espera)    │
│  Operador: /dp_accept                                                │
│  DispatchBot ──ACCEPT──→ [grupo] ──→ MeteoBot (detecta, confirma)    │
├──────────────────────────────────────────────────────────────────────┤
│  FLUJO D · PROPOSAL → REJECT                                        │
│  Trigger: /mt_propose "Cambiar formato a XML"                        │
│  Respuesta: /dp_reject "XML es innecesariamente complejo"            │
│                                                                      │
│  MeteoBot ──PROPOSAL──→ [grupo]                                      │
│  DispatchBot ──REJECT──→ [grupo] ──→ MeteoBot (detecta, registra)    │
├──────────────────────────────────────────────────────────────────────┤
│  FLUJO E · QUESTION → DEFER                                         │
│  Trigger: /mt_question "¿Qué ciudades monitorizar?"                  │
│  Respuesta: /dp_defer "Necesito consultar con el equipo"             │
│                                                                      │
│  MeteoBot ──QUESTION──→ [grupo]                                      │
│  DispatchBot ──DEFER──→ [grupo] ──→ MeteoBot (detecta, pone timer)   │
├──────────────────────────────────────────────────────────────────────┤
│  FLUJO F · FYI (standalone)                                          │
│  Trigger: /mt_apistatus                                              │
│                                                                      │
│  MeteoBot ──(check wttr.in)──→ MeteoBot ──FYI──→ [grupo]             │
│  DispatchBot (detecta FYI, registra info)                            │
├──────────────────────────────────────────────────────────────────────┤
│  FLUJO G · URGENT (standalone)                                       │
│  Trigger: /mt_alert "API caída detectada"                            │
│                                                                      │
│  MeteoBot ──URGENT──→ [grupo] ──→ DispatchBot (detecta, ACK)         │
│  DispatchBot ──ACKNOWLEDGE──→ [grupo]                                │
├──────────────────────────────────────────────────────────────────────┤
│  FLUJO H · Demo completo (secuencia automática)                      │
│  Trigger: /dp_demo Madrid                                            │
│                                                                      │
│  Ejecuta Flow A (weather) → Flow B (time) secuencialmente            │
│  Muestra resumen al final                                            │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 Tabla resumen: cobertura de los 11 tipos

| Tipo IACM | Flujo(s) | Quién envía | Cuándo |
|-----------|----------|-------------|--------|
| REQUEST | A, H | DispatchBot | Al pedir datos meteo |
| ACKNOWLEDGE | A, G | MeteoBot (auto), DispatchBot (auto) | Al recibir cualquier directivo/urgente |
| REPORT | A, H | MeteoBot | Tras fetch de API |
| QUESTION | B, E, H | DispatchBot (B,H), MeteoBot (E) | Al pedir hora / al preguntar config |
| ANSWER | B, H | MeteoBot | Tras fetch de hora |
| PROPOSAL | C, D | MeteoBot | Config changes |
| ACCEPT | C | DispatchBot | Aprueba propuesta |
| REJECT | D | DispatchBot | Rechaza propuesta |
| DEFER | E | DispatchBot | Pospone decisión |
| FYI | F | MeteoBot | Status de APIs |
| URGENT | G | MeteoBot | API caída / emergencia |

---

## 4. Diseño técnico

### 4.1 Estructura de archivos

```
examples/iacm-demo/
├── README.md                   ← Guía rápida para el developer
├── package.json                ← deps: SDK + grammy + rxjs
├── tsconfig.json
├── .env.example                ← BOT_TOKEN_METEO, BOT_TOKEN_DISPATCH
│
├── main.ts                     ← Entrypoint: arranca los 2 bots
├── config.ts                   ← Env vars + configuración
│
├── meteo-bot.ts                ← MeteoBot: extends IacmBotPlugin (Approach 1: TS class)
├── dispatch-bot.ts             ← DispatchBot: extends IacmBotPlugin (Approach 1: TS class)
│
├── categories/                 ← Approach 2: JSON declarativo
│   ├── meteo-categories.json   ← Categories de MeteoBot en JSON
│   └── dispatch-categories.json← Categories de DispatchBot en JSON
│
├── handlers/                   ← Approach 3: Arrow functions standalone
│   ├── weather-handler.ts      ← IntentHandler para weather intents
│   ├── time-handler.ts         ← IntentHandler para time intents
│   └── protocol-handler.ts     ← Custom overrides del protocol handler
│
├── services/                   ← API clients
│   ├── weather-api.ts          ← Fetch wttr.in
│   └── time-api.ts             ← Fetch worldtimeapi.org
│
└── flows/                      ← Documentación de flujos
    └── README.md               ← Diagrama de cada flujo
```

### 4.2 Entrypoint: `main.ts`

```typescript
import { MeteoBot } from "./meteo-bot";
import { DispatchBot } from "./dispatch-bot";
import { METEO_TOKEN, DISPATCH_TOKEN, METEO_AGENT, DISPATCH_AGENT } from "./config";
import { Logger, bootBot } from "heteronimos-semi-asistidos-sdk";
import * as path from "node:path";

const appDir = __dirname;
const log = new Logger("iacm-demo");

/**
 * Arranca los 2 bots.
 *
 * En producción Telegram, cada bot tiene su propio token.
 * En mock mode (sin tokens), ambos corren en un MockTelegramBot compartido.
 *
 * NOTA: Los 2 bots operan en el mismo grupo. Cada uno ve los mensajes
 * del otro. El pipeline IACM filtra por `to_agent` para procesar
 * solo los mensajes dirigidos a sí mismo.
 */
async function main() {
  const meteo = new MeteoBot(METEO_AGENT);
  const dispatch = new DispatchBot(DISPATCH_AGENT);

  // Bot 1: MeteoBot
  const r1 = await bootBot({
    plugins: [meteo],
    envDir: appDir,
    chatStorePath: path.join(appDir, ".chats-meteo.json"),
    logger: new Logger("meteo"),
    tokenEnvVar: "BOT_TOKEN_METEO",
  });

  // Bot 2: DispatchBot
  const r2 = await bootBot({
    plugins: [dispatch],
    envDir: appDir,
    chatStorePath: path.join(appDir, ".chats-dispatch.json"),
    logger: new Logger("dispatch"),
    tokenEnvVar: "BOT_TOKEN_DISPATCH",
  });

  if (!r1.started || !r2.started) {
    log.error("Failed to start one or both bots.");
    globalThis.process.exitCode = 1;
  } else {
    log.info("Both bots running. Send /dp_demo <city> in the group to start.");
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error.";
  log.error(`Fatal: ${message}`);
  globalThis.process.exitCode = 1;
});
```

### 4.3 `config.ts`

```typescript
function env(name: string, fallback?: string): string {
  const v = process.env[name]?.trim();
  if (v) return v;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing env var: ${name}`);
}

/** Nombres de agente IACM (visibles en campo from_agent/to_agent) */
export const METEO_AGENT = env("METEO_AGENT_NAME", "MeteoBot");
export const DISPATCH_AGENT = env("DISPATCH_AGENT_NAME", "DispatchBot");

/** Tokens de Telegram (uno por bot) */
export const METEO_TOKEN = env("BOT_TOKEN_METEO", "");
export const DISPATCH_TOKEN = env("BOT_TOKEN_DISPATCH", "");

/** Ciudades por defecto */
export const DEFAULT_CITY = env("DEFAULT_CITY", "Madrid");
export const DEFAULT_TIMEZONE = env("DEFAULT_TIMEZONE", "Europe/Madrid");
```

### 4.4 `services/weather-api.ts` — cliente wttr.in

```typescript
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
 * Fetch weather from wttr.in (free, no API key).
 * Returns structured data, not text.
 */
export async function fetchWeather(city: string): Promise<WeatherData> {
  const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`wttr.in error: ${res.status}`);
  const json = await res.json();
  const current = json.current_condition?.[0];
  if (!current) throw new Error("No weather data returned");
  return {
    city,
    tempC: Number(current.temp_C),
    tempF: Number(current.temp_F),
    humidity: Number(current.humidity),
    description: current.weatherDesc?.[0]?.value ?? "Unknown",
    windKph: Number(current.windspeedKmph),
    feelsLikeC: Number(current.FeelsLikeC),
    uvIndex: Number(current.uvIndex),
  };
}

/** Check if wttr.in is reachable. */
export async function checkWeatherApi(): Promise<boolean> {
  try {
    const res = await fetch("https://wttr.in/?format=j1", { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch { return false; }
}
```

### 4.5 `services/time-api.ts` — cliente worldtimeapi

```typescript
export interface TimeData {
  timezone: string;
  datetime: string;
  utcOffset: string;
  dayOfWeek: number;
  abbreviation: string;
}

/**
 * Fetch current time from worldtimeapi.org (free, no API key).
 */
export async function fetchTime(timezone: string): Promise<TimeData> {
  const url = `https://worldtimeapi.org/api/timezone/${encodeURIComponent(timezone)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`worldtimeapi error: ${res.status}`);
  const json = await res.json();
  return {
    timezone: json.timezone,
    datetime: json.datetime,
    utcOffset: json.utc_offset,
    dayOfWeek: json.day_of_week,
    abbreviation: json.abbreviation,
  };
}
```

---

## 5. MeteoBot — Approach 1: TypeScript class

MeteoBot responde a REQUESTs de otros bots con datos reales de APIs.

### 5.1 `meteo-bot.ts`

```typescript
import {
  IacmBotPlugin,
  type AimlCategory, type IntentHandler, type IntentResult,
  type CommandDefinition, type MenuDefinition,
  buildReport, buildAnswer, buildAcknowledge, buildFyi, buildUrgent,
  buildProposal,
  formatIacmForChat, IACM_INTENTS,
} from "heteronimos-semi-asistidos-sdk";
import { fetchWeather, checkWeatherApi, type WeatherData } from "./services/weather-api";
import { fetchTime, type TimeData } from "./services/time-api";

/** Variables de sesión del MeteoBot */
interface MeteoVars {
  // De IacmSessionVars:
  agent_role?: string;
  active_thread_id?: string;
  last_sent_message_id?: string;
  last_received_message_id?: string;
  flow_state?: "idle" | "awaiting_response" | "awaiting_confirmation" | "processing";
  last_received_type?: string;
  interlocutor?: string;
  // Propias de MeteoBot:
  last_city?: string;
  last_timezone?: string;
  update_interval_min?: string;
  pending_proposal_id?: string;
}

export class MeteoBot extends IacmBotPlugin<MeteoVars> {
  name = "meteo";
  pluginCode = "mt";

  /** Nombre de agente IACM (visible en from_agent) */
  private agentName: string;

  constructor(agentName: string) {
    super({ traceMatching: false });
    this.agentName = agentName;
  }

  defaultVars(): MeteoVars {
    return {
      ...super.defaultVars(),
      agent_role: this.agentName,
      last_city: undefined,
      last_timezone: undefined,
      update_interval_min: "60",
      pending_proposal_id: undefined,
    };
  }

  // ──────────────────────────────────────────────────────────────
  //  STAGE 1 — Categories: patterns → intents
  //  MeteoBot AÑADE categories de dominio a las IACM base.
  // ──────────────────────────────────────────────────────────────

  categories(): AimlCategory<MeteoVars>[] {
    return [
      ...super.categories(), // IACM protocol categories (detect [REQUEST], [QUESTION], etc.)

      // ── Comando directo: /mt_weather <city> ──
      {
        id: "cmd-weather",
        pattern: /^\/\w+_weather\s+(.+)/i,
        resolver: (vars, stars, ctx) => ({
          intent: "meteo.weather.direct",
          confidence: 1,
          entities: { city: stars[0].trim() },
          stars,
          originalInput: ctx.text,
        }),
      },

      // ── Comando: /mt_apistatus ──
      {
        id: "cmd-apistatus",
        pattern: /^\/\w+_apistatus$/i,
        resolver: "meteo.fyi.apistatus",
      },

      // ── Comando: /mt_alert <msg> ──
      {
        id: "cmd-alert",
        pattern: /^\/\w+_alert\s+(.+)/i,
        resolver: (vars, stars, ctx) => ({
          intent: "meteo.urgent.alert",
          confidence: 1,
          entities: { issue: stars[0].trim() },
          stars,
          originalInput: ctx.text,
        }),
      },

      // ── Comando: /mt_propose <texto> ──
      {
        id: "cmd-propose",
        pattern: /^\/\w+_propose\s+(.+)/i,
        resolver: (vars, stars, ctx) => ({
          intent: "meteo.proposal.send",
          confidence: 1,
          entities: { title: stars[0].trim() },
          stars,
          originalInput: ctx.text,
        }),
      },

      // ── Comando: /mt_question <texto> ──
      {
        id: "cmd-question",
        pattern: /^\/\w+_question\s+(.+)/i,
        resolver: (vars, stars, ctx) => ({
          intent: "meteo.question.send",
          confidence: 1,
          entities: { question: stars[0].trim() },
          stars,
          originalInput: ctx.text,
        }),
      },
    ];
  }

  // ──────────────────────────────────────────────────────────────
  //  STAGE 2 — Handlers: intent → respuesta
  //  IACM protocol handler va primero (super.handlers()).
  //  Los domain handlers van después.
  // ──────────────────────────────────────────────────────────────

  handlers(): IntentHandler<MeteoVars>[] {
    return [
      ...super.handlers(), // Protocol handler: iacm.* intents

      // ── Handler: REQUEST recibido → fetch weather → REPORT ──
      async (intent, vars) => {
        if (intent.intent !== IACM_INTENTS.REQUEST_RECEIVED) return undefined;

        // Extraer ciudad del texto del request
        const city = this.extractCityFromRequest(intent) ?? vars.last_city ?? "Madrid";
        vars.last_city = city;

        try {
          const weather = await fetchWeather(city);
          const report = buildReport(
            this.agentName,
            intent.entities.from_agent ?? "unknown",
            {
              subject: `Parte meteorológico: ${city}`,
              report_type: "findings",
              summary: `${weather.description}, ${weather.tempC}°C, humedad ${weather.humidity}%`,
              findings: [
                `Temperatura: ${weather.tempC}°C (sensación: ${weather.feelsLikeC}°C)`,
                `Humedad: ${weather.humidity}%`,
                `Viento: ${weather.windKph} km/h`,
                `UV: ${weather.uvIndex}`,
              ],
              status: "completed",
            },
            `Parte meteorológico para ${city}: ${weather.description}, ${weather.tempC}°C.`,
            { thread_id: vars.active_thread_id, reply_to: vars.last_received_message_id },
          );
          return formatIacmForChat(report);
        } catch (err) {
          return `⚠️ Error al consultar wttr.in: ${err instanceof Error ? err.message : "desconocido"}`;
        }
      },

      // ── Handler: QUESTION recibida → fetch time → ANSWER ──
      async (intent, vars) => {
        if (intent.intent !== IACM_INTENTS.QUESTION_RECEIVED) return undefined;

        const tz = this.extractTimezoneFromQuestion(intent) ?? vars.last_timezone ?? "Europe/Madrid";
        vars.last_timezone = tz;

        try {
          const time = await fetchTime(tz);
          const answer = buildAnswer(
            this.agentName,
            intent.entities.from_agent ?? "unknown",
            {
              question_id: vars.last_received_message_id ?? "",
              answer: `${time.datetime} (${time.abbreviation}, UTC${time.utcOffset})`,
              answer_type: "definitive",
              confidence: 1.0,
            },
            `Son las ${time.datetime} en ${time.timezone} (${time.abbreviation}).`,
            { thread_id: vars.active_thread_id, reply_to: vars.last_received_message_id },
          );
          return formatIacmForChat(answer);
        } catch (err) {
          return `⚠️ Error al consultar worldtimeapi: ${err instanceof Error ? err.message : "desconocido"}`;
        }
      },

      // ── Handler: weather directo (sin IACM, solo datos) ──
      async (intent, vars) => {
        if (intent.intent !== "meteo.weather.direct") return undefined;
        const city = intent.entities.city ?? "Madrid";
        vars.last_city = city;
        const weather = await fetchWeather(city);
        return `🌤️ ${city}: ${weather.description}, ${weather.tempC}°C (sen. ${weather.feelsLikeC}°C), hum. ${weather.humidity}%, viento ${weather.windKph} km/h`;
      },

      // ── Handler: FYI api status ──
      async (intent, vars) => {
        if (intent.intent !== "meteo.fyi.apistatus") return undefined;
        const ok = await checkWeatherApi();
        const fyi = buildFyi(
          this.agentName,
          "all",
          {
            subject: "Estado de APIs meteorológicas",
            information: ok ? "wttr.in operativo." : "wttr.in NO responde.",
            information_type: ok ? "update" : "warning",
            action_required: !ok,
          },
          ok ? "APIs meteorológicas funcionando con normalidad." : "⚠️ API wttr.in no responde. Datos pueden estar desactualizados.",
        );
        return formatIacmForChat(fyi);
      },

      // ── Handler: URGENT alert ──
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
          `🚨 URGENTE: ${intent.entities.issue}`,
        );
        return formatIacmForChat(urgent);
      },

      // ── Handler: enviar PROPOSAL ──
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
          `Propuesta: ${intent.entities.title}`,
        );
        vars.flow_state = "awaiting_confirmation";
        return formatIacmForChat(proposal);
      },

      // ── Handler: enviar QUESTION de MeteoBot ──
      (intent, vars) => {
        if (intent.intent !== "meteo.question.send") return undefined;
        // Este handler delega al comando IACM estándar
        // Pero construimos nosotros un QUESTION con campos ricos
        return `📝 [QUESTION] ${this.agentName} → ${vars.interlocutor ?? "all"}\n${intent.entities.question}`;
      },
    ];
  }

  // ──────────────────────────────────────────────────────────────
  //  Comandos y menús
  // ──────────────────────────────────────────────────────────────

  commands(): CommandDefinition[] {
    return [
      ...super.commands(),
      {
        command: "weather",
        description: "Parte meteorológico directo (sin IACM)",
        buildText: (ctx) => this.onMessage(ctx),
      },
      {
        command: "apistatus",
        description: "Estado de APIs (envía FYI)",
        buildText: (ctx) => this.onMessage(ctx),
      },
      {
        command: "alert",
        description: "Enviar URGENT al grupo",
        buildText: (ctx) => this.onMessage(ctx),
      },
      {
        command: "propose",
        description: "Proponer cambio (envía PROPOSAL)",
        buildText: (ctx) => this.onMessage(ctx),
      },
      {
        command: "question",
        description: "Hacer pregunta al grupo (envía QUESTION)",
        buildText: (ctx) => this.onMessage(ctx),
      },
    ];
  }

  menus(): MenuDefinition[] {
    return [
      {
        command: "menu",
        description: "MeteoBot menu",
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
            text: "<b>Comandos</b>\n\n<code>/mt_weather Madrid</code> — Tiempo directo\n<code>/mt_apistatus</code> — FYI estado APIs\n<code>/mt_alert msg</code> — URGENT\n<code>/mt_propose msg</code> — PROPOSAL",
            buttons: [{ label: "< Volver", goTo: "home" }],
          },
          {
            id: "proto",
            text: "<b>Protocolo IACM</b>\n\nMeteoBot responde a:\n• REQUEST → REPORT (weather)\n• QUESTION → ANSWER (time)\n\nMeteoBot envía:\n• FYI (api status)\n• URGENT (alerts)\n• PROPOSAL (config)",
            buttons: [{ label: "< Volver", goTo: "home" }],
          },
        ],
      },
    ];
  }

  // ──────────────────────────────────────────────────────────────
  //  Utilidades privadas
  // ──────────────────────────────────────────────────────────────

  private extractCityFromRequest(intent: IntentResult): string | undefined {
    // Buscar en entities del parser IACM, o en el input original
    if (intent.entities.city) return intent.entities.city;
    // Fallback: buscar nombre de ciudad en el texto original
    const match = intent.originalInput.match(/(?:weather|tiempo|meteo)\s+(?:for|para|de|en)?\s*(\S+)/i);
    return match?.[1];
  }

  private extractTimezoneFromQuestion(intent: IntentResult): string | undefined {
    if (intent.entities.timezone) return intent.entities.timezone;
    const match = intent.originalInput.match(/(?:time|hora)\s+(?:in|en|de)?\s*([\w/]+)/i);
    return match?.[1];
  }
}
```

---

## 6. DispatchBot — Approach 1: TypeScript class

DispatchBot es el coordinador que el operador humano controla. Envía REQUESTs y QUESTIONs, gestiona PROPOSALs.

### 6.1 `dispatch-bot.ts`

```typescript
import {
  IacmBotPlugin,
  type AimlCategory, type IntentHandler, type IntentResult,
  type CommandDefinition, type MenuDefinition, type MessageContext,
  buildRequest, buildQuestion, buildAccept, buildReject, buildDefer,
  buildAcknowledge,
  formatIacmForChat, IACM_INTENTS,
} from "heteronimos-semi-asistidos-sdk";

interface DispatchVars {
  // IacmSessionVars
  agent_role?: string;
  active_thread_id?: string;
  last_sent_message_id?: string;
  last_received_message_id?: string;
  flow_state?: "idle" | "awaiting_response" | "awaiting_confirmation" | "processing";
  last_received_type?: string;
  interlocutor?: string;
  // Propias de DispatchBot
  target_agent?: string;
  pending_proposal_id?: string;
  last_report_summary?: string;
  last_answer?: string;
  demo_step?: string;
}

export class DispatchBot extends IacmBotPlugin<DispatchVars> {
  name = "dispatch";
  pluginCode = "dp";

  private agentName: string;

  constructor(agentName: string) {
    super();
    this.agentName = agentName;
  }

  defaultVars(): DispatchVars {
    return {
      ...super.defaultVars(),
      agent_role: this.agentName,
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

  categories(): AimlCategory<DispatchVars>[] {
    return [
      ...super.categories(),

      // ── /dp_weather <city> → enviar REQUEST de weather ──
      {
        id: "cmd-weather-req",
        pattern: /^\/\w+_weather\s+(.+)/i,
        resolver: (vars, stars, ctx) => ({
          intent: "dispatch.send.weather_request",
          confidence: 1,
          entities: { city: stars[0].trim() },
          stars,
          originalInput: ctx.text,
        }),
        priority: 9,
      },

      // ── /dp_time <timezone> → enviar QUESTION de hora ──
      {
        id: "cmd-time-q",
        pattern: /^\/\w+_time\s+(.+)/i,
        resolver: (vars, stars, ctx) => ({
          intent: "dispatch.send.time_question",
          confidence: 1,
          entities: { timezone: stars[0].trim() },
          stars,
          originalInput: ctx.text,
        }),
        priority: 9,
      },

      // ── /dp_accept → ACCEPT última proposal ──
      {
        id: "cmd-accept",
        pattern: /^\/\w+_accept$/i,
        resolver: "dispatch.send.accept",
        priority: 9,
      },

      // ── /dp_reject <razón> → REJECT última proposal ──
      {
        id: "cmd-reject",
        pattern: /^\/\w+_reject\s+(.+)/i,
        resolver: (vars, stars, ctx) => ({
          intent: "dispatch.send.reject",
          confidence: 1,
          entities: { rationale: stars[0].trim() },
          stars,
          originalInput: ctx.text,
        }),
        priority: 9,
      },

      // ── /dp_defer <razón> → DEFER ──
      {
        id: "cmd-defer",
        pattern: /^\/\w+_defer\s+(.+)/i,
        resolver: (vars, stars, ctx) => ({
          intent: "dispatch.send.defer",
          confidence: 1,
          entities: { reason: stars[0].trim() },
          stars,
          originalInput: ctx.text,
        }),
        priority: 9,
      },

      // ── /dp_demo <city> → demo completa (Flow A + B) ──
      {
        id: "cmd-demo",
        pattern: /^\/\w+_demo\s+(.+)/i,
        resolver: (vars, stars, ctx) => ({
          intent: "dispatch.demo",
          confidence: 1,
          entities: { city: stars[0].trim() },
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

  handlers(): IntentHandler<DispatchVars>[] {
    return [
      ...super.handlers(),

      // ── Enviar REQUEST de weather ──
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

      // ── Enviar QUESTION de hora ──
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

      // ── Recibir REPORT → mostrar resumen ──
      (intent, vars) => {
        if (intent.intent !== IACM_INTENTS.REPORT_RECEIVED) return undefined;
        vars.flow_state = "idle";
        vars.last_report_summary = intent.originalInput;
        return `✅ REPORT recibido. Flujo REQUEST→REPORT completado.`;
      },

      // ── Recibir ANSWER → mostrar respuesta ──
      (intent, vars) => {
        if (intent.intent !== IACM_INTENTS.ANSWER_RECEIVED) return undefined;
        vars.flow_state = "idle";
        vars.last_answer = intent.originalInput;
        return `✅ ANSWER recibida. Flujo QUESTION→ANSWER completado.`;
      },

      // ── Recibir PROPOSAL → esperar decisión ──
      (intent, vars) => {
        if (intent.intent !== IACM_INTENTS.PROPOSAL_RECEIVED) return undefined;
        vars.flow_state = "awaiting_confirmation";
        vars.pending_proposal_id = intent.matchedCategoryId ?? intent.entities.message_id ?? "";
        return `🤝 PROPOSAL recibida. Usa /dp_accept, /dp_reject <razón>, o /dp_defer <razón>.`;
      },

      // ── Enviar ACCEPT ──
      (intent, vars) => {
        if (intent.intent !== "dispatch.send.accept") return undefined;
        if (!vars.pending_proposal_id) return "⚠️ No hay propuesta pendiente.";
        const accept = buildAccept(
          this.agentName,
          vars.interlocutor ?? "all",
          {
            proposal_id: vars.pending_proposal_id,
            acceptance_type: "unconditional",
            commitment: "Propuesta aceptada.",
          },
          "Propuesta aceptada.",
          { reply_to: vars.pending_proposal_id },
        );
        vars.flow_state = "idle";
        vars.pending_proposal_id = undefined;
        return formatIacmForChat(accept);
      },

      // ── Enviar REJECT ──
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
          `Propuesta rechazada: ${intent.entities.rationale ?? "sin razón"}.`,
          { reply_to: vars.pending_proposal_id },
        );
        vars.flow_state = "idle";
        vars.pending_proposal_id = undefined;
        return formatIacmForChat(reject);
      },

      // ── Enviar DEFER ──
      (intent, vars) => {
        if (intent.intent !== "dispatch.send.defer") return undefined;
        const msgId = vars.pending_proposal_id ?? vars.last_received_message_id ?? "";
        const defer = buildDefer(
          this.agentName,
          vars.interlocutor ?? "all",
          {
            deferred_message_id: msgId,
            reason: intent.entities.reason ?? "Necesito más información.",
          },
          `Decisión aplazada: ${intent.entities.reason}.`,
          { reply_to: msgId },
        );
        vars.flow_state = "idle";
        vars.pending_proposal_id = undefined;
        return formatIacmForChat(defer);
      },

      // ── Demo: secuencia automática ──
      async (intent, vars, ctx) => {
        if (intent.intent !== "dispatch.demo") return undefined;
        const city = intent.entities.city ?? "Madrid";

        // Step 1: REQUEST weather
        const req = buildRequest(
          this.agentName,
          vars.target_agent ?? "MeteoBot",
          {
            task: `Parte meteorológico para ${city}`,
            priority: "medium",
          },
          `Demo: solicito parte meteorológico para ${city}.`,
        );
        const step1 = formatIacmForChat(req);

        // Return step 1 — MeteoBot will respond with REPORT
        // (full demo would need async orchestration, shown here as single REQUEST)
        vars.flow_state = "awaiting_response";
        return `🎬 **DEMO IACM** — Flujo A: REQUEST→REPORT\n\n${step1}\n\n⏳ Esperando REPORT de MeteoBot...`;
      },

      // ── Recibir URGENT → auto-ACK ──
      (intent, vars) => {
        if (intent.intent !== IACM_INTENTS.URGENT_RECEIVED) return undefined;
        const ack = buildAcknowledge(
          this.agentName,
          intent.entities.from_agent ?? "unknown",
          {
            acknowledged_message_id: intent.matchedCategoryId ?? "",
            confirmation: "URGENTE recibido y registrado.",
            understood: true,
          },
          "Alerta recibida. Tomando medidas.",
        );
        return formatIacmForChat(ack);
      },
    ];
  }

  // ──────────────────────────────────────────────────────────────
  //  Comandos y menús
  // ──────────────────────────────────────────────────────────────

  commands(): CommandDefinition[] {
    return [
      ...super.commands(),
      {
        command: "weather",
        description: "REQUEST parte meteorológico (→ MeteoBot)",
        buildText: (ctx) => this.onMessage(ctx),
      },
      {
        command: "time",
        description: "QUESTION hora actual (→ MeteoBot)",
        buildText: (ctx) => this.onMessage(ctx),
      },
      {
        command: "accept",
        description: "ACCEPT propuesta pendiente",
        buildText: (ctx) => this.onMessage(ctx),
      },
      {
        command: "reject",
        description: "REJECT propuesta pendiente",
        buildText: (ctx) => this.onMessage(ctx),
      },
      {
        command: "defer",
        description: "DEFER decisión pendiente",
        buildText: (ctx) => this.onMessage(ctx),
      },
      {
        command: "demo",
        description: "Ejecutar demo completa IACM",
        buildText: (ctx) => this.onMessage(ctx),
      },
    ];
  }

  menus(): MenuDefinition[] {
    return [
      {
        command: "menu",
        description: "DispatchBot menu",
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
            buttons: [{ label: "< Volver", goTo: "home" }],
          },
          {
            id: "manage",
            text: "<b>Gestionar propuestas</b>\n\n<code>/dp_accept</code> — Aceptar\n<code>/dp_reject razón</code> — Rechazar\n<code>/dp_defer razón</code> — Aplazar",
            buttons: [{ label: "< Volver", goTo: "home" }],
          },
          {
            id: "demo",
            text: "<b>Demo IACM</b>\n\n<code>/dp_demo Madrid</code> — Ejecuta REQUEST + QUESTION\n\nMuestra los 2 flujos principales automáticamente.",
            buttons: [{ label: "< Volver", goTo: "home" }],
          },
        ],
      },
    ];
  }
}
```

---

## 7. Approach 2: JSON declarativo — `categories/`

Para developers que prefieren **definir patterns sin código** (ej: diseñadores de flujo, no-code personas).

### 7.1 `categories/meteo-categories.json`

```json
[
  {
    "id": "json-greet",
    "pattern": "^(hola|hello|hi) meteo",
    "patternType": "regex",
    "resolver": "meteo.greet",
    "priority": 3
  },
  {
    "id": "json-weather-city",
    "pattern": "^(tiempo|weather) en (.+)",
    "patternType": "regex",
    "resolver": {
      "intent": "meteo.weather.direct",
      "confidence": 1.0,
      "route": "weather"
    },
    "priority": 5,
    "entityMapping": { "city": "$2" }
  },
  {
    "id": "json-catchall",
    "pattern": "*",
    "resolver": "unmatched",
    "priority": 0
  }
]
```

### 7.2 `loadJsonCategories()` — utilidad SDK propuesta

```typescript
/**
 * Carga categories desde un archivo JSON.
 * Convierte pattern strings a RegExp, resuelve entityMapping, etc.
 *
 * NOTA: esto implica un NUEVO export del SDK (SDS-16 §addendum).
 * Propuesta: src/core/aiml-json-loader.ts
 */
import type { AimlCategory, SessionVars } from "heteronimos-semi-asistidos-sdk";

export function loadJsonCategories<TVars extends SessionVars>(
  json: JsonCategoryDef[],
): AimlCategory<TVars>[];

interface JsonCategoryDef {
  id?: string;
  pattern: string;
  patternType?: "regex" | "wildcard" | "exact";
  resolver: string | { intent: string; confidence?: number; route?: string };
  priority?: number;
  entityMapping?: Record<string, string>;  // "$1", "$2" → stars indices
  topic?: string;
  that?: string;
}
```

**Uso en MeteoBot:**
```typescript
import meteoJson from "./categories/meteo-categories.json";

categories(): AimlCategory<MeteoVars>[] {
  return [
    ...super.categories(),
    ...loadJsonCategories<MeteoVars>(meteoJson),   // JSON declarativo
    ...this.codeCategories(),                       // TypeScript categories
  ];
}
```

### 7.3 Ventaja del JSON

| Aspecto | TypeScript class | JSON declarativo |
|---------|-----------------|-----------------|
| Type-safety | Completa | Parcial (validación runtime) |
| IDE completion | Sí | No (salvo JSON schema) |
| Modificable sin rebuild | No | Sí (hot-reload posible) |
| Accesible no-devs | No | Sí |
| Lógica custom | Arrow functions | Solo patterns estáticos |

---

## 8. Approach 3: Arrow functions standalone — `handlers/`

Para developers que quieren **handlers como funciones puras**, importables y testables independientemente.

### 8.1 `handlers/weather-handler.ts`

```typescript
import type { IntentHandler } from "heteronimos-semi-asistidos-sdk";
import { buildReport, formatIacmForChat, IACM_INTENTS } from "heteronimos-semi-asistidos-sdk";
import { fetchWeather } from "../services/weather-api";

/**
 * Handler standalone: REQUEST recibido → fetch weather → REPORT.
 *
 * Importable y testable fuera del bot.
 * Se inyecta en handlers() del plugin.
 */
export const weatherRequestHandler: IntentHandler = async (intent, vars, ctx) => {
  if (intent.intent !== IACM_INTENTS.REQUEST_RECEIVED) return undefined;

  // Extraer ciudad
  const cityMatch = intent.originalInput.match(/(?:weather|meteo|tiempo)\s+(?:para|for|de|en)\s+(\S+)/i);
  const city = cityMatch?.[1] ?? intent.entities.city ?? "Madrid";

  const weather = await fetchWeather(city);

  const report = buildReport(
    vars.agent_role ?? "bot",
    intent.entities.from_agent ?? "unknown",
    {
      subject: `Weather: ${city}`,
      report_type: "findings",
      summary: `${weather.description}, ${weather.tempC}°C`,
      status: "completed",
    },
    `${city}: ${weather.description}, ${weather.tempC}°C, humidity ${weather.humidity}%.`,
  );

  return formatIacmForChat(report);
};
```

### 8.2 `handlers/time-handler.ts`

```typescript
import type { IntentHandler } from "heteronimos-semi-asistidos-sdk";
import { buildAnswer, formatIacmForChat, IACM_INTENTS } from "heteronimos-semi-asistidos-sdk";
import { fetchTime } from "../services/time-api";

export const timeQuestionHandler: IntentHandler = async (intent, vars) => {
  if (intent.intent !== IACM_INTENTS.QUESTION_RECEIVED) return undefined;

  const tzMatch = intent.originalInput.match(/(?:hora|time)\s+(?:en|in)\s+([\w/]+)/i);
  const tz = tzMatch?.[1] ?? "Europe/Madrid";

  const time = await fetchTime(tz);

  const answer = buildAnswer(
    vars.agent_role ?? "bot",
    intent.entities.from_agent ?? "unknown",
    {
      question_id: vars.last_received_message_id ?? "",
      answer: `${time.datetime} (${time.abbreviation})`,
      answer_type: "definitive",
      confidence: 1.0,
    },
    `Son las ${time.datetime} en ${time.timezone}.`,
  );

  return formatIacmForChat(answer);
};
```

### 8.3 Uso en MeteoBot: composición de handlers

```typescript
import { weatherRequestHandler } from "./handlers/weather-handler";
import { timeQuestionHandler } from "./handlers/time-handler";

// En MeteoBot:
handlers(): IntentHandler<MeteoVars>[] {
  return [
    ...super.handlers(),         // Protocol handler (ACK, etc.)
    weatherRequestHandler,        // Arrow function standalone
    timeQuestionHandler,          // Arrow function standalone
    this.fyiHandler(),            // Method privado
    this.urgentHandler(),         // Method privado
  ];
}
```

**Ventaja:** cada handler es una función pura que se puede:
- Testear aisladamente con IntentResult mocks
- Reutilizar en otros bots
- Componer dinámicamente

---

## 9. Gaps identificados en SDS-16 y SDS-17

Al diseñar esta demo, se detectan omisiones que requieren ajustes en los specs del SDK:

### 9.1 Gap: Filtrado de self-messages

**Problema:** en un grupo, un bot ve sus propios mensajes. Sin filtro, MeteoBot procesaría su propio REPORT como si fuera un mensaje entrante → bucle infinito.

**Solución propuesta (SDS-16 §3.3 addendum):**

```typescript
// En AimlBotPlugin.onMessage():
async onMessage(ctx: any): Promise<string> {
  // Skip own messages
  if (ctx.from?.is_bot && ctx.from?.id === ctx.me?.id) return "";
  // ... pipeline normal
}
```

**Alternativa:** comparar `from_agent` en el mensaje IACM contra el propio `agentName`.

### 9.2 Gap: Propiedad `agentName` en IacmBotPlugin

**Problema:** `IacmBotPlugin` tiene `name` (nombre del plugin: "meteo") y `pluginCode` ("mt"), pero no un campo para el **nombre de agente IACM** visible en `from_agent` / `to_agent`. Actualmente `defaultVars()` lo setea como `this.name`, pero el developer debería poder configurarlo explícitamente.

**Solución propuesta (SDS-17 §3.8 addendum):**

```typescript
export abstract class IacmBotPlugin<TVars> extends AimlBotPlugin<TVars> {
  /** Nombre visible en campos from_agent/to_agent. */
  abstract agentName: string;

  defaultVars(): TVars {
    return {
      agent_role: this.agentName,  // ← usa agentName, no name
      flow_state: "idle",
    } as TVars;
  }
}
```

### 9.3 Gap: Filtrado de `to_agent` en categories IACM

**Problema:** las categories IACM de SDS-17 detectan `[REQUEST] agentA → agentB` pero no verifican que `agentB === this.agentName`. Si hay 3 bots en el grupo, todos los IACM bots procesarían el mismo REQUEST.

**Solución propuesta (SDS-17 §3.6 addendum):**

```typescript
// Category con condición sobre to_agent:
{
  id: "iacm-request-in",
  pattern: /^\[REQUEST\]\s+(\S+)\s*→\s*(\S+)/i,
  resolver: (vars, stars, ctx) => ({
    intent: IACM_INTENTS.REQUEST_RECEIVED,
    entities: { from_agent: stars[0], to_agent: stars[1] },
    // ...
  }),
  // NUEVO: condition valida que to_agent === mi agentName
  conditions: [
    {
      varName: "agent_role",
      // Solo procesar si to_agent (stars[1]) coincide con mi agent_role
      // Requiere: category condition que acceda a stars[]
    },
  ],
}
```

**Alternativa más limpia:** filtrar en el handler, no en la category:

```typescript
// En iacmProtocolHandler(), antes de procesar:
if (intent.entities.to_agent && intent.entities.to_agent !== vars.agent_role) {
  return undefined; // No es para mí → skip
}
```

### 9.4 Gap: `formatIacmForChat()` — formato no definido

**Problema:** SDS-17 declara `formatIacmForChat()` pero no especifica el formato de salida. Las categories IACM necesitan patterns que matcheen contra ese formato. Si el formato cambia, las categories se rompen.

**Solución propuesta:** definir el formato canónico:

```
[TYPE] from_agent → to_agent
📋 subject/task/question/title
key: value · key: value
───
narrative text
```

Ejemplo:
```
[REQUEST] DispatchBot → MeteoBot
📋 Parte meteorológico para Madrid
Priority: medium
───
Solicito parte meteorológico actual para Madrid.
```

Las categories IACM hacen pattern match contra `^\[TYPE\]\s+(\S+)\s*→\s*(\S+)`.

### 9.5 Gap: `loadJsonCategories()` — no existe en el SDK

**Problema:** el Approach 2 (JSON declarativo) necesita un loader que convierta JSON a `AimlCategory[]`. Este loader no está en SDS-16.

**Solución propuesta (SDS-16 addendum):**

Nuevo archivo `src/core/aiml-json-loader.ts`:
- `loadJsonCategories<TVars>(json: JsonCategoryDef[]): AimlCategory<TVars>[]`
- Convierte `patternType: "regex"` → `new RegExp(pattern, 'i')`
- Convierte `resolver: string` → `IntentResolver` shorthand
- Convierte `entityMapping: { city: "$2" }` → IntentFn que mapea stars a entities
- Export en barrel

### 9.6 Gap: `bootBot` — no tiene `tokenEnvVar` param

**Problema:** `main.ts` de la demo arranca 2 bots, cada uno con su token. El actual `bootBot()` lee `BOT_TOKEN` del env. No permite especificar qué variable contiene el token de cada bot.

**Solución propuesta:**

```typescript
// bootBot options:
interface BootOptions {
  plugins: BotPlugin[];
  envDir: string;
  chatStorePath?: string;
  logger?: Logger;
  tokenEnvVar?: string;  // ← NUEVO. Default: "BOT_TOKEN"
}
```

### 9.7 Gap: Threading cross-bot

**Problema:** cuando DispatchBot envía un REQUEST con `thread_id: "weather-123"`, MeteoBot necesita responder en el mismo thread. Actualmente los builders de SDS-17 generan `thread_id` automáticamente. Necesitan aceptar un `thread_id` explícito.

**Solución:** ya resuelta — los builders aceptan `opts.thread_id`. Verificar que funciona en la implementación.

### 9.8 Gap: Async multi-step flows (demo command)

**Problema:** `/dp_demo Madrid` debería ejecutar REQUEST → esperar REPORT → ejecutar QUESTION → esperar ANSWER → mostrar resumen. Pero el pipeline es síncrono por turno: `onMessage() → string`. No hay forma de "esperar" la respuesta del otro bot.

**Solución:** el demo command NO espera. Envía el REQUEST y confia en que el handler de REPORT_RECEIVED mostrará el resultado cuando llegue. La "demo" es la experiencia de ver los mensajes aparecer en el grupo. El operador puede ejecutar los pasos manualmente si prefiere.

---

## 10. Cambios por archivo

### Nuevos en `examples/iacm-demo/`

| Archivo | Contenido |
|---------|-----------|
| `README.md` | Guía quick-start, prerequisitos, cómo correr |
| `package.json` | `{ "name": "example-iacm-demo", deps: SDK + grammy + rxjs }` |
| `tsconfig.json` | Extends root tsconfig |
| `.env.example` | `BOT_TOKEN_METEO`, `BOT_TOKEN_DISPATCH`, `METEO_AGENT_NAME`, etc. |
| `main.ts` | Entrypoint: arranca 2 bots |
| `config.ts` | Env vars |
| `meteo-bot.ts` | MeteoBot: IacmBotPlugin con categories + handlers + APIs |
| `dispatch-bot.ts` | DispatchBot: IacmBotPlugin con categories + handlers |
| `services/weather-api.ts` | Client wttr.in |
| `services/time-api.ts` | Client worldtimeapi |
| `categories/meteo-categories.json` | JSON declarativo demo |
| `categories/dispatch-categories.json` | JSON declarativo demo |
| `handlers/weather-handler.ts` | Arrow function standalone |
| `handlers/time-handler.ts` | Arrow function standalone |
| `handlers/protocol-handler.ts` | Custom protocol handler overrides |
| `flows/README.md` | Diagrama de flujos |

### Cambios en SDK (feedback de gaps §9)

| Archivo | Cambio | Spec afectada |
|---------|--------|--------------|
| `src/core/aiml-bot-plugin.ts` | Self-message filter en onMessage | SDS-16 §9.1 |
| `src/core/iacm-bot-plugin.ts` | `abstract agentName: string` property | SDS-17 §9.2 |
| `src/core/iacm-protocol-handlers.ts` | Filtro `to_agent` en protocol handler | SDS-17 §9.3 |
| `src/core/aiml-json-loader.ts` | **NUEVO** — `loadJsonCategories()` | SDS-16 §9.5 |
| `src/core/boot.ts` | `tokenEnvVar` param en bootBot | — |
| `src/index.ts` | Export `loadJsonCategories` | — |

---

## 11. Criterios de aceptación

### Setup
1. `examples/iacm-demo/` se clona y ejecuta con `bun run dev` (tras configurar .env).
2. También funciona en mock mode (sin tokens) para tests.

### Flujos IACM
3. `/dp_weather Madrid` → DispatchBot envía REQUEST → MeteoBot responde con REPORT (datos reales de wttr.in).
4. `/dp_time Europe/Madrid` → DispatchBot envía QUESTION → MeteoBot responde con ANSWER (hora real de worldtimeapi).
5. `/mt_propose "texto"` → MeteoBot envía PROPOSAL → DispatchBot lo detecta → operador puede `/dp_accept`, `/dp_reject razón`, o `/dp_defer razón`.
6. `/mt_apistatus` → MeteoBot envía FYI con estado de APIs.
7. `/mt_alert "texto"` → MeteoBot envía URGENT → DispatchBot auto-ACKNOWLEDGEs.
8. `/dp_demo Madrid` → Ejecuta REQUEST→REPORT automáticamente.
9. Los 11 tipos de mensaje IACM aparecen en los flujos.

### 3 Approaches
10. MeteoBot usa categories TypeScript (Approach 1) como método principal.
11. `categories/meteo-categories.json` muestra categories JSON (Approach 2). Se pueden cargar con `loadJsonCategories()`.
12. `handlers/weather-handler.ts` y `handlers/time-handler.ts` muestran arrow functions standalone (Approach 3). Se pueden componer en `handlers()`.
13. El README documenta los 3 approaches con ejemplos.

### Integración
14. Ambos bots filtran self-messages (no procesan sus propios envíos).
15. Los mensajes IACM incluyen `from_agent` y `to_agent` correctos.
16. El protocol handler filtra por `to_agent` (un bot no procesa mensajes dirigidos a otro).
17. Full test suite verde.

### Documentación
18. `README.md` es suficiente para que un developer nuevo arranque la demo en <5 minutos.
19. `flows/README.md` documenta cada flujo con diagrama secuencial.

---

## 12. Tests

| Suite | Tests |
|-------|-------|
| `meteo-bot.test.ts` | Categories producen intents correctos; handlers fetchean weather/time (mock APIs); FYI/URGENT formatean bien; commands registrados |
| `dispatch-bot.test.ts` | Categories de comandos producen intents; handlers construyen REQUEST/QUESTION; accept/reject/defer funcionan; demo command |
| `weather-api.test.ts` | Mock de wttr.in: parsea JSON, maneja errores |
| `time-api.test.ts` | Mock de worldtimeapi: parsea JSON, maneja errores |
| `json-loader.test.ts` | loadJsonCategories: regex, wildcard, entityMapping, resolver expansion |
| `integration.test.ts` | Flujo completo REQUEST→ACK→REPORT con 2 bots en mock mode; QUESTION→ANSWER; PROPOSAL→ACCEPT/REJECT |

---

## 13. Notas de diseño

### ¿Por qué 2 bots y no 1?

El valor de IACM es la **comunicación inter-agente**. Con 1 solo bot, no hay protocolo — es un monólogo. 2 bots demuestran:
- Routing (`from_agent` → `to_agent`)
- Threading (los 2 participan en el mismo thread)
- Flujos multi-step (REQUEST→ACK→REPORT cruza 2 bots)
- Filtrado de self-messages (cada bot ignora sus propios envíos)

### ¿Por qué APIs públicas reales?

1. **Credibilidad** — el developer ve datos reales, no mocks hardcoded.
2. **Async real** — los handlers hacen `await fetch()`, demostrando que el pipeline es async.
3. **Error handling** — si la API falla, el bot envía un URGENT o un error graceful.
4. **Zero config** — wttr.in y worldtimeapi no requieren API key. Clonar y correr.

### 3 approaches: cuándo usar cada uno

| Approach | Cuándo | Ejemplo |
|----------|--------|---------|
| TypeScript class | Lógica compleja, type-safety, IDE completion | MeteoBot, DispatchBot |
| JSON declarativo | Diseño de flujos sin código, hot-reload, no-code | Bots configurables por operadores |
| Arrow functions | Handlers reutilizables, testing aislado, composición | weatherRequestHandler, timeQuestionHandler |

Los 3 se combinan en el mismo bot. No son excluyentes.

### Formato `formatIacmForChat()`

El formato visible en el grupo de Telegram:

```
[REQUEST] DispatchBot → MeteoBot
📋 Parte meteorológico para Madrid
Priority: medium
───
Solicito parte meteorológico actual para Madrid.
```

Es legible para humanos y parseable por los patterns IACM del SDK (regex `^\[TYPE\]`). Los datos estructurados completos viajan como `IacmMessage<T>` por `RuntimeEmitter` para dashboards.

### Mock mode

Cuando no hay `BOT_TOKEN_*`, el SDK cae a `MockTelegramBot`. La demo funciona en mock mode para tests — los 2 bots comparten el mismo MockTelegramBot y los mensajes se propagan entre ellos via el mock.
