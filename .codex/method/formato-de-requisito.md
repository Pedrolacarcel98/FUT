<!-- GENERADO por .ai/scripts/sync.py (target Codex) desde las fuentes del submódulo. No editar: los cambios van al submódulo. -->
## Formato de requisito

Dentro de un fichero SRS (ej: `almacenamiento-datos.md`):

```markdown
# Almacenamiento de datos

Breve contexto del área funcional.

## Requisitos funcionales

### REQ-SYS-FUNC-STOR-001 — Almacenamiento dual
- **Declaración:** El sistema deberá soportar almacenamiento en SQLite (lectura/escritura) y JSON (solo lectura).
- **Criterio de aceptación:** Datos escritos en SQLite son consultables; documentos JSON son accesibles en solo lectura.
- **Origen:** S04 p.18

### REQ-SYS-FUNC-STOR-002 — Acceso concurrente
- **Declaración:** El sistema deberá permitir lecturas simultáneas y escrituras exclusivas.
- **Criterio de aceptación:** Múltiples módulos leen en paralelo sin bloqueo; las escrituras se serializan.
- **Origen:** S04 p.19

## Requisitos no funcionales

### REQ-SYS-NFR-PERF-001 — Rendimiento de lectura
...
```

**Campos obligatorios por requisito:**
- **Declaración** — "El sistema deberá..." (SRS), "El subsistema deberá..." (SSRS), "El módulo deberá..." (SWDD)
- **Criterio de aceptación** — medible y verificable
- **Origen** — de dónde viene (sección PDF, conversación, código)

**Convención de IDs:**

| Nivel | Patrón | Ejemplo |
|---|---|---|
| Sistema | `REQ-SYS-{TIPO}-{AREA}-{NNN}` | `REQ-SYS-FUNC-STOR-001` |
| Subsistema | `REQ-SS-{SS}-{TIPO}-{NNN}` | `REQ-SS-STOR-FUNC-001` |

---

