---
name: assess-qa
description: "Resuelve preguntas sobre una propuesta auditada contra sus fuentes (extracted/ + base canónica + código) y las anota en analisis.md, distinguiendo lo resuelto-con-fuente de lo que sigue siendo pregunta al cliente."
---
<!-- GENERADO por .ai/scripts/sync.py (target Codex) desde las fuentes del submódulo. No editar: los cambios van al submódulo. -->

> **Argumento:** lo que el usuario escribió al invocar la skill (`$assess-qa <slug de la tarea> [+ tus preguntas]`).
> Si no lo dio, pídeselo antes de empezar.

Vas a ejecutar el flujo de **resolución de preguntas** sobre la auditoría de una propuesta entrante:

**{argumento del usuario}**

Es el bucle de Q&A que acompaña a `$assess`: el usuario hace preguntas sobre la propuesta o el análisis, tú las resuelves **solo con las fuentes que ya existen** y anotas la respuesta en el `analisis.md`. Sigue el procedimiento del `assessment-agent` (`.codex/agents/assessment-agent.toml`, *Modo resolución de preguntas*). **No tocas la base canónica**; solo escribes en el `analisis.md` de la tarea.

1. **Localiza la tarea** en `docs/inputs/incoming/{tarea}/`. Debe existir ya `analisis.md` (y `extracted/`). Si no existe el análisis, dilo y sugiere `$assess {tarea}` primero — no hay nada que anotar todavía.

2. **Reúne las preguntas.** Toma las que el usuario haya escrito (en `{argumento del usuario}` o en el mensaje). Si no ha escrito ninguna, **pídeselas y PARA** — este comando no inventa preguntas.

3. **Resuelve cada pregunta SOLO con las fuentes existentes**, sin asumir nada nuevo. Fuentes, por orden: los átomos de la propuesta en `docs/inputs/incoming/{tarea}/extracted/*` (incluido `er-datamodel.md`), la base canónica (`docs/system|subsystem|software`, navegando por `_index.md`), y el código extraído en `docs/inputs/extracted/code/` si aplica. Clasifica cada pregunta:
   - **RESUELTA** — la respuesta está en las fuentes. Respóndela y **cita el átomo/sección exacta**.
   - **PARCIAL** — parte se resuelve con fuente, parte no. Marca claramente qué queda abierto.
   - **PARA EL CLIENTE** — no está en las fuentes (indefinición, `//TODO`, decisión pendiente). **No la respondas por tu cuenta**; déjala como pregunta al cliente y, si mapea con un hallazgo o una [P1] del análisis, referénciala por su ID.
   - Si una pregunta exige **re-análisis experto** (no solo lectura de fuentes), puedes convocar la lente pertinente del panel (`expert-*`) en modo auditoría antes de redactar; indícalo en la respuesta.

4. **Anota en `analisis.md` (registro acumulativo).** Delega en el `assessment-agent`, que **añade** (no reescribe) una tanda fechada bajo la sección `## Resolución de preguntas (Q&A)`. Cada pregunta queda con: enunciado · veredicto (RESUELTA / PARCIAL / PARA EL CLIENTE) · respuesta en prosa · fuente citada · hallazgo/[P1] relacionado si aplica. Si una respuesta **cambia** un hallazgo del análisis (lo confirma, lo matiza o lo desmonta), anótalo como nota junto al hallazgo **sin borrar** la versión previa (trazabilidad).

5. **Presenta al usuario** el resumen: cuántas resueltas / parciales / para-cliente, y las que hayan movido algún hallazgo. El documento es **vivo**: puede reejecutarse con más preguntas; cada tanda se apila con su fecha.

Estilo **verboso y didáctico** por defecto (ver *Estilo de redacción* del `assessment-agent`): prosa que se entienda, términos técnicos explicados, autocontenido.
