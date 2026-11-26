---
name: assess-estimate
description: "Estima en jornadas-persona (bandas + confianza) las tareas técnicas de una propuesta entrante desglosada, y regenera estimacion.md agregando por capacidad y total. La incertidumbre de los hallazgos ensancha la banda."
---
<!-- GENERADO por .ai/scripts/sync.py (target Codex) desde las fuentes del submódulo. No editar: los cambios van al submódulo. -->

> **Argumento:** lo que el usuario escribió al invocar la skill (`$assess-estimate <slug de la tarea> [TT-id ...]`).
> Si no lo dio, pídeselo antes de empezar.

Vas a **estimar las tareas técnicas** de la propuesta entrante:

**{argumento del usuario}** (si tras el slug hay ids `TT-…`, estima solo esas; si no, todas las de `tasks/`).

Es el paso 2 del banco de trabajo (ver `AGENTS.md` → *Desglose técnico y estimación*). Pre-canónico y **solo-lectura sobre la base**.

1. **Precondición**: deben existir tareas en `docs/assessments/{tarea}/tasks/TT-*.md` (si no, ejecuta `$assess-tasks {tarea}` primero) y el `analisis.md`.

2. **Delega en `assessment-agent` en MODO ESTIMACIÓN DE TAREAS TÉCNICAS** (lánzalo como subagente). Encárgale, por cada tarea a estimar:
   - Fijar el **esfuerzo base** (si todo estuviera definido) a partir del eje *reutiliza vs nuevo* del propio TT y de sus `depends_on`.
   - **Ensanchar la banda** con los `hallazgos` ligados a la tarea: cada hallazgo de severidad alta/media abre la banda; a más incertidumbre, banda más ancha y **confianza** más baja.
   - Rellenar el frontmatter `estimacion: { optimista, probable, pesimista, unidad: jornadas-persona, confianza }` y la sección *Estimación y drivers de la banda* del TT (qué hallazgo abre cuánto). Poner `estado: ESTIMADA`.
   - Regenerar `docs/assessments/{tarea}/estimacion.md` **agregando desde las tareas**: total en bandas (optimista/probable/pesimista, nunca un número único), vista por **capacidad** y por **subsistema**, **coste de la incertidumbre** (qué preguntas [P1] del `analisis.md` estrechan qué tareas y cuánto) y **ruta de reducción** (las 3-5 preguntas que más estrechan el total).

3. **Presenta**: el total en bandas, las 3-5 tareas que más incertidumbre aportan, y el coste de la incertidumbre. Recuerda que es un **documento vivo**: si el cliente aclara dudas (`$assess-qa`) o se revisa una tarea (`$assess-task-revise`), se reestima y las bandas se estrechan.
