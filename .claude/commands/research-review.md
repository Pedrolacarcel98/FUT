---
description: El panel revisa el estado global de una investigación (qué queda abierto, qué evidencia falta, veredicto provisional) y cuantifica el coste de la incertidumbre restante. Completeness critic. Pre-canónico, solo-lectura sobre la base.
argument-hint: <tema/slug>
---

Vas a **revisar el estado** de la investigación:

**$ARGUMENTS**

Es el chequeo de completitud: mira la foto entera, no una evidencia suelta. Pre-canónico y **solo-lectura sobre la base**.

1. **Precondición:** debe existir `docs/research/{tema}/investigacion.md` con evidencia registrada.

2. **Convoca al panel (modo revisión de completitud)** — lanza **en paralelo** las lentes `expert-*` relevantes vía la herramienta Agent, pasándoles el estado actual (`investigacion.md` + evidencia). A cada una pídele, desde su lente: **¿qué preguntas siguen realmente abiertas?**, **¿qué evidencia falta para cerrarlas?**, **¿hay confianza suficiente para decidir o seguimos sobre extrapolaciones?**, y **¿la evidencia recogida se ha interpretado bien?** (que cace su propio sesgo). Es un *critic*: busca lo que falta, no confirma lo que hay.

3. **Delega en `assessment-agent`** (modo incertidumbre) para **cuantificar el coste de la incertidumbre**: qué preguntas P1 siguen abiertas, cuánto estrecharía la decisión resolver cada una, y qué spikes lo cerrarían. Actualiza la sección *Coste de la incertidumbre* de `investigacion.md`.

4. **`research-agent` sintetiza** la revisión en el workbench: actualiza estados/confianzas si el panel corrige alguno, ajusta el veredicto provisional, y marca el `estado:` de la investigación (`en-curso` o `lista-para-decidir` si ya no hay P1 abiertas). Añade línea a la bitácora. Regenera `_index.md`.

5. **PARA y presenta al usuario (gate humano):** el estado consolidado — preguntas abiertas que quedan, evidencia que falta, coste de la incertidumbre, y si la investigación está **lista para decidir** o no. El usuario decide: seguir investigando (más spikes / `/research-log`) o cerrar con `/research-close`.
