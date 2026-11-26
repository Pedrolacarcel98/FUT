---
name: assess-jira
description: "Exporta las tareas técnicas de un assessment (docs/assessments/{tarea}/tasks/TT-*.md) a Jira Cloud como issues bajo sus Epics existentes. Dry-run por defecto; el push real exige credenciales y --push."
---
<!-- GENERADO por .ai/scripts/sync.py (target Codex) desde las fuentes del submódulo. No editar: los cambios van al submódulo. -->

> **Argumento:** lo que el usuario escribió al invocar la skill (`$assess-jira <slug de la tarea> [--push] [--only TT-0NN]`).
> Si no lo dio, pídeselo antes de empezar.

Vas a **exportar a Jira** las tareas técnicas del assessment:

**{argumento del usuario}**

Mecanismo: el script `scripts/assess_to_jira.py` (solo stdlib). Lee cada `TT-*.md`, lo mapea a un issue Jira Cloud (API v3) con descripción en ADF, y lo cuelga de su **Epic existente** según el mapeo de `project-status.json → config.jira.epic_overrides` (por defecto `epic_default`). Pre-canónico: exportar NO promueve nada a la base canónica.

## Procedimiento
1. **Comprueba la config** en `project-status.json → config.jira`:
   - `base_url` (p.ej. `https://tuorg.atlassian.net`) y `project_key` deben estar rellenos para el push.
   - `story_points_field` = id del custom field de Story Points (p.ej. `customfield_10016`); si está vacío, no se rellena y la banda va solo en la descripción.
   - `epic_link_field` = `parent` (team-managed) o el customfield del Epic Link (company-managed).
   - `epic_default` / `epic_overrides` = mapeo TT→Epic (el Epic debe existir ya en Jira; `"__transversal__"` = sin Epic, etiqueta `transversal`).
2. **Dry-run primero (gate)**: ejecuta
   `python scripts/assess_to_jira.py --task {tarea}`
   Genera los payloads en `docs/assessments/{tarea}/build/jira/*.json` (gitignored) y una tabla por consola (id · Story Points · Epic · labels · summary). **Revisa** que el mapeo de Epics, los Story Points (= `probable` de la banda) y las labels son correctos antes de tocar Jira. PARA aquí y enséñalo al usuario.
3. **Push (tras confirmación humana)**: credenciales por `.jira.env` (gitignored) o por entorno. Recomendado: el usuario copia `.jira.env.example` → `.jira.env`, lo rellena, y ejecuta **en su propia terminal**:
   ```
   python scripts/assess_to_jira.py --task {tarea} --push
   ```
   El script **carga `.jira.env` automáticamente** si `JIRA_EMAIL`/`JIRA_API_TOKEN` no están ya en el entorno (las del entorno tienen prioridad). Luego: resuelve cada Epic por nombre (no lo crea; falla si no existe), asigna el/los componente(s) de `config.jira.components`, crea el issue (o lo **actualiza** si el `TT` ya tiene `jira_key` en su frontmatter — idempotente), escribe el `jira_key` devuelto en el frontmatter del `TT`, y crea los **enlaces de dependencia** (`depends_on` → "X blocks TT").
   - **No** lances el `--push` a través del asistente ni con el prefijo `!`: el token no debe entrar en la conversación. Que el usuario lo ejecute en su terminal.

## Reglas
- **Nunca** hardcodees credenciales; van por `JIRA_EMAIL`/`JIRA_API_TOKEN`. El script no las persiste.
- El dry-run no necesita credenciales ni red.
- La banda de estimación (opt/prob/pes + confianza) va **siempre** en la descripción; los Story Points son solo el `probable` para tableros ágiles.
- Los Epics deben existir en Jira; el script no crea Epics. Si `epic_overrides` apunta a un nombre inexistente, el push falla con un error claro.
- Es solo-lectura sobre la base canónica y sobre Jira salvo en `--push`.
