---
name: capture
description: "Captura un requisito nuevo o cambio en el SRS (átomos), detecta impacto y deriva a $decision si hay alternativas"
---
<!-- GENERADO por .ai/scripts/sync.py (target Codex) desde las fuentes del submódulo. No editar: los cambios van al submódulo. -->

> **Argumento:** lo que el usuario escribió al invocar la skill (`$capture <descripción del requisito o cambio>`).
> Si no lo dio, pídeselo antes de empezar.

Vas a ejecutar el flujo de **captura de requisitos** sobre:

**{argumento del usuario}**

Sigue `.codex/agents/capture-agent.toml` y la convención atómica del `AGENTS.md`:

1. **Contexto:** carga los `_index.md` de `docs/system/srs/{area}/` (barato); abre solo los átomos necesarios. Pregunta lo que no quede claro.
2. **Identifica** requisitos: funcionales, NFR y restricciones.
3. **¿Hay ≥2 caminos funcionales viables?** Si sí, **no improvises**: lanza `$decision` para evaluarlos y registrar el ADR antes de escribir. Si no, continúa.
4. **Escribe un átomo por requisito** en `docs/system/srs/{area}/{REQ-ID}.md` con frontmatter mínimo (`id`, `summary`, `parent: []`, `children`, `related`, `origin`). No agrupes varios requisitos en un fichero.
5. **Regenera:** `python scripts/gen_index.py docs/system/srs/{area}` y `python scripts/gen_rtm.py`.
6. **Detecta impacto** en niveles inferiores (SAD/SSRS/SSD/SWDD) y **avisa** — no los modifiques (eso es `$design`).
7. **Detecta duplicados/solapes** y preséntalos antes de crear.

Mantén los requisitos a nivel de sistema (el qué, no el cómo). Solo tocas el SRS.
