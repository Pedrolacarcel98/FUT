---
name: decision
description: "Evalúa alternativas (funcionales/técnicas) con el panel de expertos y registra un ADR antes de propagar"
---
<!-- GENERADO por .ai/scripts/sync.py (target Codex) desde las fuentes del submódulo. No editar: los cambios van al submódulo. -->

> **Argumento:** lo que el usuario escribió al invocar la skill (`$decision <punto de decisión o cambio a evaluar>`).
> Si no lo dio, pídeselo antes de empezar.

Vas a ejecutar el **flujo de evaluación de alternativas** (gate de decisión) sobre:

**{argumento del usuario}**

Sigue el procedimiento del `decision-agent` (`.codex/agents/decision-agent.toml`) y la sección *Modo evaluación de alternativas* del `AGENTS.md`. Lo orquestas tú desde aquí (no escribes documentación de nivel; eso es de capture/design):

1. **Entiende el punto de decisión.** Carga el `_index.md` del nivel afectado y abre solo los átomos relevantes (navega por `parent`/`children`, nunca carpetas enteras). Si no hay ≥2 caminos viables, dilo y **para** — no hay decisión que tomar.

2. **Genera 2-4 alternativas** genuinamente distintas. No escribas nada en los documentos de nivel todavía.

3. **Convoca al panel.** Identifica qué lentes aplican al cambio y lanza **en paralelo** (una sola tanda de tool calls) los `expert-*` pertinentes lanzándolos como subagentes — NO los 7 siempre, solo los relevantes:
   - `expert-architecture`, `expert-nextjs-ts`, `expert-security`, `expert-performance`, `expert-supabase`, `expert-data`, `expert-platform`.
   - A cada uno pásale: las alternativas + el contexto + los átomos relevantes. Pídele un veredicto por alternativa: **pros, contras, riesgo, coste, reversibilidad** desde su especialidad.

4. **Sintetiza la comparativa**: una ficha por alternativa con impacto por nivel (↑/↓) y los veredictos del panel. **Señala los disensos** (no los promedies). Añade una recomendación con su porqué.

5. **PARA y presenta al usuario.** Espera su elección. Puede elegir, pedir refinar/añadir una alternativa (vuelves al paso 2/3) o cancelar.

6. **Registra el ADR** en `docs/decisions/ADR-{NNN}-{slug}.md` (siguiente número libre) con la elegida + las descartadas + la razón del descarte.

7. **Devuelve el veredicto** para que la propagación (capture/design-agent o `$design`) aplique **solo** la opción elegida. **Sin ADR no hay propagación.**
