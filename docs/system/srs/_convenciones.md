# SRS — System Requirements Specification

## Propósito

Documentar **qué** debe hacer el sistema a nivel funcional y no funcional. Los requisitos se agrupan por área funcional del negocio, sin conocer cómo se implementan internamente.

## Estructura esperada

```
docs/system/srs/
  README.md              ← este fichero (convenciones)
  glosario.md            ← términos y acrónimos del proyecto
  {area-funcional}.md    ← un fichero por área (ej: gestion-remota.md, comunicaciones.md)
  restricciones.md       ← NFR que afectan a todo el sistema (rendimiento, portabilidad, HW)
```

Los nombres de los ficheros dependen del proyecto. Cada fichero agrupa todos los requisitos de esa área funcional.

## Formato de requisito

```markdown
### REQ-SYS-{TIPO}-{AREA}-{NNN} — Título corto
- **Declaración:** El sistema deberá...
- **Criterio de aceptación:** [medible y verificable]
- **Origen:** [sección PDF, conversación, ticket, código]
```

### Tipos de requisito

| Prefijo | Tipo |
|---|---|
| `FUNC` | Funcional |
| `NFR` | No funcional |
| `CON` | Restricción / constraint |

### Reglas de redacción

- Siempre "El sistema deberá..."
- Un requisito = una obligación verificable
- No mezclar el qué con el cómo — sin detalles de implementación
- Sin ambigüedades: nada de "rápido", "robusto", "adecuado" sin medida
- Si falta información, marcar **TBD**
- Los NFR que afectan a un área concreta van en el fichero de esa área
- Los NFR transversales van en `restricciones.md`

## Relación con otros documentos

- **← Fuente:** Conversaciones de cliente, documentación fuente (vía `extracted/`), código existente
- **→ Alimenta:** SAD (arquitectura), SSRS (requisitos de subsistema)
