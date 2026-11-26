<!-- GENERADO por .ai/scripts/sync.py (target Codex) desde las fuentes del submódulo. No editar: los cambios van al submódulo. -->
### Reconciliación código → documentación

Cuando el código implementado diverge de lo definido en SWDD/SSD/SSRS/SAD (por decisiones tomadas durante el desarrollo, limitaciones técnicas descubiertas, o mejoras oportunistas):

```
1. Usuario solicita reconciliación (o el agente la detecta al leer código)
2. design-agent compara el código actual contra el SWDD del módulo:
   ├─ Identifica divergencias: qué cambió, qué se añadió, qué se eliminó
   └─ Presenta un informe de divergencias al usuario
3. Para cada divergencia, el usuario decide:
   ├─ Aceptar: el código es correcto → propagar cambio HACIA ARRIBA en docs
   ├─ Rechazar: la doc es correcta → el código debe corregirse (no se toca doc)
   └─ Parcial: parte del cambio se acepta, parte se rechaza
4. Para las divergencias aceptadas, se propaga HACIA ARRIBA nivel a nivel:
   ├─ SWDD: se actualiza para reflejar el código real
   ├─ SSD: si el cambio afecta a diseño → se actualiza (usuario confirma)
   ├─ SSRS: si el cambio afecta a requisitos del subsistema → se actualiza (usuario confirma)
   ├─ SAD: si el cambio afecta a arquitectura → se actualiza (usuario confirma)
   └─ SRS: solo si el cambio contradice un requisito de sistema (raro, requiere confirmación explícita)
5. En cada nivel hacia arriba: el agente muestra qué cambiaría y el usuario confirma
```

**Cuándo ejecutar este flujo:**
- Tras completar una implementación, antes de cerrar la tarea
- Cuando se detecta que el código ha evolucionado sin actualizar la doc
- Periódicamente como auditoría de coherencia código-documentación

