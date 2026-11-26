<!-- GENERADO por .ai/scripts/sync.py (target Codex) desde las fuentes del submódulo. No editar: los cambios van al submódulo. -->
### Flujo de evaluación de propuesta entrante (cliente propone)

**Espejo del flujo de propuesta.** Aquí el sentido se invierte: **el cliente entrega una propuesta** (típicamente un PDF) y, antes de comprometer plazo alguno, hay que **auditarla con ojo crítico** contra la arquitectura actual y **estimar cuantificando la incertidumbre**. No es elaborar: es *evaluar*. Es **pre-canónico y solo-lectura** sobre la base — no toca SRS/SAD/SSRS/SSD/SWDD ni `docs/proposals/`; escribe en `docs/assessments/{tarea}/`.

```
1. La propuesta del cliente entra en docs/inputs/incoming/{tarea}/  (PDF)
2. $intake {tarea}: pdf-extraction-agent indexa+extrae por contexto → extracted/pdf/*
   └─ intake-agent → brief.md            (atomización + digerible)
3. $assess {tarea}:
   ├─ mapea la propuesta contra la base canónica (navega _index.md + SAD)
   ├─ convoca el PANEL DE EXPERTOS en MODO AUDITORÍA (no elige alternativa:
   │   caza el error) — cada expert-* devuelve indefiniciones · inconsistencias
   │   con la arquitectura (citando el átomo que rompe) · riesgos · preguntas
   ├─ assessment-agent redacta docs/assessments/{tarea}/analisis.md   (paso 4)
   │   (veredicto de viabilidad, mapa propuesta→arquitectura, hallazgos por
   │    categoría con origen · impacto · severidad · lente)
   ├─ GATE humano: el usuario revisa el análisis
   │   └─ $assess-qa {tarea} [+ preguntas]: bucle de Q&A sobre el análisis. Resuelve
   │      preguntas SOLO con las fuentes (extracted/ + base canónica + código),
   │      clasifica RESUELTA / PARCIAL / PARA EL CLIENTE (no inventa) y las anota de
   │      forma acumulativa y fechada en analisis.md (sección "Resolución de preguntas").
   └─ assessment-agent redacta docs/assessments/{tarea}/estimacion.md (paso 5)
       (bandas de incertidumbre optimista/probable/pesimista + desglose por
        módulo con reutiliza-vs-nuevo y dependencias; coste de la incertidumbre)
4. Documento vivo: si el cliente aclara dudas, se reejecuta $assess y las bandas
   se estrechan (o $assess-qa para resolver preguntas puntuales contra las fuentes).
   Si el alcance se aprueba y se decide construir, el puente hacia
   lo canónico es el flujo normal ($decision → $promote). Sin ADR no se propaga.
```

**Regla:** la estimación **no esconde la incertidumbre, la cuantifica**. Cada indefinición o inconsistencia del análisis ensancha la banda del módulo que toca; una propuesta poco definida da bandas anchas, y eso es un resultado honesto.

#### Desglose técnico y estimación (banco de trabajo)

Tras el gate humano sobre `analisis.md`, el flujo de evaluación se puede continuar con un **banco de trabajo vivo** que baja del "por módulo" al **por tarea técnica de nivel SWDD**, para estimar con la incertidumbre puesta encima de la mesa y poder iterar. Es pre-canónico y solo-lectura sobre la base; escribe en `docs/assessments/{tarea}/tasks/` y reformula `estimacion.md` como agregado **task-driven**.

```
analisis.md (revisado en el gate)
  │
  ├─ $assess-tasks {tarea}      → task-planner-agent desglosa en tareas TT por CAPACIDAD
  │    (docs/assessments/{tarea}/tasks/TT-*.md + _index.md; cada TT cita origin_propuesta y hallazgos)
  │    └─ GATE humano: revisar la lista de capacidades antes de estimar
  │
  ├─ $assess-estimate {tarea}   → assessment-agent (modo estimación) estima cada TT en
  │    JORNADAS-PERSONA (banda optimista/probable/pesimista + confianza) y regenera estimacion.md
  │    (agregado por capacidad y total; la incertidumbre de los hallazgos ensancha la banda)
  │
  ├─ $assess-task-add {tarea} "<tarea alto nivel>"   → inyecta una tarea del usuario: se analiza
  │    (mapea a capacidad/subsistema/hallazgos, marca lo NUEVO, convoca la lente del panel si abre
  │     terreno nuevo) y se estima. Actualiza _index y estimacion.md
  │
  ├─ $assess-task-revise {tarea} {TT-id} "<modificación>"   → modifica una tarea y la reestima;
  │    registra el delta antes→después en su changelog y reagrega estimacion.md
  │
  ├─ $assess-roadmap {tarea}     → organiza las tareas en INCREMENTOS DE VALOR por sprint
  │    (roadmap.md: Incremento 1 = esqueleto que funciona; cada incremento añade valor hasta el
  │     desarrollo completo; orden por valor+dependencias, banda agregada por incremento)
  │
  ├─ $assess-jira {tarea} [--push]   → exporta las tareas TT a Jira Cloud como issues bajo sus
  │    Epics existentes (script scripts/assess_to_jira.py; dry-run por defecto, push con credenciales)
  │
  └─ $assess-plan {carpeta-tasks}   → genera un bloque TSV para PEGAR en la hoja "Actividades" del Excel
       de plan/, con la Clave enlazada a Jira y Horas/Puntos = probable × 8 (scripts/plan_from_jira.py)
```

**Planificación en Excel** (`$assess-plan`): el script `scripts/plan_from_jira.py` (solo stdlib) lee los `TT-*.md` de la carpeta indicada, toma su `jira_key` (exige haber hecho antes `$assess-jira --push`), **lee la cabecera de la hoja "Actividades" con zipfile (solo lectura)** y emite un **bloque TSV** en `plan/<slug>-actividades-paste.tsv` (gitignored): **Clave de incidencia** como fórmula de hipervínculo (función y separador de `config.plan`: `HIPERVINCULO`/`;` en Excel ES, `HYPERLINK`/`,` en EN), Resumen, Componentes (`config.jira.components`), Etiquetas y Horas/Puntos = *probable* × `story_points_hours_per_day`. **NO escribe el `.xlsx`**: `openpyxl` al guardar **rompe las tablas y las fórmulas** del libro (comprobado), así que el usuario **pega** el bloque en la primera fila libre de la columna A y Excel extiende la tabla preservando todo.

**Export a Jira** (`$assess-jira`): el script `scripts/assess_to_jira.py` (solo stdlib) mapea cada `TT-*.md` a un issue Jira Cloud (API v3, descripción en ADF) bajo su **Epic existente** según `project-status.json → config.jira` (`epic_default` + `epic_overrides`; `"__transversal__"` = sin Epic). Story Points = `probable` de la banda (si `story_points_field` está configurado); la banda completa va siempre en la descripción; `depends_on` → enlaces "blocks". Dry-run por defecto (payloads en `docs/assessments/{tarea}/build/jira/`, gitignored); `--push` crea/actualiza (idempotente vía `jira_key` en el frontmatter del TT) con credenciales `JIRA_EMAIL`/`JIRA_API_TOKEN` (nunca hardcodeadas). Exportar es pre-canónico: **no** promueve nada a la base.

- **Tareas explicativas**: cada `TT` se redacta para que se entienda sin haber visto la propuesta — **contexto funcional**, **arquitectura y encaje** (con diagrama Mermaid cuando ayude) y **ejemplos SWDD en pseudocódigo o en el lenguaje del proyecto** (ilustrativo y no vinculante; la decisión final es del canónico vía `$decision`→`$promote`).
- **Granularidad por capacidad** (~12-20 tareas para un subsistema), no una tarea por átomo SWDD. Cada `TT` es una unidad de trabajo coherente que puede referir varios átomos de la propuesta.
- **Incrementos de valor**: el roadmap agrupa las tareas (sin cambiar su granularidad: cada `TT` va entera a un incremento) en entregas ordenadas por valor y dependencias. Incrementos **lógicos, sin duración fija**; cada uno lleva su banda agregada y el usuario decide cuántos sprints/personas le pone.
- **Modelo de estimación**: jornadas-persona en bandas + nivel de confianza. El esfuerzo base sale del eje *reutiliza vs nuevo* contra el canónico; cada hallazgo de `analisis.md` ligado a la tarea (severidad alta/media) **ensancha la banda y baja la confianza**. Nunca un número único.
- **Documento vivo**: resolver preguntas (`$assess-qa`) o revisar tareas (`$assess-task-revise`) estrecha las bandas.
- **Puente a canónico**: si el alcance se aprueba y se decide construir, las `TT` son **semilla** de las tasks canónicas/Atlas, pero **no las sustituyen**. El puente sigue siendo `$decision` (alternativas técnicas → ADR) → `$promote`. **Sin ADR no se propaga nada.**

