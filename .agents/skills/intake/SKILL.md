---
name: intake
description: "Normaliza un item de incoming/ en un brief digerible (triaje por tipo/tamaño; PDF→extracción). Lo deja listo para $propose."
---
<!-- GENERADO por .ai/scripts/sync.py (target Codex) desde las fuentes del submódulo. No editar: los cambios van al submódulo. -->

> **Argumento:** lo que el usuario escribió al invocar la skill (`$intake <slug del item en docs/inputs/incoming/>`).
> Si no lo dio, pídeselo antes de empezar.

Vas a ejecutar el flujo de **intake (triaje de entrada)** sobre:

**{argumento del usuario}**

1. **Localiza el item** en `docs/inputs/incoming/` (fichero suelto o carpeta `{slug}/`). Si no está, pídelo.
2. **Detecta tipo y tamaño:**
   - **Ticket corto** (md/txt, pocas líneas) → no requiere pre-proceso pesado.
   - **Documento extenso** (md/txt largo) → requiere condensación.
   - **PDF** → ejecuta primero el `pdf-extraction-agent` para volcarlo a texto en `docs/inputs/extracted/` (nunca leas el PDF crudo entero).
3. **Normaliza:** delega en el `intake-agent` (lánzalo como subagente), que escribe `docs/inputs/incoming/{slug}/brief.md` (objetivo, alcance, restricciones, preguntas abiertas, punteros a la fuente). **Conserva el original.**
4. Presenta el `brief.md` al usuario. Cuando esté conforme, el siguiente paso es `$propose {slug}`.

El intake **no decide ni diseña**: solo deja la entrada digerible para que el panel no se ahogue con documentos extensos.
