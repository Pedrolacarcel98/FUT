---
description: Inyecta una tarea técnica de alto nivel identificada por el usuario en el desglose de una propuesta entrante; la analiza (mapea a capacidad, subsistema y hallazgos; marca lo nuevo), convoca la lente del panel si abre terreno nuevo, y la estima.
argument-hint: <slug de la tarea> "<tarea de alto nivel>"
---

Vas a **inyectar y analizar una tarea de alto nivel** en el desglose de la propuesta entrante:

**$ARGUMENTS** (primer token = slug de la tarea; el resto = descripción de alto nivel de la tarea a añadir).

Es el paso 3 del banco de trabajo (ver `CLAUDE.md` → *Desglose técnico y estimación*). Pre-canónico y **solo-lectura sobre la base**.

1. **Precondición**: deben existir `docs/assessments/{tarea}/analisis.md` y la carpeta `tasks/` (si no, `/assess-tasks {tarea}` primero).

2. **Delega en `task-planner-agent` (modo tarea inyectada)** (herramienta Agent):
   - Expande la frase del usuario a un `TT-{NNN}-{slug}.md` con `fuente: manual`, mapeándola a su **capacidad** y **subsistema** y ligándola a los **hallazgos existentes** de `analisis.md`.
   - Si abre **terreno no cubierto** por el análisis, lo marca como `NUEVO —` en la sección *Hallazgos* (no lo inventa resuelto) y **te indica qué lente del panel** cubriría ese terreno.

3. **Si el agente señala terreno nuevo que cae en una lente del panel**, convoca esa(s) lente(s) `expert-*` **en modo auditoría** (en paralelo, una sola tanda; igual que `/assess`), pásale la tarea + los átomos relevantes, y entrega sus veredictos de vuelta al `task-planner-agent` para que enriquezca los hallazgos del TT. Si no hay terreno nuevo, salta este paso.

4. **Estima la nueva tarea**: delega en `assessment-agent` en **modo estimación de tareas técnicas** solo para este `TT-id` (bandas en jornadas-persona + confianza, drivers = sus hallazgos). Actualiza `tasks/_index.md` y **reagrega** `estimacion.md`.

5. **Presenta**: la tarea creada (alcance, reutiliza/nuevo, hallazgos incl. los NUEVOS), su banda, y el nuevo total agregado.
