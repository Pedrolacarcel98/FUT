---
name: research
description: "Arranca una investigación técnica VIVA previa a una decisión (cuando hace falta evidencia real, no basta el conocimiento actual). Crea el workbench docs/research/{tema}/ y mapea las preguntas abiertas con el panel. Pre-canónico, solo-lectura sobre la base."
---
<!-- GENERADO por .ai/scripts/sync.py (target Codex) desde las fuentes del submódulo. No editar: los cambios van al submódulo. -->

> **Argumento:** lo que el usuario escribió al invocar la skill (`$research <tema/slug> [+ pregunta o contexto]`).
> Si no lo dio, pídeselo antes de empezar.

Vas a arrancar el **flujo de investigación** para:

**{argumento del usuario}**

Es el paso previo al gate de decisión: reúne evidencia real (mediciones, spikes, verificación de supuestos) hasta que `$decision` pueda tomarse con fundamento. Sigue el procedimiento del `research-agent` (`.codex/agents/research-agent.toml`). Pre-canónico y **solo-lectura sobre la base** (no tocas SRS/SAD/SSRS/SSD/SWDD, `docs/proposals/` ni `docs/assessments/`).

1. **Fuente.** Si la investigación parte de un documento/PDF, debe estar atomizado: si existe `docs/inputs/incoming/{tema}/brief.md` + `extracted/`, úsalos; si es un PDF o documento extenso sin atomizar, ejecuta **`$intake {tema}` primero**. Si parte solo de una pregunta del usuario, tómala como `pregunta_raiz`.

2. **Define la pregunta raíz y el alcance.** Qué decisión desbloquea esta investigación, qué se investiga y qué queda fuera. Confírmalo con el usuario si hay ambigüedad.

3. **Convoca al panel (modo investigación) para enmarcar las preguntas.** Identifica las lentes relevantes y lanza **en paralelo** (una sola tanda de tool calls) los `expert-*` pertinentes lanzándolos como subagentes — NO los 7 siempre, solo los relevantes (`expert-architecture`, `expert-nextjs-ts`, `expert-security`, `expert-performance`, `expert-supabase`, `expert-data`, `expert-platform`). A cada uno pásale la pregunta raíz + el contexto + los átomos relevantes, y pídele: **qué necesita saberse (medirse/verificarse) desde su lente para decidir con fundamento** — es decir, la lista de preguntas abiertas de su especialidad, con qué evidencia las cerraría. No pides un veredicto de elección todavía; pides el mapa de incógnitas.
   - Si la investigación parte de un panel ya ejecutado (p. ej. un `$decision` que se pausó por falta de evidencia), **siémbrala con esos veredictos** como evidencia inicial en vez de reconvocar el panel de cero.

4. **Delega en `research-agent`** (lánzalo como subagente), pasándole la pregunta raíz, el alcance y las incógnitas del panel. Escribe `docs/research/{tema}/investigacion.md` (pregunta, alcance, **mapa de preguntas abiertas Q-*** con estado/confianza, alternativas en juego, veredicto provisional = "insuficiente para decidir") y el `_index.md`. Si hay evidencia de siembra, la registra como `evidencia/EV-*`.

5. **PARA y presenta el mapa de preguntas al usuario (gate humano).** La lista de preguntas abiertas por lente, con su estado inicial. El usuario puede añadir/quitar preguntas o corregir el alcance **antes** de planificar spikes. El siguiente paso es `$research-spikes {tema}`.
