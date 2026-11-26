---
description: Aplica correcciones a una propuesta existente (documento vivo) leyendo los tags de revisión inline del propio .md; incorpora feedback, versiona y registra el cambio
argument-hint: <tarea> [— feedback opcional; por defecto lee los tags [!REVISIÓN] del .md]
---

Vas a ejecutar el flujo de **corrección de propuesta** sobre:

**$ARGUMENTS**

El feedback **vive dentro de la propia propuesta** como tags de revisión. El usuario los escribe pegados a lo que hay que cambiar y tú los interpretas — no hace falta que repita las correcciones en el prompt.

## Convención del tag de revisión

Cada corrección es un **callout** de GitHub colocado **justo encima o dentro** de la sección/texto a corregir. El cuerpo del callout describe el cambio:

```markdown
## Estimación

> [!REVISIÓN]
> Sube a 6 semanas; el spike de SCADA se subestimó.
> Añade riesgo de integración.

Estimación: 4 semanas.
```

- El **contexto** del tag es el contenido que lo rodea (la sección bajo la que está, el párrafo inmediatamente siguiente). Aplica la corrección a ese contexto.
- Puede haber varios callouts en distintas secciones; trátalos todos en una pasada.
- Como el callout **se renderiza** (saldría en el PDF cliente-facing), **debe eliminarse** una vez aplicada su corrección. Regla dura: no queda ningún `> [!REVISIÓN]` en la propuesta al cerrar el flujo.

## Pasos

1. **Lee** la propuesta actual `docs/proposals/{tarea}/propuesta.md`.
2. **Recoge las correcciones:**
   - **Por defecto**, escanea el `.md` en busca de bloques `> [!REVISIÓN]` (`grep` del patrón `\[!REVISIÓN\]`). Para cada uno, captura su cuerpo y el contexto que lo rodea.
   - Si **además** el usuario pasó feedback en el argumento, súmalo a las correcciones encontradas.
   - Si **no hay ningún tag** y **no hay feedback** en el argumento, **pregúntale** qué corregir (no asumas). **Para ahí** hasta que responda.
   - Confirma que entiendes cada corrección antes de aplicarla.
3. **Evalúa el calado** de cada corrección: si es de redacción/alcance, sigue. Si **cambia una decisión técnica de fondo**, avisa de que conviene re-evaluar con `/decision` y actualizar el ADR antes de tocar la propuesta — no cambies la decisión por tu cuenta.
4. **Aplica:** delega en el `proposal-agent` en **modo corrección** — edita in situ, **elimina cada callout `[!REVISIÓN]` ya aplicado**, sube la versión en el frontmatter, añade fila a *Control de cambios* (fecha · versión · cambio · autor). No regenera de cero ni reescribe el historial.
5. **Presenta** el resumen de lo cambiado, indicando qué tags se aplicaron y eliminaron. Verifica que no queda ningún `[!REVISIÓN]` huérfano. **Repite** hasta que el usuario apruebe.

La propuesta sigue siendo **pre-canónica** (no toca SRS/SAD/...) y mantiene el detalle **hasta SSD**. Cuando el cliente apruebe el alcance, el cierre es `/promote {tarea}`.
