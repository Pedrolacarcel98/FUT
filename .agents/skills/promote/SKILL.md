---
name: promote
description: "Tras aprobar el alcance, promueve la propuesta a la base canónica (apoyándose en $reconcile) y genera el typst funcional formal"
---
<!-- GENERADO por .ai/scripts/sync.py (target Codex) desde las fuentes del submódulo. No editar: los cambios van al submódulo. -->

> **Argumento:** lo que el usuario escribió al invocar la skill (`$promote <id o nombre de la tarea>`).
> Si no lo dio, pídeselo antes de empezar.

Vas a ejecutar el flujo de **promoción a canónico** de la tarea (requiere alcance aprobado):

**{argumento del usuario}**

**Precondición:** la propuesta `docs/proposals/{tarea}/propuesta.md` está en estado `aprobada`. Si no lo está, **para** y avísalo.

1. **Reconciliación primero (código = verdad):** ejecuta el flujo `$reconcile` sobre los módulos afectados para que el canónico refleje lo **realmente construido** durante el desarrollo. La propuesta aprobada es la **intención** que guía qué divergencias aceptar.
2. **Propaga a la base canónica:** con `capture-agent`/`design-agent`, materializa/actualiza los átomos SRS → SAD → SSRS → SSD → SWDD a partir de (a) lo reconciliado del código y (b) el alcance aprobado de la propuesta. Escribe átomos, enlaza `parent`/`children`, y regenera con `python scripts/gen_index.py <path>` y `python scripts/gen_rtm.py`.
3. **Genera el documento formal:** ejecuta `$doc` para producir la **especificación funcional formal** (typst) en `docs/generated/{documento}/` a partir de los átomos ya canónicos.
4. **Cierra la propuesta:** marca su `estado: promovida` y enlaza el ADR, los átomos resultantes y el documento generado.

Confirmación humana en cada salto de propagación. El **código prevalece**; la propuesta aporta el **alcance acordado**.
