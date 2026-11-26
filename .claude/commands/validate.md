---
description: Verifica trazabilidad y consistencia — ejecuta el RTM y entrega un informe de gaps, referencias rotas y duplicados
argument-hint: "[alcance: subsistema | quick | full | duplicados]"
---

Vas a ejecutar el flujo de **validación** (alcance: **$ARGUMENTS**, o completo si está vacío).

Sigue `.claude/agents/validation-agent.md`. Eres **solo-lectura**: reportas, no modificas.

1. **Ejecuta** `python scripts/gen_rtm.py` (regenera `docs/traceability/rtm.md`).
2. **Analiza el RTM:** referencias rotas (**prioridad máxima**), REQ-SYS sin descomposición, átomos de diseño sin enlazar.
3. **Trazabilidad:** para cada REQ-SYS, ¿tiene hijo SSRS y descendientes en SSD/SWDD vía `parent`/`children`? ¿el SWDD tiene implementación en código (doc comments)?
4. **Duplicados:** revisa los átomos SRS (vía `_index`) buscando declaraciones similares, solapadas o contradictorias.
5. **Divergencias** código vs docs si existe `docs/inputs/extracted/code/`.

Entrega un **informe de validación** (no edites `rtm.md` ni los `_index.md` a mano — son generados) y presenta los hallazgos para que el usuario decida.
