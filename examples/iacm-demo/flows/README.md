# IACM Demo — Flujos de comunicación inter-agente

Diagrama de cada flujo. Los mensajes se intercambian en un grupo de Telegram
donde ambos bots están presentes. Cada bot filtra por `to_agent` para procesar
solo los mensajes dirigidos a sí mismo.

---

## Flujo A — REQUEST → ACKNOWLEDGE → REPORT

**Trigger:** `/dp_weather Madrid`  
**Tipos IACM:** REQUEST, ACKNOWLEDGE, REPORT

```
Operador          DispatchBot           [Grupo Telegram]          MeteoBot
   │                   │                       │                      │
   │── /dp_weather ───→│                       │                      │
   │   Madrid          │                       │                      │
   │                   │── [REQUEST] ─────────→│                      │
   │                   │   dp → mt             │← MeteoBot lo ve      │
   │                   │   "Parte meteo Madrid" │                      │
   │                   │                       │── [ACKNOWLEDGE] ────→│ (envia al grupo)
   │                   │                       │   mt → dp            │
   │                   │                       │   "Processing..."    │
   │                   │← ACK visto ───────────│                      │
   │                   │                       │                      │
   │                   │                       │── fetch wttr.in ─────│─── API
   │                   │                       │                      │←── datos
   │                   │                       │                      │
   │                   │                       │── [REPORT] ─────────→│ (envia al grupo)
   │                   │                       │   mt → dp            │
   │                   │                       │   "Madrid: 18°C..."  │
   │                   │← REPORT visto ────────│                      │
   │                   │  flow_state = idle    │                      │
   │         "✅ REPORT recibido"               │                      │
```

---

## Flujo B — QUESTION → ANSWER

**Trigger:** `/dp_time Europe/Madrid`  
**Tipos IACM:** QUESTION, ANSWER

```
Operador          DispatchBot           [Grupo Telegram]          MeteoBot
   │                   │                       │                      │
   │── /dp_time ──────→│                       │                      │
   │   Europe/Madrid   │                       │                      │
   │                   │── [QUESTION] ────────→│                      │
   │                   │   "¿Qué hora es       │← MeteoBot lo detecta │
   │                   │    en Europe/Madrid?" │                      │
   │                   │                       │── fetch worldtimeapi─│─── API
   │                   │                       │                      │←── datos
   │                   │                       │── [ANSWER] ─────────→│ (envia al grupo)
   │                   │                       │   "Son las 14:23..."  │
   │                   │← ANSWER visto ────────│                      │
   │         "✅ ANSWER recibida"               │                      │
```

---

## Flujo C — PROPOSAL → ACCEPT

**Trigger MeteoBot:** `/mt_propose "Actualizar datos cada 30 min"`  
**Respuesta operador:** `/dp_accept`  
**Tipos IACM:** PROPOSAL, ACKNOWLEDGE, ACCEPT

```
Operador          DispatchBot           [Grupo Telegram]          MeteoBot
   │                   │                       │                      │
   │                   │                       │                      │← /mt_propose
   │                   │                       │── [PROPOSAL] ───────→│ (envia)
   │                   │                       │   "Actualizar 30 min"│
   │                   │← PROPOSAL visto ──────│                      │
   │         "🤝 PROPOSAL recibida.             │                      │
   │          Usa /dp_accept|reject|defer"     │                      │
   │                   │                       │                      │
   │── /dp_accept ────→│                       │                      │
   │                   │── [ACCEPT] ──────────→│                      │
   │                   │   dp → mt             │← MeteoBot lo detecta │
   │                   │   "Propuesta aceptada"│                      │
   │                   │                       │  "✅ ACCEPTED"        │
```

---

## Flujo D — PROPOSAL → REJECT

**Trigger MeteoBot:** `/mt_propose "Usar formato XML"`  
**Respuesta operador:** `/dp_reject "XML es demasiado verboso"`  
**Tipos IACM:** PROPOSAL, REJECT

```
Operador          DispatchBot           [Grupo Telegram]          MeteoBot
   │                   │                       │                      │
   │                   │                       │── [PROPOSAL] ───────→│
   │                   │← PROPOSAL visto ──────│                      │
   │── /dp_reject ────→│                       │                      │
   │   "XML verboso"   │── [REJECT] ──────────→│                      │
   │                   │   dp → mt             │← MeteoBot registra   │
   │                   │   "XML verboso"       │                      │
```

---

## Flujo E — QUESTION → DEFER

**Trigger MeteoBot:** `/mt_question "¿Qué ciudades monitorizar?"`  
**Respuesta operador:** `/dp_defer "Consulto con el equipo"`  
**Tipos IACM:** QUESTION, DEFER

```
Operador          DispatchBot           [Grupo Telegram]          MeteoBot
   │                   │                       │                      │
   │                   │                       │── [QUESTION] ───────→│ (MeteoBot envia)
   │                   │                       │   mt → dp            │
   │                   │                       │   "¿Ciudades?"       │
   │                   │← QUESTION visto ──────│                      │
   │── /dp_defer ─────→│                       │                      │
   │   "consulto"      │── [DEFER] ───────────→│                      │
   │                   │   dp → mt             │                      │
   │                   │   "Aplazado"          │                      │
```

---

## Flujo F — FYI (informativo unilateral)

**Trigger:** `/mt_apistatus`  
**Tipos IACM:** FYI

```
Operador          DispatchBot           [Grupo Telegram]          MeteoBot
   │                   │                       │                      │
   │                   │                       │                      │← /mt_apistatus
   │                   │                       │                      │── fetch wttr.in
   │                   │                       │── [FYI] ────────────→│ (envia)
   │                   │                       │   "wttr.in OK"       │
   │                   │← FYI visto ───────────│                      │
   │                   │  (actualiza vars,     │                      │
   │                   │   sin respuesta)      │                      │
```

---

## Flujo G — URGENT → ACKNOWLEDGE

**Trigger:** `/mt_alert "Borrasca atlántica detectada"`  
**Tipos IACM:** URGENT, ACKNOWLEDGE

```
Operador          DispatchBot           [Grupo Telegram]          MeteoBot
   │                   │                       │                      │
   │                   │                       │                      │← /mt_alert
   │                   │                       │── [URGENT] ─────────→│
   │                   │                       │   "Borrasca          │
   │                   │                       │    atlántica"        │
   │                   │← URGENT visto ────────│                      │
   │                   │── [ACKNOWLEDGE] ─────→│                      │
   │                   │   dp → mt             │                      │
   │         "🚨 URGENTE de MeteoBot"          │                      │
```

---

## Flujo H — Demo automatizada

**Trigger:** `/dp_demo Madrid`  
**Tipos IACM:** REQUEST (+ ACKNOWLEDGE + REPORT cuando MeteoBot responde)

```
Operador          DispatchBot           [Grupo Telegram]          MeteoBot
   │                   │                       │                      │
   │── /dp_demo ──────→│                       │                      │
   │   Madrid          │                       │                      │
   │                   │── [REQUEST] ─────────→│                      │
   │                   │   "Demo: solicito      │← MeteoBot lo detecta │
   │                   │    parte meteo Madrid"│                      │
   │                   │                       │── [ACKNOWLEDGE]+[REPORT]
   │                   │                       │    (Flujo A              completo)
```

---

## Cobertura de los 11 tipos IACM

| Tipo          | Flujo     | Emisor       |
|---------------|-----------|--------------|
| REQUEST       | A, H      | DispatchBot  |
| ACKNOWLEDGE   | A, G      | MeteoBot (A), DispatchBot (G) |
| REPORT        | A, H      | MeteoBot     |
| QUESTION      | B, E      | DispatchBot (B), MeteoBot (E) |
| ANSWER        | B         | MeteoBot     |
| PROPOSAL      | C, D      | MeteoBot     |
| ACCEPT        | C         | DispatchBot  |
| REJECT        | D         | DispatchBot  |
| DEFER         | E         | DispatchBot  |
| FYI           | F         | MeteoBot     |
| URGENT        | G         | MeteoBot     |

---

## Formato del mensaje en Telegram

Todos los mensajes IACM se formatean con `formatIacmForChat()`:

```
[REQUEST] DispatchBot → MeteoBot
📋 Parte meteorológico para Madrid
id: iacm-dp-1712345678-abc123
───────────────
Solicito parte meteorológico actual para Madrid.
```

Las categorías IACM del SDK detectan el patrón `^\[TYPE\]\s+(\S+)\s*→\s*(\S+)` para extraer `from_agent` y `to_agent` automáticamente.
