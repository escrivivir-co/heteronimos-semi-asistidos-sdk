# CLC Federation Guide — Operador

**Versión:** 1.0
**Fecha:** 2026-04-09
**Protocolo:** Retro-Native Federation Protocol (RNFP)
**Referencia:** [ADR-489 — CLC Fase 3 Federation Protocol](../architecture/adrs/ADR-489-clc-fase3-federation-protocol.md)
**Estado:** Fase 3c — UX/Polish (activo)

---

## Introducción

La federación CLC permite que dos operadores compartan memoria de sus ecosistemas Retro
de forma directa, sin autoridad central, con consentimiento explícito en cada paso.

**Principio fundamental:** Ningún servidor Retro media la federación. Cada operador es
soberano sobre su propia HyperGraph. Telegram actúa únicamente como transporte de mensajes
(provisional — ver [Trade-offs](#trade-offs-y-limitaciones-conocidas)).

### ¿Qué permite la federación?

- **Federar identidades**: Establecer una relación de confianza criptográfica con otro operador CLC
- **Compartir subgrafos**: Enviar y recibir porciones de memoria (nodos HyperGraph) con consentimiento explícito
- **Revocar relaciones**: Señalar el fin de una relación de federación

### ¿Qué NO hace la federación?

- No comparte tu memoria automáticamente — cada intercambio requiere confirmación explícita
- No existe un directorio central de peers — el descubrimiento es fuera de banda (como en la vida real)
- No elimina datos ya compartidos en el peer remoto — la revocación es una señal, no un comando

---

## Requisitos previos

Antes de federar, verifica que tu CLC está correctamente configurado:

```bash
# 1. Verificar que CLC está inicializado
clc identity

# Salida esperada:
# Operator: tu_operador_id
# Fingerprint: abc123def456...
# Status: active

# Si falla con "No identity found":
clc init
clc keygen
```

**Checklist:**
- [ ] `clc init` ejecutado (configura entorno local)
- [ ] `clc keygen` ejecutado (genera par de claves Ed25519)
- [ ] `clc auth` configurado (credenciales Telegram)
- [ ] `clc identity` muestra fingerprint activo

---

## El Protocolo de Federación (RNFP)

El **Retro-Native Federation Protocol** define 8 tipos de mensaje que viajan como texto
sobre Telegram DM, firmados con Ed25519:

| Tipo de mensaje | Dirección | Propósito |
|----------------|-----------|-----------|
| `[CLC-FED-INVITE-v1]` | A → B | Propuesta de federación |
| `[CLC-FED-ACCEPT-v1]` | B → A | Aceptación de federación |
| `[CLC-FED-REJECT-v1]` | B → A | Rechazo de federación |
| `[CLC-FED-REVOKE-v1]` | A → B | Señal de revocación |
| `[CLC-GRAPH-ANNOUNCE-v1]` | A → B | Anuncio de subgrafo disponible |
| `[CLC-GRAPH-REQUEST-v1]` | B → A | Solicitud de subgrafo |
| `[CLC-GRAPH-PKG-v1]` | A → B | Paquete de subgrafo (respuesta) |
| `[CLC-UNKNOWN-MSG-v1]` | cualquiera | Mensaje no reconocido (protocolo) |

**Principio:** Federar es mutuo consentimiento. Ningún mensaje tiene efecto unilateral;
cada paso del protocolo requiere acción explícita del operador receptor.

---

## Guía paso a paso: Federar con otro CLC

### Paso 1: Preparación (ambos operadores)

Antes de comenzar, ambos operadores deben compartir sus fingerprints **fuera de banda**
(por ejemplo, en una llamada de Telegram, un mensaje directo verificado, o en persona).
Esto previene ataques de intermediario.

```bash
# Cada operador verifica y comparte su fingerprint
clc identity

# Salida:
# Operator: didac
# Fingerprint: a1b2c3d4e5f6...   ← compartir este valor con el peer
# Telegram: @tu_username
# Status: active
```

> **Por qué esto importa:** La identidad en CLC es tu clave criptográfica, no tu
> handle de Telegram. Verificar el fingerprint fuera de banda garantiza que estás
> federando con quien crees.

---

### Paso 2: CLC-A invita a CLC-B

El operador A inicia la invitación:

```bash
# Invitar por username de Telegram
clc federate invite @username_b

# Qué sucede internamente:
# - CLC-A construye [CLC-FED-INVITE-v1] con su fingerprint Ed25519
# - El mensaje es firmado con la clave privada de A
# - Se envía como DM de Telegram a @username_b
```

**Salida esperada:**
```
Federation invite sent to @username_b
Invite fingerprint: a1b2c3d4e5f6...
Waiting for response...
```

El mensaje que recibe CLC-B tiene esta estructura (formato interno del protocolo):
```
[CLC-FED-INVITE-v1]
from_operator: didac
fingerprint: a1b2c3d4e5f6...
capabilities: graph_share,signed_messages
proposal: Federate our ecosystems with explicit consent for any sharing
timestamp: 2026-04-09T10:00:00Z
signature: <ed25519_sig>
```

---

### Paso 3: CLC-B acepta la invitación

El operador B recibe la invitación y decide:

```bash
# Ver invitaciones pendientes
clc federate list --pending

# Aceptar la invitación por operator_id o fingerprint
clc federate accept didac

# Alternativamente, rechazar:
clc federate reject didac
```

**Al aceptar:**
- CLC-B envía `[CLC-FED-ACCEPT-v1]` a CLC-A con su propio fingerprint
- Ambos CLCs crean un nodo `FederationPeer` en su HyperGraph local
- La relación queda en estado `active`

**Salida esperada en CLC-B:**
```
Federation accepted with didac
Peer registered in HyperGraph (status: active)
Fingerprint verified: a1b2c3d4e5f6...
```

**Salida esperada en CLC-A (al recibir el ACCEPT):**
```
@username_b accepted federation
Peer registered: username_b (fingerprint: f6e5d4c3b2a1...)
```

---

### Paso 4: Verificar federación

Una vez completado el handshake, ambos operadores pueden listar sus peers:

```bash
# Listar todos los peers federados
clc federate list

# Salida:
# Active federation peers:
# ├── didac        fingerprint: a1b2c3d4... status: active  since: 2026-04-09
# └── username_b   fingerprint: f6e5d4c3... status: active  since: 2026-04-09
```

```bash
# Ver detalles de un peer específico
clc federate info didac

# Salida:
# FederationPeer: didac
# Fingerprint: a1b2c3d4e5f6...
# Telegram: @didac_retro
# Status: active
# Capabilities: graph_share, signed_messages
# First federated: 2026-04-09T10:05:00Z
# Last activity: 2026-04-09T10:05:00Z
```

---

### Paso 5: Compartir subgrafos

La federación de identidades no comparte datos automáticamente. Para compartir memoria:

#### 5a. CLC-A anuncia un subgrafo

Solo los nodos marcados con `disclosure_policy: "federable"` pueden compartirse.
Los nodos privados (el valor por defecto) nunca se exportan.

```bash
# Anunciar disponibilidad de subgrafo para un peer
clc federate announce --to didac

# O anunciar a todos los peers activos
clc federate announce --to all

# Salida:
# Announced subgraph package: pkg_uuid_123
# Nodes available: 42 (federable)
# Sent announce to: didac
```

#### 5b. CLC-B solicita el subgrafo

CLC-B recibe el anuncio y decide si solicitarlo:

```bash
# Ver anuncios pendientes
clc federate list --announces

# Salida:
# Pending announces:
# ├── From: didac  package_id: pkg_uuid_123  nodes: 42  type: cyborg_session
#     Description: "Session logs April 2026"

# Solicitar el subgrafo
clc federate request didac --package pkg_uuid_123

# Qué sucede:
# - CLC-B envía [CLC-GRAPH-REQUEST-v1] a CLC-A
# - CLC-A recibe la solicitud y envía [CLC-GRAPH-PKG-v1]
# - El paquete viaja firmado con Ed25519 + checksum SHA-256
```

#### 5c. CLC-B importa el subgrafo

```bash
# Ver paquetes recibidos pendientes de importar
clc federate list --packages

# Confirmar importación (requiere acción explícita del operador)
clc import --from didac --package pkg_uuid_123

# Salida:
# Package pkg_uuid_123 from didac
# Signature: ✓ valid (Ed25519)
# Checksum: ✓ SHA-256 verified
# Nodes to import: 42 (disclosure_policy: federated)
#
# Confirm import? [y/N]: y
#
# ✓ 42 nodes imported to HyperGraph
# SharedEvent created for audit trail
```

> **Importante:** Los nodos importados se marcan con `disclosure_policy: "federated"`.
> Esto significa que pertenecen a tu HyperGraph como conocimiento situado — no son
> referencias remotas. Y no serán re-exportados a otros peers.

---

## Gestión de trust

### Ver peers activos

```bash
clc trust list

# Salida:
# Trust store:
# ├── didac      fingerprint: a1b2c3d4...  federation: active   trust: direct
# └── username_b fingerprint: f6e5d4c3...  federation: active   trust: direct
```

### Revocar una relación de federación

```bash
# Revocar peer (envía señal [CLC-FED-REVOKE-v1] al peer)
clc trust revoke didac

# Salida:
# Revocation signal sent to didac (reason: OPERATOR_REVOKED)
# Local status updated: FederationPeer(didac).status → revoked
# Note: Data already imported from didac remains in your HyperGraph
#       (revocation is a signal, not a data deletion command)
```

**Importante — Semántica de la revocación (constraint R1):**

La revocación es una **señal**, no un comando. Esto respeta la soberanía de cada operador:

- **CLC-A revoca a CLC-B:** CLC-A deja de enviar datos a CLC-B. El estado local de A queda `revoked`.
- **CLC-B recibe la señal:** CLC-B decide qué hacer con los datos ya importados de A (puede archivarlos, eliminarlos, o mantenerlos — es su decisión soberana).
- **Datos ya compartidos:** El conocimiento ya situado en CLC-B pertenece a CLC-B. A no puede ordenar su eliminación remota.

Esta asimetría es intencional: la soberanía del receptor sobre su propia memoria no puede ser violada por el emisor.

---

## Verificación de integridad

Todos los mensajes del protocolo RNFP llevan verificación criptográfica:

- **Firma Ed25519:** Cada mensaje está firmado con la clave privada del emisor
- **Checksum SHA-256:** Los paquetes de subgrafo incluyen checksum del payload
- **Verificación automática:** CLC verifica firma + checksum antes de importar

```bash
# Verificar manualmente un paquete
clc verify --package pkg_uuid_123 --from didac

# Salida:
# Signature: ✓ valid  (key: a1b2c3d4...)
# Checksum:  ✓ valid  (sha256: e3b0c44298...)
# Format:    ✓ retro_subgraph_v1
```

Si la firma no coincide con la clave registrada en tu trust store para ese peer,
CLC rechaza el paquete automáticamente y lo registra como evento de seguridad.

---

## Flujo completo (diagrama)

```
Operador A                CLC-A           Telegram          CLC-B            Operador B
    │                       │                 │                │                   │
    │── clc federate ──────►│                 │                │                   │
    │   invite @B           │─[FED-INVITE]───►│──────────────►│                   │
    │                       │                 │                │── "Invite from A?"─►│
    │                       │                 │                │◄─ clc federate ───│
    │                       │                 │                │   accept A        │
    │                       │◄────────────────│◄[FED-ACCEPT]──│                   │
    │◄─ "B accepted" ───────│                 │                │                   │
    │  [FederationPeer(B) created]            │   [FederationPeer(A) created]      │
    │                       │                 │                │                   │
    │  [Más tarde: compartir subgrafo]        │                │                   │
    │── clc federate ──────►│                 │                │                   │
    │   announce --to B     │─[GRAPH-ANNOUNCE]►│─────────────►│                   │
    │                       │                 │                │── "A shares, req?"─►│
    │                       │                 │                │◄─ clc federate ───│
    │                       │                 │                │   request A       │
    │                       │◄────────────────│◄[GRAPH-REQUEST]│                   │
    │                       │─[GRAPH-PKG]────►│──────────────►│                   │
    │                       │                 │                │── "Import? [y/N]"──►│
    │                       │                 │                │◄─ clc import ─────│
    │                       │                 │    [42 nodes imported, disclosure_policy: federated]
```

---

## Trade-offs y limitaciones conocidas

### Telegram como transporte (deuda constitucional R2)

El uso de Telegram DM como transporte introduce dependencia en infraestructura centralizada
de Telegram Inc. Esta tensión existe con el **Principio de Federation Without Centralization**.

**Posición oficial (ADR-489):** Telegram es un "puente provisional" aceptado pragmáticamente.
La lógica de federación está diseñada con una interfaz `FederationTransport` abstracta que
permitirá migrar a transporte P2P directo (TCP/LAN, Tor, etc.) en Fase 4 sin cambiar la
capa CLC. Esta deuda se considera resuelta cuando exista al menos un transporte P2P alternativo.

### Tamaño de subgrafos

Los mensajes de texto Telegram tienen límite de ~4096 caracteres. Para subgrafos grandes:
- CLC usa envío como archivo adjunto (Telegram document) cuando el payload supera ~3KB
- Para subgrafos muy grandes, se recomienda fragmentar en múltiples paquetes

### Descubrimiento de peers

No existe directorio central de peers. El descubrimiento es social (fuera de banda),
como siempre ha sido para relaciones de confianza genuinas. Esto es intencional.

---

## Troubleshooting — Errores comunes

### Error: "No identity found"

**Síntoma:**
```
$ clc federate invite @username_b
Error: No identity found. Run 'clc init' first.
```

**Causa:** `clc init` no fue ejecutado, o `clc keygen` fue omitido.

**Solución:**
```bash
clc init        # Inicializa el entorno local
clc keygen      # Genera par de claves Ed25519
clc identity    # Verifica que la identidad está activa
```

---

### Error: FedRevoke no elimina datos del peer

**Comportamiento observado:**
Después de `clc trust revoke <peer>`, los nodos importados de ese peer siguen
apareciendo en tu HyperGraph.

**Causa:** Este es el comportamiento correcto, no un error.

La revocación es una señal (constraint R1 — "Revocation is a signal, not a command").
Los nodos ya importados (`disclosure_policy: "federated"`) pertenecen a tu HyperGraph
como conocimiento situado. No se eliminan automáticamente.

**Si deseas eliminar los datos importados:**
```bash
# Ver nodos de un peer específico
clc query --peer didac --policy federated

# Eliminar nodos importados de un peer (acción manual, requiere confirmación)
clc remove --peer didac --policy federated
# Confirm remove 42 nodes from didac? [y/N]: y
```

---

### Error: GraphPackage rechazado por firma inválida

**Síntoma:**
```
$ clc import --from didac --package pkg_uuid_123
Error: Signature verification failed
  Expected key: a1b2c3d4... (trust store)
  Received key: x9y8z7w6...
  Package REJECTED — not imported
```

**Causa:** El peer envió un paquete firmado con una clave diferente a la registrada
en tu trust store. Posibles causas:
- El peer regeneró sus claves (`clc keygen` después de federar)
- Ataque de intermediario (poco probable en Telegram DM)
- Corrupción del paquete en tránsito

**Solución:**
```bash
# Verificar fingerprints con el peer (fuera de banda)
clc trust list

# Si el peer legítimamente cambió sus claves, re-federar:
clc trust revoke didac
clc federate invite @didac_retro  # Nueva invitación con claves actualizadas
```

---

### Mensaje: `[CLC-UNKNOWN-MSG-v1]` recibido

**Síntoma:**
```
Warning: Received unknown message type from didac
  unknown_type: [CLC-FED-CAPABILITY-v2]
  Message logged. Federation session continues.
```

**Causa:** El peer usa una versión más reciente del protocolo RNFP con tipos de mensaje
que tu CLC no reconoce. O bien, el mensaje está corrupto.

**Comportamiento:** CLC no aborta la sesión. Registra el mensaje desconocido y continúa.
La relación de federación permanece activa.

**Solución:**
```bash
# Verificar versión de CLC
clc version

# Si hay diferencia de versiones, actualizar:
# (seguir guía de actualización de CLC)

# Si el problema persiste, verificar con el peer su versión:
clc federate info didac  # Ver capabilities declaradas
```

---

## Comandos de referencia rápida

| Comando | Descripción |
|---------|-------------|
| `clc identity` | Mostrar identidad local y fingerprint |
| `clc federate invite @username` | Invitar a un peer a federar |
| `clc federate accept <peer_id>` | Aceptar una invitación de federación |
| `clc federate reject <peer_id>` | Rechazar una invitación |
| `clc federate list` | Listar peers federados activos |
| `clc federate list --pending` | Ver invitaciones pendientes |
| `clc federate list --announces` | Ver anuncios de subgrafos recibidos |
| `clc federate announce --to <peer_id>` | Anunciar subgrafo disponible |
| `clc federate request <peer_id> --package <id>` | Solicitar subgrafo de un peer |
| `clc import --from <peer_id> --package <id>` | Importar subgrafo (con confirmación) |
| `clc trust list` | Ver trust store completo |
| `clc trust revoke <peer_id>` | Revocar relación de federación |
| `clc verify --package <id> --from <peer_id>` | Verificar firma de un paquete |
| `clc query --peer <peer_id> --policy federated` | Ver nodos importados de un peer |

---

## Referencias

- **ADR-489** — Protocolo de federación: `docs/architecture/adrs/ADR-489-clc-fase3-federation-protocol.md`
- **ADR-488** — Arquitectura CLC base: `docs/architecture/adrs/ADR-488-cyborg-local-client.md`
- **Tests E2E** — Flujo completo validado: `Agents/TelegramAgent/tests/integration/test_e2e_federation.py`
- **Política ToS** — Uso de Telegram: `docs/architecture/policies/TELEGRAM_TOS_USAGE_POLICY.md`
- **Módulos de implementación:**
  - `Agents/TelegramAgent/src/clc/federation.py` — Tipos de mensaje y handlers
  - `Agents/TelegramAgent/src/clc/federation_engine.py` — Motor de federación
  - `Agents/TelegramAgent/src/clc/subgraph.py` — Export/import de subgrafos

---

**Autor:** Documenter (CLC Fase 3c)
**Revisado por:** Basado en ADR-489 (gates filosófico + ontológico completados 2026-04-08)
**Próxima revisión:** Al completar Fase 4 (transporte P2P alternativo)
