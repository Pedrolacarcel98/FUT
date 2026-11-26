---
description: Genera un documento entregable a cliente (Typst) a partir de una propuesta técnica interna — sin opciones ni referencias internas, con el formato del documento funcional
argument-hint: <tarea> [— notas de enfoque o estructura opcional]
---

Vas a generar el **documento entregable a cliente** derivado de la propuesta interna de:

**$ARGUMENTS**

Sigue `.claude/agents/proposal-doc-generator.md`. El entregable se construye desde `docs/proposals/{tarea}/propuesta.md` y se escribe en `docs/generated/documento-{slug}/` con el **formato corporativo** de `docs/generated/_assets/` (plantilla `_assets/plantilla_ficha.typ`, estilos `_assets/estilo_*.typ`). Si el proyecto ya tiene otro documento formal generado, úsalo como referencia de estilo.

## Reglas duras (no negociables)
- **Sin opciones ni alternativas:** una sola solución, presentada como adoptada y explicada.
- **Sin referencias a documentos internos** (ADR, SSD, SWDD, SAD, SRS, RTM, átomos, HC-IDs internos, § x.y de la propuesta, `/decision`, base canónica).
- **Sin marcas de trabajo interno** (`TBD repo`, jerga `required.d/wanted.d` en crudo, riesgos R1/R8 en crudo): tradúcelo a lenguaje cliente o omítelo.
- **Detalle alto:** todo muy bien explicado (qué, por qué, cómo funcional). Sin código.

## Pasos
1. **Lee la propuesta** completa. Propón una **estructura** de secciones cliente-facing (objeto, contexto/necesidad, visión de la solución, validación de arranque, catálogo por servicio, supervisión en operación, salvaguarda de datos, política de actualización, acciones de arranque/diagnóstico, alcance y entregables, consideraciones y prerrequisitos). Si el usuario pasó estructura o notas, respétalas.
2. **Andamia** `docs/generated/documento-{slug}/`: `progreso.md`, `build/typst/`, y el `.typ` maestro con `#plantilla_ficha(...)` + control de cambios + includes.
3. **Genera sección a sección** en `build/typst/seccion-NN-*.typ` (fuente única; **no** generes `.md` paralelo). Registra avance en `progreso.md`.
4. **Ensambla/verifica** el `.typ` maestro al terminar y comprueba que compila (`typst compile --root docs/docs/generated …`). La conversión a PDF es del usuario; el `.typ` se versiona, el `.pdf` no.

Este documento es **independiente de la propuesta** (no la modifica) y **no toca la base canónica**. La propuesta sigue su curso (validación con cliente → `/promote` cuando proceda).
