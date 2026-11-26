---
description: Desglosa una propuesta entrante ya auditada en tareas técnicas de nivel SWDD agrupadas por capacidad, en docs/assessments/{tarea}/tasks/. Pre-canónico, solo-lectura sobre la base. No estima (eso es /assess-estimate).
argument-hint: <slug de la tarea en docs/assessments/>
---

Vas a **desglosar en tareas técnicas de nivel SWDD** la propuesta entrante:

**$ARGUMENTS**

Es el paso 1 del banco de trabajo de desglose+estimación (ver *Flujo de evaluación de propuesta entrante → Desglose técnico y estimación* en `CLAUDE.md`). Pre-canónico y **solo-lectura sobre la base** (no tocas SRS/SAD/SSRS/SSD/SWDD ni `docs/proposals/`).

1. **Precondición**: debe existir `docs/assessments/{tarea}/analisis.md`. Si no existe, dilo y sugiere ejecutar `/assess {tarea}` primero — **no** desgloses sin auditoría.

2. **Delega en `task-planner-agent`** (herramienta Agent). Encárgale:
   - Leer la propuesta atomizada (`extracted/*`) y el `analisis.md` (hallazgos con sus ids).
   - Navegar la base canónica por `_index.md` + SAD para decidir, por tarea, qué **reutiliza** y qué es **nuevo**.
   - Emitir las tareas por **capacidad** (~12-20; granularidad de capacidad, no de átomo) como `docs/assessments/{tarea}/tasks/TT-{NNN}-{slug}.md`, cada una con `origin_propuesta`, `hallazgos` ligados y las secciones fijas del formato TT. Dejar el bloque de estimación vacío (lo rellena `/assess-estimate`).
   - Regenerar `docs/assessments/{tarea}/tasks/_index.md`.

3. **PARA y presenta al usuario (gate humano)**: la lista de tareas por capacidad (id · título · reutiliza/nuevo · hallazgos que la afectan), y qué parte del alcance de la propuesta **no** generó tarea (con motivo). El usuario puede pedir fusionar/partir capacidades, añadir una tarea (`/assess-task-add`) o corregir el mapa **antes** de estimar.

4. **No estimes aquí.** La estimación es `/assess-estimate {tarea}`, tras este gate.
