---
description: Propaga un cambio de diseño nivel a nivel (SAD→SSRS→SSD→SWDD) escribiendo átomos, con confirmación y gate de decisión
argument-hint: <cambio a propagar, o nivel/átomo de origen>
---

Vas a ejecutar el flujo de **diseño y propagación** sobre:

**$ARGUMENTS**

Sigue `.claude/agents/design-agent.md` y la convención atómica:

1. **Carga contexto** por `_index` (nivel afectado + superiores); abre solo los átomos por `id`; cruza con código en `docs/inputs/extracted/code/` si existe.
2. **Gate de decisión:** en cada nivel con ≥2 caminos técnicos relevantes, **no improvises opciones** — lanza `/decision` para que el panel evalúe y se registre el ADR. Propaga **solo** la opción elegida.
3. **Escribe átomos** (no ficheros gordos): SSRS `ssrs/{ss}/{REQ-ID}.md` · SSD `ssd/{ss}/{components|data|interfaces}/{ID}.md` · SWDD `swdd/{mod}/{domain|services|handlers}/{ID}.md`. Frontmatter mínimo; enlaza `parent`/`children`.
4. **Propaga hacia abajo** nivel a nivel; tras cada nivel **para** y espera confirmación del usuario.
5. **No propagues hacia arriba** sin confirmación explícita; si un cambio bajo lo exige, avísalo.
6. Tras crear/modificar átomos: `python scripts/gen_index.py <path>` y `python scripts/gen_rtm.py`.

Documenta divergencias con el código (VIGENTE / DIVERGENTE / SOLO-DOC / OBSOLETO / NUEVO-EN-CODE).
