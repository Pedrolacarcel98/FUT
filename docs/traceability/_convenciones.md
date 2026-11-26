# RTM — Requirements Traceability Matrix

## Propósito

Verificar que cada requisito de sistema tiene cobertura completa a lo largo de toda la cadena documental: SRS → SAD → SSRS → SSD → SWDD → código. Detectar gaps, duplicados e inconsistencias.

## Estructura esperada

```
docs/traceability/
  rtm.md                 ← matriz de trazabilidad
```

## Formato de la RTM

```markdown
# Requirements Traceability Matrix

## Resumen

| Métrica | Valor |
|---|---|
| Total REQ-SYS-* | N |
| Con cobertura completa | N (X%) |
| Con cobertura parcial | N (X%) |
| Sin cobertura | N (X%) |

## Cadena de trazabilidad

| REQ-SYS-* | SAD | REQ-SS-* | SSD | SWDD | Código |
|---|---|---|---|---|---|
| REQ-SYS-FUNC-STOR-001 | sad/{componente}.md | REQ-SS-STOR-FUNC-001 | ssd/{subsistema}/components/… | swdd/{modulo}/services/… | ✓ |

## Gaps detectados
...

## Duplicados candidatos
...

## Divergencias código vs documentación
...
```

## Quién lo genera

El `validation-agent` genera y actualiza este fichero. No se mantiene manualmente.

## Relación con otros documentos

- **← Fuente:** Todos los documentos de todos los niveles + código
- **→ Alimenta:** Decisiones de priorización, detección de deuda técnica
