---
description: Reconcilia código→documentación de un módulo — detecta divergencias y propaga hacia arriba lo aceptado
argument-hint: <módulo a reconciliar>
---

Vas a ejecutar el flujo de **reconciliación código → documentación** del módulo:

**$ARGUMENTS**

Sigue el `CLAUDE.md` (*Reconciliación código → documentación*), con el `design-agent`.

1. **Compara** el código real (`docs/inputs/extracted/code/code-{modulo}.md` y/o el repo) contra los átomos SWDD del módulo (navega por `_index`).
2. **Identifica divergencias** (qué cambió, qué se añadió, qué se eliminó) y presenta un **informe** al usuario.
3. **Por cada divergencia, el usuario decide:** *aceptar* (el código es correcto → propagar HACIA ARRIBA en docs), *rechazar* (la doc es correcta → corregir el código, no tocar doc) o *parcial*.
4. **Para lo aceptado, propaga hacia arriba** nivel a nivel con confirmación: SWDD → SSD → SSRS → (SAD/SRS solo si contradice un requisito, confirmación explícita). Escribe átomos; enlaza `parent`/`children`.
5. Tras los cambios: `python scripts/gen_index.py <path>` y `python scripts/gen_rtm.py`.

El **código prevalece**: las divergencias aceptadas actualizan la doc, nunca al revés.
