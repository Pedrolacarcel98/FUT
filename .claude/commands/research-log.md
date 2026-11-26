---
description: Registra una pieza de evidencia en una investigación viva (resultado de un spike, una medición o una fuente nueva), actualiza el estado y la confianza de las preguntas que toca y la reinterpreta con la lente del panel pertinente. Es el corazón vivo del flujo. Pre-canónico, solo-lectura sobre la base.
argument-hint: <tema/slug> "<evidencia | resultado de spike | fuente>"
---

Vas a **registrar evidencia** en la investigación viva:

**$ARGUMENTS** (primer token = tema/slug; el resto = la evidencia: resultado de un spike, una medición, un hallazgo, o el puntero a una fuente nueva).

Es el paso que **mantiene viva** la investigación: cada evidencia mueve el estado. Acumulativo y fechado. Pre-canónico y **solo-lectura sobre la base**.

1. **Precondición:** debe existir `docs/research/{tema}/investigacion.md`.

2. **Si la evidencia es una fuente nueva** (documento/PDF/informe externo), atomízala primero con **`/intake`** (o el `pdf-extraction-agent`) — no metas fuentes crudas. Si es el resultado de un spike o una medición que ya tienes, pásalo directamente.

3. **Si la evidencia necesita interpretación experta** (una medición cuyo significado depende de una lente: "¿estos MB de RSS son aceptables en el entorno de ejecución real?", "¿este comportamiento de concurrencia confirma o refuta el supuesto?"), **convoca la(s) lente(s) `expert-*` pertinente(s)** vía la herramienta Agent (en paralelo si son varias), pasándoles la evidencia + la(s) pregunta(s) que toca, y pídeles su interpretación (qué implica, si cierra o no la pregunta, con qué confianza). Si la evidencia es autoexplicativa (un supuesto verificado sí/no contra el código), salta este paso.

4. **Delega en `research-agent`** (herramienta Agent). Encárgale, siguiendo su procedimiento de estado vivo:
   - Crear `docs/research/{tema}/evidencia/EV-{NNN}-{slug}.md` (fuente, método, resultado, interpretación del panel si la hay, efecto en las preguntas).
   - **Actualizar el mapa de preguntas**: nuevo estado (ABIERTA→PARCIAL→RESUELTA) y confianza de las Q-* que toca; si la evidencia **contradice** una interpretación previa, anotarlo **sin borrar** la anterior.
   - **Abrir preguntas nuevas** si la evidencia lo exige.
   - Reactualizar el **veredicto provisional** y el *standing* de las alternativas, actualizar `fecha_actualizacion`, **añadir una línea a la bitácora** y regenerar `_index.md`.

5. **Presenta el delta al usuario:** qué evidencia entró, qué preguntas movió (y a qué estado/confianza), qué se abrió, y cómo queda el veredicto provisional. Si con esto ya no quedan preguntas P1 abiertas, sugiérele `/research-review` para el chequeo del panel y, si procede, `/research-close`.
