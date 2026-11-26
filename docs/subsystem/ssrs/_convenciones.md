# SSRS — Subsystem Requirements Specification

## Propósito

Descomponer los requisitos de sistema (SRS) en requisitos específicos de cada subsistema. Es el último nivel de abstracción antes del diseño — no usa nombres de variables, interfaces concretas ni detalles de implementación.

## Estructura esperada

```
docs/subsystem/ssrs/{subsistema}/
  README.md              ← este fichero (convenciones)
  requisitos.md          ← todos los requisitos del subsistema
```

Un directorio por subsistema. El nombre del subsistema viene del SAD.

## Formato de requisito

```markdown
### REQ-SS-{SS}-{TIPO}-{NNN} — Título corto
- **Declaración:** El subsistema deberá...
- **Criterio de aceptación:** [más específico que el padre SRS]
- **Origen:** Derivado de REQ-SYS-{...}
```

### Reglas de redacción

- Siempre "El subsistema deberá..."
- Más específico que el SRS padre, pero sin detalles de implementación
- Cada requisito SRS asignado a este subsistema (vía SAD) debe tener al menos un hijo SSRS
- Si el SRS padre deja algo sin cerrar, marcar **TBD**

## Relación con otros documentos

- **← Fuente:** SRS (requisitos padre), SAD (asignación a subsistema)
- **→ Alimenta:** SSD (diseño del subsistema)
