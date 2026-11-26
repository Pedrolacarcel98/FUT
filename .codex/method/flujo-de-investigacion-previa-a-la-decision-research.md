<!-- GENERADO por .ai/scripts/sync.py (target Codex) desde las fuentes del submódulo. No editar: los cambios van al submódulo. -->
### Flujo de investigación previa a la decisión (research)

Cuarto modo de trabajo — junto a *documentar*, *proponer*, *evaluar* y *evaluación de alternativas*. Se activa cuando una decisión **depende de evidencia que hoy no se tiene**: mediciones en el hardware real, un spike de una tecnología que nadie ha usado, la verificación de un supuesto contra el código. En vez de decidir sobre extrapolaciones, se **investiga primero** con un workbench **vivo** que reúne evidencia hasta que la decisión pueda tomarse con fundamento. Es **pre-canónico y solo-lectura sobre la base** — escribe en `docs/research/{tema}/`, no toca SRS/SAD/SSRS/SSD/SWDD, `docs/proposals/` ni `docs/assessments/`.

Se intercala **antes del gate de decisión** y lo alimenta:

```
$intake → [ $research → $research-spikes → $research-log* → $research-review ] → $research-close → $decision (ADR) → $propose|$design → $promote
```

```
Necesidad de decidir, pero faltan datos
  │
  ├─ $research {tema}        → research-agent define la pregunta raíz y, con el PANEL (modo investigación),
  │    mapea las preguntas abiertas Q-* por lente (qué hay que medir/verificar). Crea investigacion.md.
  │    └─ GATE humano: revisar el mapa de preguntas antes de planificar
  │
  ├─ $research-spikes {tema} → task-planner-agent desglosa las preguntas en spikes RT-* (qué construir/medir,
  │    entregable esperado, criterio de concluyente). GATE humano.
  │
  ├─ $research-log {tema} "<evidencia>"   → CORAZÓN VIVO: registra evidencia (resultado de spike, medición,
  │    fuente nueva vía $intake) como EV-*, actualiza estado/confianza de las Q-* que toca, reinterpreta con
  │    la lente del panel pertinente, reactualiza el veredicto provisional. Acumulativo y fechado. Se repite.
  │
  ├─ $research-review {tema}  → el panel revisa la foto entera (qué queda abierto, qué falta) y assessment-agent
  │    cuantifica el coste de la incertidumbre. Marca lista-para-decidir si no quedan P1 abiertas. GATE humano.
  │
  └─ $research-close {tema}   → comprueba confianza suficiente (si faltan P1, NO cierra) y hace de puente a
       $decision con las alternativas + la evidencia consolidada → ADR → $propose|$design.
```

**Reutilización (no se duplica maquinaria):** el **panel `expert-*`** enmarca las preguntas e **interpreta** la evidencia; **`task-planner-agent`** (modo spikes) descompone en experimentos `RT-*`; **`intake`** trae cada fuente/medición nueva; **`assessment-agent`** (modo incertidumbre) cuantifica el coste de lo que falta; **`decision-agent`** decide al final. El `research-agent` es el **dueño del workbench**: mantiene el estado vivo (preguntas, confianza, bitácora) y sintetiza.

**Reglas duras:** la investigación es un **documento vivo** (evidencia acumulativa y fechada, nunca se reescribe el histórico); se distingue siempre **medido / estimado / asumido**; lo no verificado es una **pregunta abierta**, no un supuesto; **sin evidencia suficiente no se decide** y **sin ADR no se propaga**. La investigación no termina en un plazo fijo, sino cuando hay **confianza suficiente** (o cuando se concluye que la incertidumbre es irreducible — y eso también es un resultado).

