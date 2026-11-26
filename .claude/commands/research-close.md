---
description: Cierra una investigación cuando hay confianza suficiente: sintetiza los hallazgos, comprueba que las preguntas P1 están resueltas y hace de puente a /decision (alternativas + evidencia → ADR). Si falta evidencia, no cierra. Pre-canónico, solo-lectura sobre la base.
argument-hint: <tema/slug>
---

Vas a **cerrar la investigación** y puentearla a la decisión:

**$ARGUMENTS**

Es la salida del flujo de investigación hacia el gate de decisión. Pre-canónico y **solo-lectura sobre la base**.

1. **Precondición:** debe existir `docs/research/{tema}/investigacion.md`. Idealmente tras un `/research-review` reciente.

2. **Comprobación de confianza (gate duro).** Delega en `research-agent` la verificación de que las preguntas **P1 están RESUELTAS con confianza suficiente**. Si quedan P1 abiertas:
   - **No cierres.** Di qué preguntas faltan y qué spike/evidencia las cerraría, y devuelve al usuario a `/research-spikes` / `/research-log`. **Sin evidencia suficiente no se decide.**
   - Excepción: si el usuario decide **cerrar con incertidumbre asumida** (la incertidumbre es irreducible o no vale la pena resolverla), regístralo explícito como tal — el ADR heredará esa incertidumbre en la banda de la opción elegida.

3. **Síntesis final.** `research-agent` consolida en `investigacion.md`: hallazgos por pregunta (con la evidencia que los respalda), el *standing* final de cada alternativa (favorable / descartada + porqué, apoyado en evidencia medida, no en opinión), y marca `estado: lista-para-decidir`. Añade la entrada de cierre a la bitácora.

4. **Puente a `/decision`.** Ejecuta **`/decision <tema>`** pasándole las **alternativas en juego + la evidencia consolidada** de la investigación como entrada (el panel del `decision-agent` ya no parte de cero: parte de lo investigado). El `decision-agent` compara, el usuario elige y se **registra el ADR** en `docs/decisions/`. 

5. **Continuación.** Con el ADR registrado, el camino sigue según el caso: `/propose <tema>` (propuesta a cliente hasta SSD) o `/design` (propagar a la base). **Sin ADR no hay propagación.** La investigación queda como `estado: cerrada`, viva solo como registro de por qué se decidió lo que se decidió.
