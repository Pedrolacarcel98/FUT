---
name: assess-roadmap
description: "Organiza las tareas técnicas de una propuesta entrante en incrementos de valor por sprint (walking skeleton → completo), manteniendo la granularidad de las tareas y ordenando por valor + dependencias. Genera roadmap.md con banda agregada por incremento."
---
<!-- GENERADO por .ai/scripts/sync.py (target Codex) desde las fuentes del submódulo. No editar: los cambios van al submódulo. -->

> **Argumento:** lo que el usuario escribió al invocar la skill (`$assess-roadmap <slug de la tarea>`).
> Si no lo dio, pídeselo antes de empezar.

Vas a **organizar en incrementos de valor** las tareas técnicas de la propuesta entrante:

**{argumento del usuario}**

Es la vista de entrega del banco de trabajo (ver `AGENTS.md` → *Desglose técnico y estimación*). Pre-canónico y **solo-lectura sobre la base**.

1. **Precondición**: deben existir tareas en `docs/assessments/{tarea}/tasks/TT-*.md` (idealmente ya estimadas, para heredar las bandas). Si no hay tareas, ejecuta `$assess-tasks {tarea}` primero; si no están estimadas, avisa de que las bandas por incremento saldrán vacías hasta correr `$assess-estimate`.

2. **Delega en `task-planner-agent` (modo roadmap)** (lánzalo como subagente). Encárgale generar `docs/assessments/{tarea}/roadmap.md`:
   - Asignar cada `TT` **entera** a un incremento (no re-trocea; respeta la granularidad).
   - **Incremento 1 = esqueleto que funciona** (subconjunto mínimo con flujo end-to-end operativo aunque incompleto); cada incremento posterior añade valor sobre algo que ya funciona, hasta el desarrollo completo.
   - Ordenar por **valor entregable + dependencias** (`depends_on`): ninguna tarea antes que sus dependencias.
   - Por incremento: objetivo de valor, qué funciona, qué falta aún (y dónde llega), tareas incluidas, dependencias satisfechas, y **banda agregada** (suma de bandas del frontmatter `estimacion`, jornadas-persona) + confianza.
   - Incluir un **diagrama Mermaid** del orden y dependencias entre tareas por incremento.
   - Incrementos **lógicos, sin duración fija**: el usuario decide sprints/personas.

3. **Presenta**: la secuencia de incrementos (nombre · valor · tareas · banda agregada), destacando qué entrega el Incremento 1 (lo mínimo que funciona) y qué característica añade cada incremento siguiente. Recuerda que si se reestima o revisa una tarea, hay que regenerar el roadmap.
