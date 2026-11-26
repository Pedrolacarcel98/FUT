---
name: assess-task-revise
description: "Aplica una modificación a una tarea técnica existente del desglose de una propuesta entrante y la reestima, registrando el delta antes→después en su changelog y reagregando estimacion.md."
---
<!-- GENERADO por .ai/scripts/sync.py (target Codex) desde las fuentes del submódulo. No editar: los cambios van al submódulo. -->

> **Argumento:** lo que el usuario escribió al invocar la skill (`$assess-task-revise <slug de la tarea> <TT-id> "<modificación>"`).
> Si no lo dio, pídeselo antes de empezar.

Vas a **revisar y reestimar una tarea técnica** del desglose de la propuesta entrante:

**{argumento del usuario}** (slug de la tarea · id `TT-…` · descripción de la modificación).

Es el paso 4 del banco de trabajo (ver `AGENTS.md` → *Desglose técnico y estimación*). Pre-canónico y **solo-lectura sobre la base**.

1. **Precondición**: debe existir `docs/assessments/{tarea}/tasks/{TT-id}-*.md`.

2. **Delega en `task-planner-agent` (modo revisión)** (lánzalo como subagente):
   - Aplica la modificación al alcance/cuerpo del `TT`, añade una línea fechada al **changelog**, pone `estado: REVISADA` y marca la estimación como **stale**.
   - Si la modificación toca `origin_propuesta`/`hallazgos` (nuevo terreno) o altera `depends_on`, lo señala; si el terreno nuevo cae en una lente del panel, lo recomienda (convócala como en `$assess-task-add` paso 3 antes de reestimar).
   - Si cambia el alcance de tareas dependientes, márcalas también como stale.

3. **Reestima**: delega en `assessment-agent` en **modo estimación de tareas técnicas** para el `TT` revisado (y las dependientes marcadas stale). Registra el **delta antes→después** de la banda en el changelog del `TT`. Reagrega `estimacion.md` y regenera `tasks/_index.md`.

4. **Presenta**: qué cambió, la banda antes→después de la tarea, y el impacto en el total agregado.
