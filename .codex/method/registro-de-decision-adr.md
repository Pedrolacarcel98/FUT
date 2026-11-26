<!-- GENERADO por .ai/scripts/sync.py (target Codex) desde las fuentes del submódulo. No editar: los cambios van al submódulo. -->
### Registro de decisión (ADR)

Se guarda en `docs/decisions/ADR-{NNN}-{slug}.md`, transversal a todos los niveles.

```markdown
# ADR-{NNN} — {Título de la decisión}

- **Estado:** propuesta | aceptada | sustituida por ADR-{MMM} | revertida
- **Fecha:** YYYY-MM-DD
- **Nivel:** SRS | SAD | SSRS | SSD | SWDD
- **Afecta a:** {REQ-* / módulo / subsistema / componente}
- **Tipo:** funcional | técnica

## Contexto
{El problema o la necesidad que obliga a decidir.}

## Alternativas evaluadas

### Alternativa A — {nombre}   ✅ ELEGIDA
- **Descripción:** ...
- **Impacto:** ↑ niveles superiores / ↓ niveles inferiores
- **Pros / Contras:** ...
- **Coste · Riesgo · Reversibilidad:** ...
- **Perspectivas:** arquitectura {...}, negocio {...}, seguridad {...}, ...

### Alternativa B — {nombre}   ❌ descartada
- ... (misma ficha)
- **Razón del descarte:** {...}

## Decisión
{Qué se eligió y por qué. Disensos del panel, si los hubo.}

## Consecuencias
{Qué cambia aguas abajo. Qué requisitos o ADRs quedan afectados.}
```

---

