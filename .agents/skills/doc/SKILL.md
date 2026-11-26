---
name: doc
description: "Genera documentación formal en docs/generated/ a partir de los átomos, sección a sección"
---
<!-- GENERADO por .ai/scripts/sync.py (target Codex) desde las fuentes del submódulo. No editar: los cambios van al submódulo. -->

> **Argumento:** lo que el usuario escribió al invocar la skill (`$doc <tipo de documento + estructura, o ruta a una doc-spec>`).
> Si no lo dio, pídeselo antes de empezar.

Vas a ejecutar el flujo de **generación de documentación formal**:

**{argumento del usuario}**

Sigue `.codex/agents/doc-generator-agent.toml` y el `AGENTS.md` (*Generación de documentación formal*).

**Requisito obligatorio:** necesitas una **estructura** (apartados numerados + instrucciones por sección). Si no se ha dado, pídela o usa una de `docs/inputs/doc-specs/`. **Sin estructura, no generas nada.**

1. **Analiza la estructura:** por cada sección, identifica qué fuentes internas necesita (átomos SRS/SSRS/SSD/SWDD/ICD, navegando por `_index`). Pregunta las ambigüedades.
2. **Genera sección a sección** en `docs/generated/{documento}/parts/seccion-NN-*.md`; registra el avance en `docs/generated/{documento}/progreso.md`. Tras cada sección, **para** y espera revisión.
3. **No inventes:** todo con origen en los átomos; **cita la fuente** por sección. Respeta la estructura del usuario (no añadas ni quites secciones).
4. Al completar, **ensambla** en `docs/generated/{documento}/{documento}.md`. La conversión a PDF (`build/`) es responsabilidad del usuario; el `.typ` se versiona, el `.pdf` no.
