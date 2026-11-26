---
name: assess-plan
description: "Genera un bloque (TSV) para PEGAR en la hoja \"Actividades\" del Excel de plan/, con las tareas de un assessment ya en Jira (Clave enlazada a Jira, Horas/Puntos = probable × 8). NO modifica el .xlsx."
---
<!-- GENERADO por .ai/scripts/sync.py (target Codex) desde las fuentes del submódulo. No editar: los cambios van al submódulo. -->

> **Argumento:** lo que el usuario escribió al invocar la skill (`$assess-plan <carpeta de tasks, p.ej. docs/assessments/notifications/tasks> [--sep ,]`).
> Si no lo dio, pídeselo antes de empezar.

Vas a **preparar la planificación en el Excel** para:

**{argumento del usuario}**

Mecanismo: `scripts/plan_from_jira.py` (solo stdlib). Lee los `TT-*.md` de la carpeta, toma su `jira_key` (exige haber hecho antes `$assess-jira ... --push`), **lee la cabecera de la hoja "Actividades" con zipfile (solo lectura)** y emite un bloque **TSV** en el orden real de columnas de esa hoja:
- **Clave de incidencia** = `=HYPERLINK("{base_url}/browse/{KEY}";"{KEY}")` (enlace clicable a Jira).
- **Resumen** = `[TT-id] título`, **Componentes** = `config.jira.components`, **Etiquetas** = capacidad + subsistema, **Horas** y **Puntos** (persona/totales) = *probable* × `story_points_hours_per_day` (8), Puntos gestión = 0.

**Por qué no escribe el .xlsx:** `openpyxl` al guardar **rompe las tablas y las fórmulas** del libro (comprobado). Por eso este comando **no toca tu fichero**: genera un bloque que **tú pegas**, y Excel extiende la tabla y preserva todo.

## Procedimiento
1. **Precondición**: los TT deben tener `jira_key` (si no, `$assess-jira <tarea> --push`). Config en `project-status.json → config.jira`.
2. Ejecuta: `python scripts/plan_from_jira.py --tasks-dir <carpeta>`
   - Escribe `plan/<slug>-actividades-paste.tsv` (gitignored) e imprime dónde está + una vista previa.
   - Mapea las columnas por su cabecera real (robusto a reordenaciones).
3. **Pegar (lo hace el usuario)**: abre ese `.tsv` en un editor (UTF-8), copia todo, y en la hoja **"Actividades"** pega en la **primera celda libre de la columna A** (p.ej. `A14`). Excel reparte por tabs, extiende la tabla y no toca fórmulas/formatos.
   - Función y separador de la fórmula salen de `project-status.json → config.plan` (`hyperlink_func`, `formula_sep`; por defecto para este proyecto `HIPERVINCULO` y `;`, Excel en español). Override puntual con `--func` / `--sep` (p.ej. `--func HYPERLINK --sep ,` para Excel EN).

## Reglas
- **NUNCA** escribas el `.xlsx` con openpyxl (rompe tablas/fórmulas). Este flujo es solo-lectura sobre el Excel.
- Si hay varios `.xlsx` en `plan/`, pásalo con `--xlsx`.
- Solo-lectura sobre Jira (solo construye URLs) y sobre la base canónica.
