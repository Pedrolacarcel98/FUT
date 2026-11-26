<!-- GENERADO por .ai/scripts/sync.py (target Codex) desde las fuentes del submódulo. No editar: los cambios van al submódulo. -->
### Flujo de propuesta a cliente

Cuando el cliente deja una tarea (descripción corta) y hay que **proponer antes de tocar la base canónica**. La propuesta es **pre-canónica y viva**: cambia durante el desarrollo y solo al aprobarse se promueve. Llega hasta **nivel SSD** (no SWDD).

```
1. La tarea entra en docs/inputs/incoming/{tarea}/  (ticket, documento o PDF)
2. $intake {tarea}: triaje por tipo/tamaño (ticket → passthrough; documento
   extenso → condensa; PDF → pdf-extraction-agent → condensa)
   └─ intake-agent → incoming/{tarea}/brief.md (digerible)
3. $propose {tarea}: consume el brief (baja al original solo para el detalle)
   ├─ ACLARA: pregunta las dudas abiertas del brief (no asume) → usuario responde
   ├─ $decision: presenta y explica alternativas (panel → ADR) → usuario elige/aprueba
   └─ solo entonces proposal-agent redacta docs/proposals/{tarea}/propuesta.md
        (resumen ejecutivo, alcance, alternativas pros/contras, solución
         hasta SSD, estimación, riesgos, control de cambios) — documento vivo
   └─ $propose-revise {tarea}: correcciones iterativas (versiona + control de cambios)
4. [mes de desarrollo; la propuesta se corrige con $propose-revise]
5. Alcance aprobado → $promote {tarea}:
   ├─ $reconcile de los módulos (código = verdad)
   ├─ propaga a SRS/SAD/SSRS/SSD/SWDD (capture + design) + regenera RTM
   └─ $doc → especificación funcional formal (typst)
```

**Regla:** la propuesta llega hasta SSD; el **SWDD y el canónico** se materializan en `$promote`, reflejando lo construido + el alcance aprobado.

