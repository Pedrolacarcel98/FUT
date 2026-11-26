---
description: Crea o actualiza la propuesta cliente-facing de una tarea entrante (alternativas vía /decision, detalle hasta SSD). Documento vivo, pre-canónico.
argument-hint: <id o nombre de la tarea (en docs/inputs/incoming/)>
---

Vas a ejecutar el flujo de **propuesta a cliente** para la tarea:

**$ARGUMENTS**

1. **Localiza la tarea** en `docs/inputs/incoming/` (descripción del cliente). Si no está, pídela o indica al usuario que la deje ahí.
   - Si existe `docs/inputs/incoming/{tarea}/brief.md`, **úsalo como fuente principal** (baja al original solo para el detalle).
   - Si **no** hay brief y la fuente es **extensa o un PDF**, ejecuta `/intake {tarea}` primero — no metas un documento largo crudo al panel.
2. **ACLARA antes de asumir (gate humano — no lo saltes).** Lee las *Preguntas abiertas* del brief y cualquier punto que la propuesta tendría que dar por supuesto. **Pregúntaselas al usuario** (usa preguntas estructuradas; donde haya opciones, explícalas con su trade-off). **PARA y espera sus respuestas.** No rellenes con defaults lo que el usuario no haya confirmado.
3. **Evalúa y presenta alternativas (gate humano).** Si hay ≥2 caminos técnicos viables y no hay ADR para la tarea, ejecuta `/decision` (panel → ADR). **Presenta y explica** las alternativas + la recomendación del panel (con sus disensos). **PARA y espera que el usuario ELIJA/apruebe** la alternativa y el alcance. **No auto-elijas.** Si ya hay ADR, reúsalo pero confirma con el usuario que sigue vigente.
4. **Solo con las respuestas y la aprobación**, redacta la propuesta: delega en el `proposal-agent` (herramienta Agent), que escribe `docs/proposals/{tarea}/propuesta.md` con la **estructura obligatoria** (resumen ejecutivo, alcance, alternativas pros/contras, solución **hasta nivel SSD —nunca SWDD—**, estimación, riesgos, control de cambios). El agente **consume las respuestas del usuario y la alternativa elegida**; solo marca TBD lo que el usuario haya diferido explícitamente.
5. **No toques la base canónica** (SRS/SAD/...). La propuesta es **pre-canónica y viva**.
6. Presenta la propuesta al usuario. Para **corregirla iterativamente**, usa `/propose-revise {tarea}`.

Cuando el cliente apruebe el alcance (tras el desarrollo), el cierre es `/promote {tarea}`.
