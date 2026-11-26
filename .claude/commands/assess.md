---
description: Audita críticamente una propuesta ENTRANTE de cliente contra la arquitectura actual (panel en modo auditoría) y estima con bandas de incertidumbre + desglose por módulo. Pre-canónico, solo-lectura sobre la base.
argument-hint: <slug de la tarea en docs/inputs/incoming/>
---

Vas a ejecutar el **flujo de evaluación de propuesta entrante** para:

**$ARGUMENTS**

Es el **espejo de `/propose`**: aquí el cliente propone y tú **auditas y estimas** antes de comprometerte. Sigue el procedimiento del `assessment-agent` (`.claude/agents/assessment-agent.md`) y la sección *Flujo de evaluación de propuesta entrante* del `CLAUDE.md`. **No tocas la base canónica** (SRS/SAD/SSRS/SSD/SWDD) ni `docs/proposals/`: esto es pre-canónico y solo-lectura sobre la base.

1. **Localiza la tarea** en `docs/inputs/incoming/{tarea}/`. Necesitas la propuesta **ya atomizada**:
   - Si **no** existen los átomos en `docs/inputs/extracted/pdf/*` ni el `brief.md`, ejecuta **`/intake {tarea}` primero** (indexa+extrae el PDF por contexto y deja el brief). No leas el PDF crudo entero.

2. **Mapea la propuesta contra tu arquitectura.** Carga el `brief.md` y los átomos de `extracted/pdf/*`. Navega la base canónica **por `_index.md`** (system/subsystem/software) y el SAD (`vision-general.md`) para saber a qué módulos/subsistemas de la taxonomía toca cada parte. **Nunca cargues carpetas enteras.**

3. **Convoca al panel en MODO AUDITORÍA.** Identifica qué lentes aplican y lanza **en paralelo** (una sola tanda de tool calls) los `expert-*` pertinentes vía la herramienta Agent — NO los 7 siempre, solo los relevantes:
   - `expert-architecture`, `expert-nextjs-ts`, `expert-security`, `expert-performance`, `expert-supabase`, `expert-data`, `expert-platform`.
   - A cada uno pásale: los átomos de la propuesta + los átomos canónicos relevantes. Pídele, desde su lente, **no** un pros/contras de elección, sino: **indefiniciones · inconsistencias con la arquitectura (citando el átomo que rompe) · riesgos · preguntas al cliente**. El encargo es **cazar el error**, no elegir.

4. **Redacta el análisis (paso 4).** Delega en el `assessment-agent` (herramienta Agent), pasándole los veredictos del panel. Escribe `docs/assessments/{tarea}/analisis.md` con veredicto de viabilidad, mapa propuesta→arquitectura, y **hallazgos** por categoría (indefiniciones, preguntas al cliente, inconsistencias con arquitectura, riesgos, contradicciones internas), cada uno con origen · impacto · **severidad** · lente.

5. **PARA y presenta el análisis al usuario (gate humano).** Espera su revisión. Puede pedir profundizar en un hallazgo, añadir una lente o corregir el mapa antes de estimar. **No estimes sin este gate.**

6. **Estima (paso 5).** Con el análisis revisado, delega de nuevo en el `assessment-agent` para escribir `docs/assessments/{tarea}/estimacion.md` con el modelo **bandas + desglose por módulo**:
   - Desglose por módulo/subsistema (reutiliza vs nuevo · dependencias · esfuerzo base · hallazgos que lo afectan · banda).
   - Agregado en **bandas** (optimista/probable/pesimista) — nunca un número único.
   - **Coste de la incertidumbre**: qué plazo depende de resolver qué preguntas, y cuánto se estrecha la banda si se responden.

7. **Presenta ambos entregables.** La evaluación es un **documento vivo**: si el cliente aclara dudas, se reejecuta `/assess` para reestrechar bandas. Si el alcance se aprueba y se decide construir, el puente hacia lo canónico es el flujo normal (`/decision` para las alternativas técnicas → `/promote`). **Sin decisión registrada no se propaga nada.**
