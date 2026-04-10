# SDS-19 · Cyborg Federation Protocol Layer

> **heteronimos-semi-asistidos-sdk** · Software Design Specification
> Estado: DRAFT · target: post-SDS-18
> Dependencia: SDS-17 (IACM Protocol Integration), SDS-18 (IACM Demo App)

---

## 1. Objetivo

Incorporar al repo una **capa constitucional y federativa** para trabajo futuro entre bots, peers y operadores, sin forzar todavía una implementación de runtime.

Esta spec define cómo encajan tres materiales remotos nuevos:

1. la **Universal Cyborg Constitution (UCC)** como marco normativo,
2. el **Retro-Native Federation Protocol (RNFP)** como bootstrap y sharing protocol,
3. la ontología `cyborg_v1.py` como **referencia conceptual**, no como dependencia ejecutable.

El resultado de esta iteración es documental y arquitectónico: hogar canónico, vocabulario estable y límites de alcance claros.

---

## 2. Contexto

### 2.1 Lo que ya existe

El repo ya integra IACM como álgebra de mensajes estructurados entre agentes.

IACM cubre bien:

- actos conversacionales entre agentes,
- tipos TS, parser, templates y handlers,
- demos de interacción bot↔bot en Telegram.

### 2.2 Lo que faltaba

El material nuevo introduce un plano distinto:

- identidad criptográfica del Cyborg,
- confianza entre peers,
- política de federación por peer,
- eventos compartidos con provenance,
- soberanía, revocación y límites constitucionales.

En otras palabras: IACM resuelve **cómo se hablan los agentes**; UCC/RNFP empieza a resolver **bajo qué condiciones pueden federarse sistemas soberanos**.

### 2.3 Tensión detectada

El material remoto presupone un runtime `clc`, HyperGraph, transporte Telegram DM y una ontología Python ya integrada. Nada de eso existe hoy en esta codebase.

Por tanto, una integración directa al runtime sería prematura.

---

## 3. Decisión de esta iteración

En esta rama se adopta el enfoque **docs-first**:

1. promover UCC a documento canónico del repo,
2. fijar RNFP como spec SDS,
3. documentar su encaje con IACM mediante ADR,
4. dejar explícitamente fuera de alcance el runtime `clc`, la ejecución de Python y HyperGraph.

---

## 4. Diseño

### 4.1 Capas conceptuales

| Capa | Rol | Estado en el repo |
|------|-----|-------------------|
| **UCC** | Marco constitucional: soberanía, delegación, revocación, límites | Documentada en esta iteración |
| **RNFP** | Bootstrap de federación, trust, exchange de subgrafos | Especificada en esta iteración |
| **IACM** | Mensajería estructurada entre agentes | Ya implementada |

### 4.2 Reparto de responsabilidades

#### UCC

UCC define el marco normativo:

- qué es un Cyborg,
- quién decide,
- cómo se delega,
- qué exige una federación legítima,
- cómo debe entenderse la revocación.

#### RNFP

RNFP define el protocolo de federación entre peers:

- invitación,
- aceptación o rechazo,
- anuncio de subgrafo,
- solicitud de paquete,
- paquete de subgrafo,
- revocación.

#### IACM

IACM sigue siendo el protocolo conversacional de nivel aplicación para bots y agentes.

**Decisión clave:** RNFP no sustituye a IACM. Opera en otro nivel. RNFP habilita una relación federativa; IACM puede circular dentro de sistemas o workflows que ya comparten contexto y confianza.

### 4.3 Fases de bootstrap federativo

El bootstrap de federación se modela en cinco fases:

1. divulgación mutua del marco y limitaciones,
2. autorización humana explícita,
3. negociación de policy por peer,
4. intercambio de material de identidad,
5. activación y registro del evento.

### 4.4 Tipos de mensaje RNFP

RNFP define ocho tipos de mensaje textuales:

| Tipo | Propósito |
|------|-----------|
| `CLC-FED-INVITE-v1` | Propuesta de federación |
| `CLC-FED-ACCEPT-v1` | Aceptación |
| `CLC-FED-REJECT-v1` | Rechazo |
| `CLC-FED-REVOKE-v1` | Señal de revocación |
| `CLC-GRAPH-ANNOUNCE-v1` | Anuncio de subgrafo disponible |
| `CLC-GRAPH-REQUEST-v1` | Solicitud de subgrafo |
| `CLC-GRAPH-PKG-v1` | Paquete de subgrafo |
| `CLC-UNKNOWN-MSG-v1` | Manejo de versión o mensaje desconocido |

### 4.5 Modelo conceptual mínimo

La ontología remota introduce ocho tipos L2. En esta iteración se adoptan como **modelo conceptual de referencia**:

| Tipo | Función |
|------|---------|
| `CyborgIdentity` | identidad local del sistema híbrido |
| `IntraAction` | acto constitutivo o interacción formativa |
| `TrustRelation` | confianza persistente y revocable |
| `FederationPeer` | representación local del peer externo |
| `FederationPolicy` | consentimiento y reglas por peer |
| `SharedEvent` | provenance del acto de compartir |
| `Delegation` | autoridad acotada |
| `Escalation` | comunicación agente→principal |

Estos tipos todavía no se implementan como código del SDK. Quedan listados para una futura fase de contratos TypeScript.

### 4.6 Semántica de revocación

Se adopta la semántica constitucional del material remoto:

- revocar es retirar autorización futura,
- no implica borrado remoto automático,
- el receptor conserva soberanía sobre su memoria y su historial de auditoría.

Esta decisión evita modelar la federación como control centralizado disfrazado.

---

## 5. Fuera de alcance

Quedan fuera de esta iteración:

- un CLI `clc`,
- transporte real Telegram DM para RNFP,
- persistencia HyperGraph,
- port o ejecución de `CUARENTENA/cyborg_v1.py`,
- tests de runtime de federación,
- integración Node + Python.

---

## 6. Artefactos resultantes

Esta spec introduce o fija los siguientes destinos canónicos:

```
docs/
├── UNIVERSAL_CYBORG_CONSTITUTION.md
└── architecture/
    └── adrs/
        └── ADR-490-ucc-rnfp-iacm-alignment.md

specs/
└── 19-cyborg-federation-protocol.md
```

El material de `CUARENTENA/` permanece como origen temporal y referencia de cuarentena.

---

## 7. Riesgos y trade-offs

### 7.1 Telegram como transporte provisional

RNFP presupone Telegram DM como transporte pragmático. Esto tensiona la idea de soberanía plena.

En esta iteración el repo **documenta** esa tensión, pero no la resuelve técnicamente.

### 7.2 Revocación asimétrica

La revocación como señal respeta soberanía local, pero complica expectativas de borrado y compliance.

Esto debe seguir siendo visible en futuras APIs para no prometer algo que el modelo constitucional niega.

### 7.3 Gates y autoridad

El material remoto menciona validaciones de Philosopher/Metamodel. En este repo se registran como antecedentes de diseño, no como nueva autoridad operativa del SDK.

### 7.4 Riesgo de duplicidad conceptual

`templates/cyborg_principle_foundations.md` y la UCC trabajan el mismo espacio conceptual. La relación correcta es:

- `cyborg_principle_foundations.md` como antecedente filosófico,
- UCC como constitución operativa para trabajo federativo.

---

## 8. Futuras extensiones

Una iteración posterior puede añadir:

1. contratos TS para `CyborgIdentity`, `FederationPeer`, `FederationPolicy` y `SharedEvent`,
2. parser/validator de mensajes RNFP,
3. pruebas de handshake y revocación en mock transport,
4. una demo de federación encima del trabajo de SDS-18.

---

## 9. Criterios de aceptación

- [ ] La UCC tiene hogar canónico en `docs/`.
- [ ] RNFP tiene una SDS propia y enlazada desde `SDS-00`.
- [ ] Existe un ADR que fija la relación entre UCC, RNFP e IACM.
- [ ] `cyborg_v1.py` queda documentado como referencia, no como runtime.
- [ ] La iteración deja explícitos los límites de alcance y las tensiones abiertas.
