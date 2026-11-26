---
description: Desglosa las preguntas abiertas de una investigación en spikes/experimentos concretos (RT-*): qué construir o medir para cerrar cada pregunta. Pre-canónico, solo-lectura sobre la base.
argument-hint: <tema/slug>
---

Vas a **desglosar en spikes/experimentos** la investigación:

**$ARGUMENTS**

Es el paso que convierte las preguntas abiertas en trabajo ejecutable. Pre-canónico y **solo-lectura sobre la base**.

1. **Precondición:** debe existir `docs/research/{tema}/investigacion.md` con su mapa de preguntas (si no, `/research {tema}` primero).

2. **Delega en `task-planner-agent`** (herramienta Agent), en **modo spikes de investigación**. Encárgale:
   - Leer `investigacion.md` (preguntas abiertas Q-*) y las fuentes atomizadas (`extracted/*`), navegando la base por `_index.md` para saber qué se reutiliza y qué es incógnita real.
   - Emitir un `docs/research/{tema}/spikes/RT-{NNN}-{slug}.md` por **experimento concreto**: objetivo (qué Q-* responde), método (qué se construye/mide y cómo — p. ej. montar un entorno de simulación, medir RAM/CPU, verificar un supuesto contra el código, correr un micro-benchmark), entregable esperado y **criterio de qué se consideraría concluyente**.
   - Un spike puede responder a varias preguntas; una pregunta puede requerir varios spikes. Prioriza los que cierran preguntas **P1** (las que más estrechan la decisión).
   - No estima esfuerzo aquí (si hace falta cuantificar, es `assessment-agent` en `/research-review`).

3. **`research-agent` integra** los spikes en el workbench: los enlaza a sus preguntas en el mapa (`RT-ids` en la columna spike) y regenera `_index.md`.

4. **PARA y presenta la lista de spikes al usuario (gate humano):** qué se va a construir/medir, a qué pregunta responde cada uno y qué se consideraría concluyente. El usuario puede reordenar, fusionar, descartar o añadir spikes. La ejecución de cada spike la hace el equipo (o tú, si es verificable con las herramientas disponibles); sus resultados entran con `/research-log {tema} "<resultado>"`.
