<!-- GENERADO por .ai/scripts/sync.py (target Codex) desde las fuentes del submódulo. No editar: los cambios van al submódulo. -->
## Estructura de ficheros

```
docs/
  system/
    srs/
      README.md                    # Convenciones del SRS
      glosario.md                  # Términos y acrónimos
      {area-funcional}/            # Una carpeta por área (ej: gestion-datos/)
        _index.md                  # GENERADO — intro del área + tabla ID→resumen→enlaces
        {REQ-ID}.md                # Un átomo por requisito (ej: REQ-SYS-FUNC-STOR-001.md)
    sad/
      README.md                    # Convenciones del SAD
      vision-general.md            # Arquitectura de alto nivel, roles, taxonomía
      {modulo-1}.md                # Descomposición por módulo
      {modulo-2}.md
      integracion.md               # Cómo se comunican los módulos (interfaces alto nivel)
      despliegue.md                # Contenedores, redes, configuración
      decisiones.md                # Decisiones arquitectónicas (formato ADR ligero)
  subsystem/
    ssrs/
      {subsistema}/
        _index.md                  # GENERADO — tabla de átomos del subsistema
        {REQ-ID}.md                # Un átomo por requisito (ej: REQ-SS-CDB-FUNC-STOR-001.md)
    ssd/
      {subsistema}/
        _index.md                  # GENERADO — tabla de átomos del subsistema
        components/{comp}.md       # OBLIGATORIO — Átomos de arquitectura/diseño interno
        data/{entidad}.md          # OBLIGATORIO — Átomos de modelo de datos
        interfaces/{iface}.md      # OBLIGATORIO — Átomos de interfaces entre componentes
  software/
    swdd/
      {modulo}/
        _index.md                  # GENERADO — tabla de átomos del módulo
        domain/{Tipo}.md           # OBLIGATORIO — Un átomo por struct/interfaz/constante
        services/{Servicio}.md     # OBLIGATORIO — Átomos de lógica de negocio
        handlers/{Handler}.md      # OBLIGATORIO — Átomos de API expuesta (gRPC, TCP, REST)
  system/
    icd/
      README.md                    # Convenciones del ICD
      {familia-codigos-1}.md       # Códigos/NACKs de una familia (ej: por protocolo)
      {familia-codigos-2}.md       # Otra familia de códigos de referencia
  traceability/
    rtm.md                         # GENERADO — recorriendo parent/children de los átomos
  decisions/                       # ADRs transversales — una decisión por fichero
    ADR-001-{slug}.md              # Alternativas evaluadas, elegida + descartadas + razón
    ADR-002-{slug}.md
  inputs/
    raw/                           # Fuentes originales intactas
      {documento}.pdf
    index/                         # Índices/manifiestos de las fuentes
      sources.md                   # Catálogo de inputs (PDF, código)
      section-index.json           # Índice de secciones del PDF
      pdf-section-index.md         # Índice legible de secciones del PDF
      code-inventory.md            # Inventario de módulos de código
    extracted/                     # Capa intermedia: texto limpio
      pdf/s{NN}-{nombre}.md        # Sección extraída del PDF
      code/code-{modulo}.md        # Módulo de código extraído
    incoming/                      # Bandeja de entrada de tareas del cliente
      {tarea}/
        {original}.md|pdf          # Lo que deja el cliente (ticket, doc o PDF)
        brief.md                   # GENERADO por $intake — núcleo digerible
    doc-specs/                     # Estructuras de documento para doc-generator
  generated/                       # Entregables formales generados bajo demanda
    _assets/                       # Plantillas (typst), logos, bibliografía
    {documento}/                   # Una carpeta por documento
      progreso.md                  # Progreso de generación de ESTE documento
      parts/seccion-NN-*.md        # Secciones markdown (fuente del entregable)
      build/                       # Artefactos: .typ versionado, .pdf NO (gitignore)
        typst/seccion-NN-*.typ
        {documento}.{typ,pdf}
  proposals/                       # Propuestas cliente-facing (pre-canónicas, vivas)
    {tarea}/
      propuesta.md                 # Resumen, alcance, alternativas, solución hasta SSD, estimación
  assessments/                     # Evaluaciones de propuestas ENTRANTES de cliente (pre-canónicas)
    {tarea}/
      analisis.md                  # GENERADO por $assess — auditoría crítica (hallazgos por categoría)
      estimacion.md                # GENERADO por $assess-estimate — bandas jornadas-persona, agregado desde tareas
      roadmap.md                   # GENERADO por $assess-roadmap — incrementos de valor por sprint (walking skeleton→completo)
      tasks/                       # GENERADO por $assess-tasks — desglose técnico (nivel SWDD) por capacidad
        _index.md                  # GENERADO — tabla id→título→capacidad→estado→banda→confianza
        TT-{NNN}-{slug}.md         # Tarea técnica explicativa: contexto funcional + arquitectura + ejemplos SWDD (pseudocódigo)
  research/                        # Investigaciones técnicas VIVAS previas a una decisión (pre-canónicas)
    {tema}/
      investigacion.md             # GENERADO por $research — pregunta raíz, mapa de preguntas abiertas (estado+confianza), alternativas, veredicto provisional, bitácora
      spikes/                      # GENERADO por $research-spikes — experimentos a ejecutar
        RT-{NNN}-{slug}.md         # Spike: objetivo, método, entregable esperado, criterio de concluyente
      evidencia/                   # GENERADO por $research-log — evidencia acumulada y fechada
        EV-{NNN}-{slug}.md         # Evidencia: fuente, método, resultado, interpretación, efecto en las preguntas
      _index.md                    # GENERADO — preguntas→estado→confianza · evidencia→pregunta · spikes→estado
```

Cada nivel documenta sus reglas en **dos ficheros**, y la separación no es cosmética: uno es del método y el otro del proyecto.

| Fichero | Qué contiene | Quién lo mantiene |
|---|---|---|
| `_convenciones.md` | Las **convenciones del método** para ese nivel: estructura esperada, formato, campos obligatorios, patrones de ID | **GENERADO** — lo sirve el sistema. No se edita: los cambios van al sistema y los reciben todos los proyectos |
| `README.md` | La **instancia**: los nombres reales de áreas/subsistemas/módulos de este proyecto, su taxonomía, y los desvíos deliberados de las convenciones con su motivo | El proyecto. Se versiona |

Aplica a los siete niveles: `docs/system/srs/`, `docs/system/sad/`, `docs/system/icd/`, `docs/subsystem/ssrs/`, `docs/subsystem/ssd/`, `docs/software/swdd/` y `docs/traceability/`.

**Todo agente lee LOS DOS antes de generar contenido** en un nivel: `_convenciones.md` para el *cómo* y `README.md` para la *instancia*. Si se contradicen, manda `README.md` — es una decisión explícita del proyecto — pero el agente debe señalarlo.

---

