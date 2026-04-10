## Plan: Integracion UCC sobre IACM

Recomiendo una integracion por capas en `sds_ucc`, mantenida como rama apilada sobre `feat/sds_iacm`, limitada en esta primera iteracion a promocion y armonizacion de specs/docs. La idea es absorber el valor normativo de CUARENTENA sin introducir deuda de runtime: primero se normaliza el material como constitucion + spec de federacion + decision record de encaje con IACM; despues, si interesa, se abre una segunda fase para contratos TypeScript y pruebas de parser. `cyborg_v1.py` queda explicitamente como referencia normativa y no se ejecuta ni se integra como runtime en esta fase.

**Steps**
1. Fase 0 — Encaje y limites. Confirmar en la rama `sds_ucc` que el objetivo de esta iteracion es documental y arquitectonico: promocionar el contenido util de CUARENTENA, definir su relacion con IACM y dejar fuera CLI CLC, HyperGraph runtime y cualquier ejecucion Python. Esto bloquea cualquier paso posterior para evitar scope creep.
2. Fase 1 — Clasificacion del material. Separar los tres artefactos de CUARENTENA por naturaleza: `UNIVERSAL_CYBORG_CONSTITUTION.md` como documento normativo; `federation_guide.md` como spec operativa/protocolo; `cyborg_v1.py` como artefacto de referencia ontologica. Esta fase puede correr en paralelo con el inventario de huecos del repo.
3. Fase 1 — Inventario de huecos del repo. Contrastar las nuevas specs con la base ya existente en IACM para documentar compatibilidades y tensiones: IACM ya resuelve mensajeria estructurada entre agentes, pero RNFP introduce identidad criptografica, soberania de federacion, politica por peer y revocacion como señal. El resultado esperado es una tabla “existente / falta / fuera de alcance”. Puede hacerse en paralelo con el paso 2.
4. Fase 2 — Promocion documental. Mover o reescribir el contenido de CUARENTENA en destinos propios del repo, no como copia ciega sino armonizado con la taxonomia existente. Recomendacion: una nueva spec para federacion en `specs/`, un documento fundacional en `docs/` o `templates/`, y un ADR nuevo que explique por que UCC se apoya en `feat/sds_iacm` pero no extiende aun el runtime del SDK.
5. Fase 2 — ADR de integracion. Añadir un ADR que fije el encaje arquitectonico entre IACM y UCC/RNFP: IACM queda como algebra de mensajes y flujos conversacionales; UCC define principios constitucionales; RNFP define bootstrap federativo y semantica de trust/policy/shared-event. Ese ADR debe registrar tambien las exclusiones: no CLI `clc`, no transporte real DM, no HyperGraph, no port de `cyborg_v1.py` en esta rama.
6. Fase 2 — Resolver contradicciones semanticas antes de mezclar docs. Documentar de forma explicita las tensiones detectadas: Telegram como transporte provisional frente a soberania/no subordinacion; revocacion como señal frente a expectativas de borrado; autoridad humana final frente a gates filosoficos/metamodel. Esto depende del paso 5 porque debe quedar fijado en el ADR o en notas de spec.
7. Fase 3 — Opcional de bajo riesgo. Si se quiere dejar preparada la segunda iteracion sin implementarla, añadir un apendice de “future TS contracts” describiendo los futuros tipos `CyborgIdentity`, `FederationPeer`, `FederationPolicy`, `SharedEvent` y su posible encaje en el area `src/core/iacm/` o en un modulo nuevo. Esto no debe incluir codigo ejecutable en esta fase.
8. Fase 3 — Estrategia git apilada. Mantener `sds_ucc` como stacked branch sobre `feat/sds_iacm` con commits separados por capa: `docs/spec ingest`, `adr alignment`, `cross-links/readme/spec index`. Asi, mientras `feat/sds_iacm` no llegue a `main`, la rama nueva queda revisionable sin mezclar cambios funcionales. Si mas adelante se necesita desacoplarla, el ADR y la separacion por commits reducen el coste de rebase.
9. Fase 4 — Criterio de salida. Cerrar esta iteracion cuando el repo tenga: un destino estable para la constitucion, una spec de federacion ubicada y enlazada, un ADR de encaje con IACM, referencias cruzadas desde README/spec index si procede, y una nota explicita de que `cyborg_v1.py` sigue en cuarentena como referencia.

**Opciones de integracion**
1. Opcion recomendada — `docs-first, stacked`. Promover constitucion + spec + ADR y dejar Python/CLI fuera. Minimiza riesgo, preserva el valor de las specs remotas y encaja bien con que `sds_ucc` cuelgue de `feat/sds_iacm`.
2. Opcion intermedia — `docs + contracts`. Igual que la recomendada, pero ademas deja definidos contratos TypeScript y tests de parsing/validacion para mensajes de federacion. Solo merece la pena si la siguiente rama va a implementarlos pronto.
3. Opcion agresiva — `runtime path`. Planificar ya CLI `clc`, transporte Telegram DM, trust handshake y persistencia federada. No la recomiendo en esta rama porque el repo no tiene ese runtime hoy y forzaria decisiones tecnicas no resueltas por las specs actuales.

**Relevant files**
- `./specs/17-iacm-protocol.md` — base actual del protocolo y mejor punto de acoplamiento conceptual con UCC/RNFP.
- `./specs/18-iacm-demo-app.md` — referencia para decidir si la federacion queda solo en spec o si algun dia requiere demo.
- `./templates/cyborg_principle_foundations.md` — antecedente filosófico ya presente; hay que evitar duplicidad o contradiccion con la nueva constitucion.
- `./templates/ADR-451-constitutional-framework.md` — plantilla/referencia para el ADR de integracion constitucional.
- `./CUARENTENA/UNIVERSAL_CYBORG_CONSTITUTION.md` — fuente normativa a promover y armonizar.
- `./CUARENTENA/federation_guide.md` — fuente de la spec RNFP a convertir en spec del repo.
- `./CUARENTENA/cyborg_v1.py` — referencia ontologica a mantener en cuarentena en esta fase, sin ejecucion.
- `./README.md` — punto de entrada para enlazar nueva documentacion solo cuando la estructura final este clara.

**Verification**
1. Verificar que cada artefacto promovido tiene un unico hogar canónico en el repo y que CUARENTENA queda referenciada solo como origen temporal o deja de ser necesaria.
2. Verificar coherencia terminologica entre IACM, UCC y RNFP: `federation`, `peer`, `policy`, `revocation`, `human sovereignty`, `delegation`.
3. Verificar que el ADR deja explicitamente fuera de alcance CLI/runtime/HyperGraph/Python execution en esta iteracion.
4. Verificar que la estrategia de commits en `sds_ucc` permite revisar la rama sin contaminar `feat/sds_iacm` con implementacion prematura.
5. Verificar que no se ejecuta ningun codigo de `CUARENTENA/` durante la iteracion y que `cyborg_v1.py` se usa solo como referencia documental.

**Decisions**
- Incluido: promocion y armonizacion de specs/docs en `sds_ucc`.
- Excluido: implementacion de CLI `clc`, transporte Telegram DM, HyperGraph runtime, ejecucion o integracion Python real.
- Decision git: mantener `sds_ucc` como stacked branch sobre `feat/sds_iacm` en esta fase.
- Decision tecnica: `cyborg_v1.py` es referencia normativa; si en el futuro se porta, sera en una fase posterior y previsiblemente a TypeScript.

**Further Considerations**
1. Recomendacion: crear un ADR nuevo para el encaje UCC/RNFP en lugar de incrustar demasiada justificacion dentro de `specs/17`, porque separa mejor protocolo conversacional e identidad/federacion.
2. Recomendacion: si aparece la necesidad de tipos pronto, abrir una siguiente rama hija de `sds_ucc` para `contracts-only` en lugar de mezclarlo ahora.
3. Riesgo a vigilar: duplicidad conceptual entre `templates/cyborg_principle_foundations.md` y la nueva constitucion; conviene decidir si uno referencia al otro o si uno queda sustituido por el nuevo documento.