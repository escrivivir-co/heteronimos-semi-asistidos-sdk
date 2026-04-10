# IACM Demo — MeteoBot + DispatchBot

> Demostración del protocolo IACM (Inter-Agent Communication Model) usando dos
> bots de Telegram reales que se comunican entre sí.

## Arquitectura

```
Operador ──→ DispatchBot ──→ MeteoBot ──→ wttr.in / worldtimeapi.org
               (coordinator)   (provider)   (APIs públicas)
```

| Bot          | Rol          | Descripción                                               |
|--------------|--------------|-----------------------------------------------------------|
| MeteoBot     | Proveedor    | Sirve datos meteorológicos y hora; también puede enviar propuestas, FYIs y alertas |
| DispatchBot  | Coordinador  | Envía REQUEST/QUESTION, gestiona PROPOSAL workflow, reenvía URGENT |

---

## Quick Start

### 1 · Instalar dependencias

```bash
cd examples/iacm-demo
bun install
```

### 2 · Configurar tokens

```bash
cp .env.example .env
# Edita .env con los tokens de @BotFather
```

### 3 · Arrancar

```bash
bun start            # modo real (requiere tokens)
bun run mock         # modo mock (sin Telegram, interactivo en terminal)
bun start --mock     # fuerza mock aunque haya tokens
```

---

## Comandos disponibles

### MeteoBot (`/mt_*`)

| Comando                       | Tipo IACM    | Descripción                          |
|-------------------------------|--------------|--------------------------------------|
| `/mt_weather <city>`          | Sin IACM     | Parte meteorológico directo          |
| `/mt_apistatus`               | FYI          | Estado de la API wttr.in             |
| `/mt_alert <msg>`             | URGENT       | Alerta urgente de meteorología       |
| `/mt_propose <ciudad> <min>`  | PROPOSAL     | Propone actualizaciones automáticas  |
| `/mt_question <city>`         | QUESTION     | Pregunta si conviene viajar          |
| `/mt_menu`                    | —            | Menú interactivo                     |

### DispatchBot (`/dp_*`)

| Comando                       | Tipo IACM    | Descripción                             |
|-------------------------------|--------------|------------------------------------------|
| `/dp_weather <city>`          | REQUEST      | Solicita parte meteorológico a MeteoBot  |
| `/dp_time <timezone>`         | QUESTION     | Pregunta la hora a MeteoBot              |
| `/dp_accept`                  | ACCEPT       | Acepta propuesta pendiente               |
| `/dp_reject <razón>`          | REJECT       | Rechaza propuesta pendiente              |
| `/dp_defer <razón>`           | DEFER        | Aplaza decisión pendiente                |
| `/dp_demo <city>`             | REQUEST      | Demo completa del flujo REQUEST→REPORT   |
| `/dp_menu`                    | —            | Menú interactivo                         |

---

## Flujos IACM cubiertos

El protocolo IACM v1.0 define 11 tipos de mensaje. Este demo los cubre todos:

```
Flujo A  REQUEST → REPORT          /dp_weather Madrid
Flujo B  QUESTION → ANSWER         /dp_time Europe/Madrid
Flujo C  FYI → (informativo)       /mt_apistatus
Flujo D  URGENT → ACKNOWLEDGE      /mt_alert "Borrasca atlántica"
Flujo E  PROPOSAL → ACCEPT         /mt_propose Madrid 60  →  /dp_accept
Flujo F  PROPOSAL → REJECT         /mt_propose Madrid 60  →  /dp_reject "No necesario"
Flujo G  PROPOSAL → DEFER          /mt_propose Madrid 60  →  /dp_defer "Revisaré mañana"
```

---

## Tres enfoques de implementación

Este ejemplo ilustra los tres patrones de uso del SDK de forma complementaria:

### Approach 1 · TypeScript class (`meteo-bot.ts`, `dispatch-bot.ts`)

La forma más completa: extiende `IacmBotPlugin<TVars>` y sobreescribe
`categories()` y `handlers()`. Ideal para bots complejos con estado propio.

```typescript
export class MeteoBot extends IacmBotPlugin<MeteoVars> {
  agentName: string;
  override categories() { return [...super.categories(), ...domainCats]; }
  override handlers()   { return [...super.handlers(), ...domainHandlers]; }
}
```

### Approach 2 · JSON declarativo (consulta `specs/18-iacm-demo-app.md` §7)

Permite definir categorías como objetos JSON puros, sin código TypeScript.
Útil para configuración externa o bots generados dinámicamente.

### Approach 3 · Arrow functions standalone (`handlers/`)

Funciones `IntentHandler` puras que se pueden componer en cualquier bot:

```typescript
import { weatherRequestHandler } from "./handlers/weather-handler.js";

class MyBot extends IacmBotPlugin<MyVars> {
  override handlers() {
    return [...super.handlers(), weatherRequestHandler("MyBot")];
  }
}
```

---

## APIs externas utilizadas

| API               | URL                                         | Sin clave |
|-------------------|---------------------------------------------|-----------|
| wttr.in           | `https://wttr.in/{city}?format=j1`          | ✅         |
| World Time API    | `https://worldtimeapi.org/api/timezone/{tz}`| ✅         |

Ambas son gratuitas y no requieren registro.

---

## Estructura de ficheros

```
examples/iacm-demo/
├── .env.example          # plantilla de configuración
├── config.ts             # constantes de entorno
├── main.ts               # entrypoint: arranca ambos bots
├── meteo-bot.ts          # MeteoBot (Approach 1: class)
├── dispatch-bot.ts       # DispatchBot (Approach 1: class)
├── package.json
├── tsconfig.json
├── handlers/
│   ├── weather-handler.ts  # weatherRequestHandler (Approach 3)
│   └── time-handler.ts     # timeQuestionHandler (Approach 3)
└── services/
    ├── weather-api.ts      # cliente wttr.in
    └── time-api.ts         # cliente worldtimeapi.org
```
