# Documentación técnica para desarrollo con IA

## Principios

1. **Docs = contexto para IA + referencia para humanos.** No son entregables formales. La documentación formal se genera bajo demanda con `doc-generator-agent`.
2. **Sin información innecesaria, pero metadatos de navegación sí.** No document-control, no purpose-and-scope separados. El **único** frontmatter permitido es un esquema fijo y mínimo de navegación (`id`, `summary`, `parent`, `children`, `related`, `origin`), necesario para que modelos con poco contexto naveguen entre átomos. Nada de YAML libre ni campos fuera de ese esquema. Ver *Atomicidad y navegación*.
3. **Agrupar por contexto funcional.** Un fichero por área funcional (no uno por requisito). El nombre depende del proyecto.
4. **Código = verdad, docs = intención.** Cuando hay divergencia, el código prevalece. Las divergencias se documentan.
5. **SWDD obligatorio antes de implementar.** Siempre debe haber diseño detallado antes de tocar código.
6. **Cambios se propagan nivel a nivel con confirmación humana.** Cada nivel se revisa y aprueba antes de pasar al siguiente.
7. **El registro de `.babel-config.json` se genera, no se mantiene.** Las listas `agents`, `commands` y `scripts` se **derivan** de los ficheros reales con `scripts/gen_registry.py`: del frontmatter de cada agente/comando y del docstring de cada script. Al crear o eliminar uno, lo que hay que hacer es **poner su frontmatter o docstring en condiciones** y regenerar. Un agente sin `name`/`description` en el frontmatter **no lo registra el harness y no es invocable**, así que el generador falla ruidosamente en vez de dejarlo pasar. Lo que sí se mantiene a mano en ese fichero es la **instancia**: `typology`, `display_name`, `version`, `doc_folder`, `axes`.
8. **Actualizar `project-status.json` siempre.** Al completar cualquier paso del flujo (extracción, generación de SRS, SAD, SSRS, SSD, SWDD), actualizar `project-status.json` en el mismo paso para que refleje el estado real.
9. **Atomicidad: un átomo por fichero.** Cada unidad lógica (un requisito, un tipo/interfaz, un componente de diseño) vive en su propio `.md`. Los antiguos ficheros agregados pasan a ser **carpetas de átomos** con un `_index.md` generado. SSD: carpetas `components/`, `data/`, `interfaces/`. SWDD: carpetas `domain/`, `services/`, `handlers/`. Cada carpeta tiene su `_index.md`. No se omite ningún átomo aunque su contenido sea breve.
10. **Consultar el SAD antes de crear SSRS/SSD/SWDD.** Antes de asignar una sección a un subsistema, verificar en el SAD (`vision-general.md`) a qué **categoría de la taxonomía del proyecto** pertenece el componente. El SAD es la fuente de verdad de esa taxonomía; este fichero no la fija. Cada categoría tiene su propio subsistema en SSRS/SSD. No mezclar componentes independientes dentro del SSRS/SSD de otro.
11. **Las decisiones son conocimiento.** Toda elección entre alternativas funcionales o técnicas se registra como ADR en `docs/decisions/` **antes** de propagarse a los documentos de nivel. Las alternativas descartadas y la razón del descarte se conservan — son tan valiosas como la elegida.
12. **Método genérico, instancia configurable.** Este fichero describe un método válido para cualquier proyecto. Lo específico (taxonomía, rutas, modos, claves externas) no se hardcodea aquí: se resuelve desde su fuente de verdad. Cualquier nombre concreto de módulo, ruta o clave que aparezca en este documento es **solo un ejemplo ilustrativo**, nunca normativo. Ver *Método genérico vs instancia del proyecto*.

---

## Método genérico vs instancia del proyecto

Este documento describe un **método** de generación de conocimiento, no la configuración de un proyecto concreto. Lo específico de cada proyecto (su taxonomía de componentes, sus rutas no estándar, sus modos de operación, sus claves de sistemas externos) **no se hardcodea aquí**: se resuelve leyendo la fuente de verdad que le corresponde.

| Qué es específico del proyecto | Fuente de verdad | Quién lo consume |
|---|---|---|
| Taxonomía de componentes (categorías de módulos/subsistemas) | SAD — `docs/system/sad/vision-general.md` | capture-agent, design-agent, decision-agent |
| Tipología, carpeta de docs, ejes del proyecto | `.babel-config.json` (campos de instancia, a mano) | tooling, orquestador |
| Registro de agentes, comandos y scripts | `.babel-config.json` (secciones **generadas** por `scripts/gen_registry.py` desde los ficheros reales) | tooling, orquestador |
| Repo de código (tipo y ubicación) | `project-status.json` → `config.code_repo` | task-generator-agent |
| Modo de generación de tareas y claves externas (Jira…) | `project-status.json` → `config.task_generator_mode`, `config.jira` | task-generator-agent |
| Estado y progreso del proyecto | `project-status.json` | todos |
| Panel de lentes expertas disponibles (`expert-*`) | `.claude/agents/expert-*.md` (el registro de `.babel-config.json` se deriva de ahí) | decision-agent, assessment-agent, research-agent |
| Stack tecnológico (lenguaje, RPC, persistencia, plataforma) | SAD + `project-status.json` → `inputs.code` | panel de expertos, task-generator-agent |

**Regla:** si una instrucción de este fichero necesita un nombre concreto de módulo, subsistema, ruta o clave, es señal de que debe sustituirse por una referencia a su fuente de verdad. Los agentes resuelven la instancia en tiempo de ejecución leyendo esas fuentes, nunca asumiendo nombres fijos.

**Corolario para el panel de expertos:** las lentes de *stack* (lenguaje, framework de RPC, motor de persistencia, plataforma de despliegue) son **específicas del proyecto**. Al instanciar el método se sustituyen por las que correspondan al stack real. Las lentes **transversales** (arquitectura, seguridad, rendimiento, datos) valen para cualquier proyecto.

---

## Jerarquía documental

```
SRS ──► SAD ──► SSRS ──► SSD ──► SWDD ──► CÓDIGO
 │                                           │
 └──────────── RTM (trazabilidad) ───────────┘
```

| Nivel | Documento | Qué contiene | Quién lo consume |
|---|---|---|---|
| Sistema | **SRS** | Qué debe hacer el sistema. Requisitos funcionales y NFR agrupados por área funcional del negocio. No conoce la implementación interna. | capture-agent, design-agent |
| Sistema | **SAD** | Cómo se organiza el sistema. Módulos, interfaces de alto nivel, datos, integración, despliegue, decisiones de arquitectura. | design-agent |
| Subsistema | **SSRS** | Requisitos descompuestos por subsistema. Último nivel abstracto (no usa nombres de variables, interfaces concretas, etc.) | design-agent |
| Subsistema | **SSD** | Diseño interno del subsistema. Arquitectura de capas, modelo de datos, interfaces entre componentes. | design-agent |
| Software | **SWDD** | Diseño detallado para implementar. Structs, funciones, interfaces concretas, algoritmos. Incluye detalle de interfaz que el SAD solo menciona a alto nivel. | task-generator-agent, quien implementa en el repo de código |
| Sistema | **ICD** | Tablas de referencia de códigos de error y protocolo (NACKs, códigos de estado). Datos de referencia consumidos por múltiples módulos. | design-agent |
| Transversal | **RTM** | Trazabilidad de requisitos. Cadena SRS → SAD → SSRS → SSD → SWDD → código. Detecta gaps y requisitos huérfanos. | validation-agent |

---

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
        brief.md                   # GENERADO por /intake — núcleo digerible
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
      analisis.md                  # GENERADO por /assess — auditoría crítica (hallazgos por categoría)
      estimacion.md                # GENERADO por /assess-estimate — bandas jornadas-persona, agregado desde tareas
      roadmap.md                   # GENERADO por /assess-roadmap — incrementos de valor por sprint (walking skeleton→completo)
      tasks/                       # GENERADO por /assess-tasks — desglose técnico (nivel SWDD) por capacidad
        _index.md                  # GENERADO — tabla id→título→capacidad→estado→banda→confianza
        TT-{NNN}-{slug}.md         # Tarea técnica explicativa: contexto funcional + arquitectura + ejemplos SWDD (pseudocódigo)
  research/                        # Investigaciones técnicas VIVAS previas a una decisión (pre-canónicas)
    {tema}/
      investigacion.md             # GENERADO por /research — pregunta raíz, mapa de preguntas abiertas (estado+confianza), alternativas, veredicto provisional, bitácora
      spikes/                      # GENERADO por /research-spikes — experimentos a ejecutar
        RT-{NNN}-{slug}.md         # Spike: objetivo, método, entregable esperado, criterio de concluyente
      evidencia/                   # GENERADO por /research-log — evidencia acumulada y fechada
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

## Atomicidad y navegación

La documentación de nivel se organiza en **átomos**: un fichero `.md` por unidad lógica (un requisito, un tipo/interfaz, un componente de diseño). Así un modelo con poco contexto carga solo lo que necesita. Tres piezas obligatorias:

**1. Frontmatter mínimo por átomo** (esquema fijo — el único frontmatter permitido, ver Principio #2):

```markdown
---
id: REQ-SYS-FUNC-STOR-001
summary: Almacenamiento dual SQLite (RW) + JSON (RO)
parent: []                                # IDs del nivel superior de los que deriva
children: [REQ-SS-CDB-FUNC-STOR-001]      # IDs del nivel inferior que lo desarrollan
related: []                               # IDs del mismo nivel relacionados
origin: S04 p.18                          # fuente (sección PDF, código, conversación)
---
# REQ-SYS-FUNC-STOR-001 — Almacenamiento dual
- **Declaración:** ...
- **Criterio de aceptación:** ...
```

**2. Índice por carpeta (`_index.md`, GENERADO).** Lo que un modelo carga primero —barato— para decidir qué átomo abrir. No se edita a mano; se regenera desde los frontmatter:

```markdown
# Índice — {nivel} / {área|subsistema|módulo}

{intro breve del área}

| ID | Resumen | Grupo | Hijos |
|----|---------|-------|-------|
| REQ-SYS-FUNC-STOR-001 | Almacenamiento dual | FUNC-STOR | REQ-SS-CDB-FUNC-STOR-001 |
```

**3. El RTM se genera, no se mantiene a mano.** `traceability/rtm.md` se construye recorriendo los `parent`/`children` de todos los átomos. Un átomo sin `parent` (salvo en SRS) o sin `children` (salvo en SWDD) es un gap que el RTM señala.

**Regla de navegación para los agentes:** ante una consulta, cargar primero el `_index.md` de la carpeta relevante, seleccionar átomos por ID, cargar solo esos, y seguir `parent`/`children`/`related` para saltar de nivel. **Nunca cargar una carpeta entera.**

---

## Flujo bootstrap (documentar desde cero)

Cuando se parte de documentación existente (PDF, código) y no hay docs previos.

### Fase 1 — Inventario y extracción

**Objetivo:** convertir todas las fuentes en texto estructurado en `docs/inputs/extracted/`.

1. **Inventariar inputs:** listar PDFs en `docs/inputs/`, código en el repo de código (ubicación según `config.code_repo` de `project-status.json`)
2. **Indexar PDF:** `pdf-extraction-agent` genera `section-index.json` con secciones, páginas y dependencias
3. **Indexar código:** `code-inventory-agent` genera `code-index.json` con módulos, interfaces y protos
4. **Extraer todo:** para cada sección del PDF y cada módulo de código, generar su fichero en `extracted/`

**No se genera documentación en esta fase.** Solo se extrae y estructura la información.

### Fase 2 — Generación de documentación

**Objetivo:** sección por sección, generar la documentación en todos los niveles.

Para cada sección del `section-index.json`, en orden de dependencias:

```
Sección S{NN} "{Área funcional}" (p.XX-YY)
  │
  ├─ Fuentes: extracted/s{NN}-{area}.md + extracted/code-{modulo}.md
  │
  ├─ 1. capture-agent: genera/actualiza SRS (área funcional correspondiente)
  │    └─ Usuario revisa y confirma
  │
  ├─ 2. design-agent: genera/actualiza SAD (módulo correspondiente)
  │    └─ Usuario revisa y confirma
  │
  ├─ 3. design-agent: genera/actualiza SSRS del subsistema
  │    └─ Usuario revisa y confirma
  │
  ├─ 4. design-agent: genera/actualiza SSD del subsistema
  │    └─ Usuario revisa y confirma
  │
  ├─ 5. design-agent: genera/actualiza SWDD del módulo
  │    └─ Usuario revisa y confirma
  │
  └─ Siguiente sección
```

**Regla:** en cada nivel, el agente lee el `extracted/` (PDF + código) y los niveles anteriores ya generados. Siempre cruza PDF vs código y documenta divergencias.

---

## Modo evaluación de alternativas (gate de decisión)

Tercer modo de trabajo, junto a *documentar* y *proponer*. Se activa cuando un cambio —en cualquier nivel— implica una decisión no trivial con más de un camino razonable. Su función es **separar decidir de propagar**: nada se escribe en los documentos de nivel (SRS/SAD/SSRS/SSD/SWDD) hasta que la decisión está tomada y registrada como ADR.

**Cuándo se activa:**
- El usuario pide explícitamente comparar alternativas.
- El agente de nivel (`capture-agent` o `design-agent`) detecta ≥2 caminos viables y de impacto relevante (afecta a otros niveles, tiene coste/riesgo, o es difícil de revertir).

**Quién lo conduce:** el `decision-agent`. **No escribe documentación de nivel** — solo genera y compara alternativas, coordina un panel de perspectivas expertas, registra el ADR y devuelve el veredicto. Quien propaga la opción elegida sigue siendo `capture-agent` (funcional) o `design-agent` (técnico).

**Panel de perspectivas (sub-agentes transversales — registro extensible):**
El `decision-agent` evalúa cada alternativa desde varias perspectivas independientes. Cada perspectiva puede delegarse en un sub-agente experto si está definido; si no, el `decision-agent` la cubre él mismo (*inline*). El conjunto es **por proyecto** y se amplía según necesidad — el flujo funciona aunque hoy no exista ningún experto.

Las lentes se dividen en **transversales** (valen para cualquier proyecto) y **de stack** (se materializan con las tecnologías reales del proyecto — ver *Método genérico vs instancia*):

| Perspectiva | Sub-agente | Qué evalúa | Alcance |
|---|---|---|---|
| Arquitectura | `expert-architecture` | Encaje con el SAD (estilo arquitectónico declarado), dirección de dependencias, acoplamiento, límites de capa, reversibilidad | transversal |
| Seguridad | `expert-security` | Superficie de ataque, autenticación/autorización, seguridad del transporte, gestión de claves, anti-replay, validación de entrada | transversal |
| Rendimiento / recursos | `expert-performance` | Latencia, memoria/CPU, contención de concurrencia, coste operativo, bajo las restricciones de recursos del entorno de ejecución real | transversal |
| Datos / persistencia | `expert-data` | Esquema, motor de persistencia, concurrencia de acceso, transacciones, índices, migraciones, integridad | transversal |
| Plataforma / despliegue | `expert-platform` | Modelo de despliegue: atomicidad del deploy, rollback, health-checks de arranque, persistencia de estado entre actualizaciones, estrategia de actualización remota | transversal (parametrizado por plataforma) |
| Lenguaje / concurrencia | `expert-{lenguaje}` | Idiomática del lenguaje, modelo de concurrencia, manejo de errores, condiciones de carrera, testing | **de stack** |
| Contrato de interfaz | `expert-{rpc}` | Diseño de servicios, evolución y compatibilidad del contrato, versionado, errores, streaming, deadlines | **de stack** |

Al instanciar el método, las filas *de stack* se materializan con las tecnologías reales (p. ej. `expert-go` + `expert-grpc` en un proyecto Go/gRPC; `expert-typescript` + `expert-rest` en uno Node/REST). Si una perspectiva no tiene sub-agente definido, el `decision-agent` la cubre él mismo (*inline*).

El conocimiento de **dominio** no es un experto aparte: vive en los átomos (SRS/SSRS/SSD/SWDD) y cada experto técnico lo lee de ahí.

**Flujo:**

```
Punto de decisión (nivel N)
  │
  ├─ 1. decision-agent genera 2-4 alternativas (NO toca docs de nivel)
  │
  ├─ 2. Por cada alternativa, recoge las perspectivas del panel
  │     (delegando en sub-agentes expertos si existen) y arma una ficha comparable
  │
  ├─ 3. Presenta la comparativa al usuario:
  │       · Descripción
  │       · Impacto por nivel (hacia arriba / hacia abajo)
  │       · Pros / Contras
  │       · Coste · Riesgo · Reversibilidad
  │       · Recomendación del panel (señalando disensos si los hay)
  │
  ├─ 4. El usuario ELIGE (o pide refinar / añadir alternativas)
  │
  ├─ 5. decision-agent registra el ADR en docs/decisions/
  │     (elegida + descartadas + razón del descarte)
  │
  └─ 6. capture/design propaga SOLO la opción elegida, nivel a nivel
```

**Regla dura:** sin ADR registrado, no hay propagación. Las alternativas descartadas y su razón no se tiran nunca.

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

## Flujo operativo (día a día)

Cuando la documentación ya existe y llegan cambios.

### Captura de requisito nuevo o nueva especificación

```
1. Usuario describe el cambio (conversación, ticket, notas)
2. capture-agent pregunta al usuario todo lo que no quede claro
3. ¿Hay ≥2 caminos funcionales viables?
   ├─ Sí → capture-agent invoca al decision-agent (alternativas funcionales)
   │        → comparativa → usuario elige → ADR → se confirma el SRS
   └─ No → capture-agent redacta el SRS directamente → usuario confirma
4. design-agent propaga nivel a nivel. En cada nivel con ≥2 caminos técnicos
   relevantes, invoca al decision-agent (alternativas técnicas):
   ├─ SAD:  → gate de decisión cuando aplica → ADR → usuario confirma
   ├─ SSRS: → gate de decisión cuando aplica → ADR → usuario confirma
   ├─ SSD:  → gate de decisión cuando aplica → ADR → usuario confirma
   └─ SWDD: se genera desde la opción elegida (sin nuevo gate, salvo detalle crítico)
5. La implementación se ejecuta desde el SWDD, ya FUERA de este sistema:
   task-generator-agent traduce el diseño a tareas, y el desarrollo ocurre en
   el repo de código que declare project-status.json → config.code_repo
```

**Regla para nuevas especificaciones:** en los niveles SRS, SAD, SSRS y SSD, el agente debe identificar puntos de conflicto con la arquitectura actual. Cuando exista más de un camino viable, **no improvisa opciones en el chat**: delega en el `decision-agent` (ver *Modo evaluación de alternativas*), que produce la comparativa y registra el ADR. El usuario elige antes de avanzar al siguiente nivel. En el SWDD se aplica directamente la opción elegida.

### Cambio directo en cualquier nivel

Un cambio puede entrar en cualquier punto (SAD, SSRS, SSD, SWDD):

```
1. Usuario modifica directamente el documento
2. design-agent propaga HACIA ABAJO desde ese nivel:
   ├─ Cambio en SAD → propaga a SSRS → SSD → SWDD
   ├─ Cambio en SSRS → propaga a SSD → SWDD
   ├─ Cambio en SSD → propaga a SWDD
   └─ Cambio en SWDD → listo para implementar
3. En cada nivel: usuario confirma o edita antes de continuar
```

**Nota:** los cambios NO se propagan hacia arriba automáticamente. Si un cambio en SSD implica modificar el SRS, el agente lo señala pero no lo hace sin confirmación.

### Flujo de propuesta a cliente

Cuando el cliente deja una tarea (descripción corta) y hay que **proponer antes de tocar la base canónica**. La propuesta es **pre-canónica y viva**: cambia durante el desarrollo y solo al aprobarse se promueve. Llega hasta **nivel SSD** (no SWDD).

```
1. La tarea entra en docs/inputs/incoming/{tarea}/  (ticket, documento o PDF)
2. /intake {tarea}: triaje por tipo/tamaño (ticket → passthrough; documento
   extenso → condensa; PDF → pdf-extraction-agent → condensa)
   └─ intake-agent → incoming/{tarea}/brief.md (digerible)
3. /propose {tarea}: consume el brief (baja al original solo para el detalle)
   ├─ ACLARA: pregunta las dudas abiertas del brief (no asume) → usuario responde
   ├─ /decision: presenta y explica alternativas (panel → ADR) → usuario elige/aprueba
   └─ solo entonces proposal-agent redacta docs/proposals/{tarea}/propuesta.md
        (resumen ejecutivo, alcance, alternativas pros/contras, solución
         hasta SSD, estimación, riesgos, control de cambios) — documento vivo
   └─ /propose-revise {tarea}: correcciones iterativas (versiona + control de cambios)
4. [mes de desarrollo; la propuesta se corrige con /propose-revise]
5. Alcance aprobado → /promote {tarea}:
   ├─ /reconcile de los módulos (código = verdad)
   ├─ propaga a SRS/SAD/SSRS/SSD/SWDD (capture + design) + regenera RTM
   └─ /doc → especificación funcional formal (typst)
```

**Regla:** la propuesta llega hasta SSD; el **SWDD y el canónico** se materializan en `/promote`, reflejando lo construido + el alcance aprobado.

### Flujo de evaluación de propuesta entrante (cliente propone)

**Espejo del flujo de propuesta.** Aquí el sentido se invierte: **el cliente entrega una propuesta** (típicamente un PDF) y, antes de comprometer plazo alguno, hay que **auditarla con ojo crítico** contra la arquitectura actual y **estimar cuantificando la incertidumbre**. No es elaborar: es *evaluar*. Es **pre-canónico y solo-lectura** sobre la base — no toca SRS/SAD/SSRS/SSD/SWDD ni `docs/proposals/`; escribe en `docs/assessments/{tarea}/`.

```
1. La propuesta del cliente entra en docs/inputs/incoming/{tarea}/  (PDF)
2. /intake {tarea}: pdf-extraction-agent indexa+extrae por contexto → extracted/pdf/*
   └─ intake-agent → brief.md            (atomización + digerible)
3. /assess {tarea}:
   ├─ mapea la propuesta contra la base canónica (navega _index.md + SAD)
   ├─ convoca el PANEL DE EXPERTOS en MODO AUDITORÍA (no elige alternativa:
   │   caza el error) — cada expert-* devuelve indefiniciones · inconsistencias
   │   con la arquitectura (citando el átomo que rompe) · riesgos · preguntas
   ├─ assessment-agent redacta docs/assessments/{tarea}/analisis.md   (paso 4)
   │   (veredicto de viabilidad, mapa propuesta→arquitectura, hallazgos por
   │    categoría con origen · impacto · severidad · lente)
   ├─ GATE humano: el usuario revisa el análisis
   │   └─ /assess-qa {tarea} [+ preguntas]: bucle de Q&A sobre el análisis. Resuelve
   │      preguntas SOLO con las fuentes (extracted/ + base canónica + código),
   │      clasifica RESUELTA / PARCIAL / PARA EL CLIENTE (no inventa) y las anota de
   │      forma acumulativa y fechada en analisis.md (sección "Resolución de preguntas").
   └─ assessment-agent redacta docs/assessments/{tarea}/estimacion.md (paso 5)
       (bandas de incertidumbre optimista/probable/pesimista + desglose por
        módulo con reutiliza-vs-nuevo y dependencias; coste de la incertidumbre)
4. Documento vivo: si el cliente aclara dudas, se reejecuta /assess y las bandas
   se estrechan (o /assess-qa para resolver preguntas puntuales contra las fuentes).
   Si el alcance se aprueba y se decide construir, el puente hacia
   lo canónico es el flujo normal (/decision → /promote). Sin ADR no se propaga.
```

**Regla:** la estimación **no esconde la incertidumbre, la cuantifica**. Cada indefinición o inconsistencia del análisis ensancha la banda del módulo que toca; una propuesta poco definida da bandas anchas, y eso es un resultado honesto.

#### Desglose técnico y estimación (banco de trabajo)

Tras el gate humano sobre `analisis.md`, el flujo de evaluación se puede continuar con un **banco de trabajo vivo** que baja del "por módulo" al **por tarea técnica de nivel SWDD**, para estimar con la incertidumbre puesta encima de la mesa y poder iterar. Es pre-canónico y solo-lectura sobre la base; escribe en `docs/assessments/{tarea}/tasks/` y reformula `estimacion.md` como agregado **task-driven**.

```
analisis.md (revisado en el gate)
  │
  ├─ /assess-tasks {tarea}      → task-planner-agent desglosa en tareas TT por CAPACIDAD
  │    (docs/assessments/{tarea}/tasks/TT-*.md + _index.md; cada TT cita origin_propuesta y hallazgos)
  │    └─ GATE humano: revisar la lista de capacidades antes de estimar
  │
  ├─ /assess-estimate {tarea}   → assessment-agent (modo estimación) estima cada TT en
  │    JORNADAS-PERSONA (banda optimista/probable/pesimista + confianza) y regenera estimacion.md
  │    (agregado por capacidad y total; la incertidumbre de los hallazgos ensancha la banda)
  │
  ├─ /assess-task-add {tarea} "<tarea alto nivel>"   → inyecta una tarea del usuario: se analiza
  │    (mapea a capacidad/subsistema/hallazgos, marca lo NUEVO, convoca la lente del panel si abre
  │     terreno nuevo) y se estima. Actualiza _index y estimacion.md
  │
  ├─ /assess-task-revise {tarea} {TT-id} "<modificación>"   → modifica una tarea y la reestima;
  │    registra el delta antes→después en su changelog y reagrega estimacion.md
  │
  ├─ /assess-roadmap {tarea}     → organiza las tareas en INCREMENTOS DE VALOR por sprint
  │    (roadmap.md: Incremento 1 = esqueleto que funciona; cada incremento añade valor hasta el
  │     desarrollo completo; orden por valor+dependencias, banda agregada por incremento)
  │
  ├─ /assess-jira {tarea} [--push]   → exporta las tareas TT a Jira Cloud como issues bajo sus
  │    Epics existentes (script scripts/assess_to_jira.py; dry-run por defecto, push con credenciales)
  │
  └─ /assess-plan {carpeta-tasks}   → genera un bloque TSV para PEGAR en la hoja "Actividades" del Excel
       de plan/, con la Clave enlazada a Jira y Horas/Puntos = probable × 8 (scripts/plan_from_jira.py)
```

**Planificación en Excel** (`/assess-plan`): el script `scripts/plan_from_jira.py` (solo stdlib) lee los `TT-*.md` de la carpeta indicada, toma su `jira_key` (exige haber hecho antes `/assess-jira --push`), **lee la cabecera de la hoja "Actividades" con zipfile (solo lectura)** y emite un **bloque TSV** en `plan/<slug>-actividades-paste.tsv` (gitignored): **Clave de incidencia** como fórmula de hipervínculo (función y separador de `config.plan`: `HIPERVINCULO`/`;` en Excel ES, `HYPERLINK`/`,` en EN), Resumen, Componentes (`config.jira.components`), Etiquetas y Horas/Puntos = *probable* × `story_points_hours_per_day`. **NO escribe el `.xlsx`**: `openpyxl` al guardar **rompe las tablas y las fórmulas** del libro (comprobado), así que el usuario **pega** el bloque en la primera fila libre de la columna A y Excel extiende la tabla preservando todo.

**Export a Jira** (`/assess-jira`): el script `scripts/assess_to_jira.py` (solo stdlib) mapea cada `TT-*.md` a un issue Jira Cloud (API v3, descripción en ADF) bajo su **Epic existente** según `project-status.json → config.jira` (`epic_default` + `epic_overrides`; `"__transversal__"` = sin Epic). Story Points = `probable` de la banda (si `story_points_field` está configurado); la banda completa va siempre en la descripción; `depends_on` → enlaces "blocks". Dry-run por defecto (payloads en `docs/assessments/{tarea}/build/jira/`, gitignored); `--push` crea/actualiza (idempotente vía `jira_key` en el frontmatter del TT) con credenciales `JIRA_EMAIL`/`JIRA_API_TOKEN` (nunca hardcodeadas). Exportar es pre-canónico: **no** promueve nada a la base.

- **Tareas explicativas**: cada `TT` se redacta para que se entienda sin haber visto la propuesta — **contexto funcional**, **arquitectura y encaje** (con diagrama Mermaid cuando ayude) y **ejemplos SWDD en pseudocódigo o en el lenguaje del proyecto** (ilustrativo y no vinculante; la decisión final es del canónico vía `/decision`→`/promote`).
- **Granularidad por capacidad** (~12-20 tareas para un subsistema), no una tarea por átomo SWDD. Cada `TT` es una unidad de trabajo coherente que puede referir varios átomos de la propuesta.
- **Incrementos de valor**: el roadmap agrupa las tareas (sin cambiar su granularidad: cada `TT` va entera a un incremento) en entregas ordenadas por valor y dependencias. Incrementos **lógicos, sin duración fija**; cada uno lleva su banda agregada y el usuario decide cuántos sprints/personas le pone.
- **Modelo de estimación**: jornadas-persona en bandas + nivel de confianza. El esfuerzo base sale del eje *reutiliza vs nuevo* contra el canónico; cada hallazgo de `analisis.md` ligado a la tarea (severidad alta/media) **ensancha la banda y baja la confianza**. Nunca un número único.
- **Documento vivo**: resolver preguntas (`/assess-qa`) o revisar tareas (`/assess-task-revise`) estrecha las bandas.
- **Puente a canónico**: si el alcance se aprueba y se decide construir, las `TT` son **semilla** de las tasks canónicas/Atlas, pero **no las sustituyen**. El puente sigue siendo `/decision` (alternativas técnicas → ADR) → `/promote`. **Sin ADR no se propaga nada.**

### Flujo de investigación previa a la decisión (research)

Cuarto modo de trabajo — junto a *documentar*, *proponer*, *evaluar* y *evaluación de alternativas*. Se activa cuando una decisión **depende de evidencia que hoy no se tiene**: mediciones en el hardware real, un spike de una tecnología que nadie ha usado, la verificación de un supuesto contra el código. En vez de decidir sobre extrapolaciones, se **investiga primero** con un workbench **vivo** que reúne evidencia hasta que la decisión pueda tomarse con fundamento. Es **pre-canónico y solo-lectura sobre la base** — escribe en `docs/research/{tema}/`, no toca SRS/SAD/SSRS/SSD/SWDD, `docs/proposals/` ni `docs/assessments/`.

Se intercala **antes del gate de decisión** y lo alimenta:

```
/intake → [ /research → /research-spikes → /research-log* → /research-review ] → /research-close → /decision (ADR) → /propose|/design → /promote
```

```
Necesidad de decidir, pero faltan datos
  │
  ├─ /research {tema}        → research-agent define la pregunta raíz y, con el PANEL (modo investigación),
  │    mapea las preguntas abiertas Q-* por lente (qué hay que medir/verificar). Crea investigacion.md.
  │    └─ GATE humano: revisar el mapa de preguntas antes de planificar
  │
  ├─ /research-spikes {tema} → task-planner-agent desglosa las preguntas en spikes RT-* (qué construir/medir,
  │    entregable esperado, criterio de concluyente). GATE humano.
  │
  ├─ /research-log {tema} "<evidencia>"   → CORAZÓN VIVO: registra evidencia (resultado de spike, medición,
  │    fuente nueva vía /intake) como EV-*, actualiza estado/confianza de las Q-* que toca, reinterpreta con
  │    la lente del panel pertinente, reactualiza el veredicto provisional. Acumulativo y fechado. Se repite.
  │
  ├─ /research-review {tema}  → el panel revisa la foto entera (qué queda abierto, qué falta) y assessment-agent
  │    cuantifica el coste de la incertidumbre. Marca lista-para-decidir si no quedan P1 abiertas. GATE humano.
  │
  └─ /research-close {tema}   → comprueba confianza suficiente (si faltan P1, NO cierra) y hace de puente a
       /decision con las alternativas + la evidencia consolidada → ADR → /propose|/design.
```

**Reutilización (no se duplica maquinaria):** el **panel `expert-*`** enmarca las preguntas e **interpreta** la evidencia; **`task-planner-agent`** (modo spikes) descompone en experimentos `RT-*`; **`intake`** trae cada fuente/medición nueva; **`assessment-agent`** (modo incertidumbre) cuantifica el coste de lo que falta; **`decision-agent`** decide al final. El `research-agent` es el **dueño del workbench**: mantiene el estado vivo (preguntas, confianza, bitácora) y sintetiza.

**Reglas duras:** la investigación es un **documento vivo** (evidencia acumulativa y fechada, nunca se reescribe el histórico); se distingue siempre **medido / estimado / asumido**; lo no verificado es una **pregunta abierta**, no un supuesto; **sin evidencia suficiente no se decide** y **sin ADR no se propaga**. La investigación no termina en un plazo fijo, sino cuando hay **confianza suficiente** (o cuando se concluye que la incertidumbre es irreducible — y eso también es un resultado).

### Reconciliación código → documentación

Cuando el código implementado diverge de lo definido en SWDD/SSD/SSRS/SAD (por decisiones tomadas durante el desarrollo, limitaciones técnicas descubiertas, o mejoras oportunistas):

```
1. Usuario solicita reconciliación (o el agente la detecta al leer código)
2. design-agent compara el código actual contra el SWDD del módulo:
   ├─ Identifica divergencias: qué cambió, qué se añadió, qué se eliminó
   └─ Presenta un informe de divergencias al usuario
3. Para cada divergencia, el usuario decide:
   ├─ Aceptar: el código es correcto → propagar cambio HACIA ARRIBA en docs
   ├─ Rechazar: la doc es correcta → el código debe corregirse (no se toca doc)
   └─ Parcial: parte del cambio se acepta, parte se rechaza
4. Para las divergencias aceptadas, se propaga HACIA ARRIBA nivel a nivel:
   ├─ SWDD: se actualiza para reflejar el código real
   ├─ SSD: si el cambio afecta a diseño → se actualiza (usuario confirma)
   ├─ SSRS: si el cambio afecta a requisitos del subsistema → se actualiza (usuario confirma)
   ├─ SAD: si el cambio afecta a arquitectura → se actualiza (usuario confirma)
   └─ SRS: solo si el cambio contradice un requisito de sistema (raro, requiere confirmación explícita)
5. En cada nivel hacia arriba: el agente muestra qué cambiaría y el usuario confirma
```

**Cuándo ejecutar este flujo:**
- Tras completar una implementación, antes de cerrar la tarea
- Cuando se detecta que el código ha evolucionado sin actualizar la doc
- Periódicamente como auditoría de coherencia código-documentación

### Generación de documentación formal

Bajo demanda del usuario, el `doc-generator-agent` genera documentos formales en `docs/generated/` a partir de la documentación de referencia interna (SRS, SAD, SSRS, SSD, SWDD, ICD).

**Requisito obligatorio:** el usuario debe proporcionar una **estructura de documento** con los apartados y las instrucciones de redacción de cada sección. Sin estructura, el agente no genera nada.

```
1. Usuario proporciona:
   ├─ Tipo de documento (funcional, interfaces, técnico, etc.)
   ├─ Estructura con apartados numerados
   └─ Instrucciones por sección (qué incluir, nivel de detalle, audiencia)

2. doc-generator-agent analiza la estructura:
   ├─ Para cada sección, identifica qué fuentes internas necesita
   │   (SRS, SAD, SSRS, SSD, SWDD, ICD, código)
   └─ Pregunta al usuario si hay ambigüedades o secciones sin fuente clara

3. doc-generator-agent genera el documento:
   ├─ Lee las fuentes identificadas por sección
   ├─ Redacta cada sección según las instrucciones del usuario
   ├─ Genera diagramas Mermaid donde proceda
   └─ Escribe el resultado en docs/generated/{nombre-documento}.md

4. Usuario revisa el .md generado
   ├─ Puede pedir correcciones o ajustes por sección
   └─ Cuando esté conforme, puede convertir a PDF con Pandoc
```

**Tipos de documento habituales:**

| Tipo | Fuentes principales | Audiencia típica |
|------|-------------------|-----------------|
| Documento funcional | SRS, SSRS | Cliente, gestión |
| Documento de arquitectura | SAD, SSD | Equipo técnico, arquitectos |
| Documento de interfaces (ICD) | ICD, SSD (interfaces.md), SWDD (handlers.md) | Integradores, equipos externos |
| Documento técnico detallado | SWDD, SSD | Desarrolladores |
| Especificación de requisitos formal | SRS, SSRS, RTM | Calidad, certificación |

**Documentos extensos — generación sección a sección:**

Para documentos grandes, el agente genera una sección a la vez. El usuario revisa cada sección antes de avanzar a la siguiente.

```
1. Usuario proporciona estructura completa con instrucciones por sección
2. doc-generator-agent parte la estructura en secciones independientes
   ├─ Identifica fuentes internas por cada sección
   ├─ Pregunta al usuario si hay ambigüedades
   └─ Registra el progreso en docs/generated/parts/progreso.md
3. Para cada sección, secuencialmente:
   a. Genera la sección en docs/generated/parts/seccion-NN-{nombre}.md
   b. PARA. El usuario revisa.
   c. Si el usuario pide cambios → corrige y vuelve a parar
   d. Si el usuario aprueba → actualiza progreso.md → siguiente sección
4. Al completar todas las secciones, ensambla en docs/generated/{nombre-documento}.md
5. Conversión a PDF es responsabilidad del usuario (Pandoc o equivalente)
```

**Fichero de progreso (`docs/generated/parts/progreso.md`):** registra qué secciones están completadas, cuál es la siguiente, y cualquier nota del usuario. Permite retomar la generación en otra conversación.

**Reglas del doc-generator-agent:**
- **No inventa contenido.** Todo lo que escribe debe tener origen en la documentación interna.
- **Cita la fuente.** Cada sección indica de qué fichero(s) internos se extrajo la información.
- **Respeta la estructura del usuario.** No añade ni elimina secciones por su cuenta.
- **Adapta el tono.** La documentación interna es técnica y concisa; la formal puede requerir contexto adicional, introducciones o resúmenes ejecutivos según las instrucciones.
- **Formato de salida:** Markdown en `docs/generated/`. Conversión a PDF es responsabilidad del usuario (Pandoc, o herramienta equivalente).

---

## Agentes

### Ingesta (bootstrap)

| Agente | Cuándo se usa | Qué hace |
|---|---|---|
| `pdf-extraction-agent` | Bootstrap | Indexa el PDF, extrae secciones a `extracted/` |
| `code-inventory-agent` | Bootstrap | Indexa el código, extrae módulos a `extracted/` |
| `intake-agent` | Entrada de tarea (`/intake`) | Triaje de `incoming/` (ticket/documento/PDF) → `brief.md` digerible. Para PDF se apoya en `pdf-extraction-agent`. |

### Flujo principal

| Agente | Cuándo se usa | Qué hace |
|---|---|---|
| `capture-agent` | Requisito nuevo o cambio de cliente | Actualiza SRS. Detecta impacto en niveles inferiores y avisa. |
| `design-agent` | Propagación de cambios / generación de diseño | Genera y actualiza SAD, SSRS, SSD, SWDD. Propaga cambios nivel a nivel con confirmación. Lee código existente para detectar divergencias. |
| `proposal-agent` | Propuesta a cliente (`/propose`) | Redacta la propuesta cliente-facing (pre-canónica, viva) hasta nivel SSD desde la tarea + el ADR + los átomos. No escribe en la base canónica. |
| `assessment-agent` | Evaluación de propuesta entrante (`/assess`, `/assess-qa`, `/assess-estimate`) | Audita la propuesta del cliente (espejo del `proposal-agent`): redacta `analisis.md`, resuelve preguntas contra las fuentes y estima con bandas (por módulo y, en modo estimación de tareas, por `TT` en jornadas-persona). Solo-lectura sobre la base; escribe en `docs/assessments/{tarea}/`. |
| `task-planner-agent` | Desglose técnico de propuesta entrante (`/assess-tasks`, `/assess-task-add`, `/assess-task-revise`, `/assess-roadmap`) y **spikes de investigación** (`/research-spikes`) | Desglosa una propuesta auditada en tareas técnicas de nivel SWDD por capacidad (`tasks/TT-*.md`), explicativas (contexto funcional + arquitectura + ejemplos SWDD en pseudocódigo). Analiza tareas inyectadas, aplica revisiones y organiza el roadmap de incrementos de valor por sprint. En modo spikes, desglosa las preguntas de una investigación en experimentos `RT-*`. No estima (lo hace `assessment-agent`). Solo-lectura sobre la base. |
| `research-agent` | Investigación previa a la decisión (`/research`, `/research-spikes`, `/research-log`, `/research-review`, `/research-close`) | Conduce una investigación técnica **viva** cuando una decisión necesita evidencia real (mediciones, spikes, verificar supuestos). Dueño de `docs/research/{tema}/`: pregunta raíz, mapa de preguntas abiertas (estado+confianza), evidencia acumulada y fechada, veredicto provisional. Reutiliza el panel (interpretar evidencia), `task-planner-agent` (spikes), `intake` (fuentes), `assessment-agent` (incertidumbre) y `decision-agent` (salida). No decide ni propaga. Solo-lectura sobre la base; escribe solo en `docs/research/`. |

### Decisión

| Agente | Cuándo se usa | Qué hace |
|---|---|---|
| `decision-agent` | Punto de decisión con ≥2 alternativas viables (funcional o técnica), antes de propagar | Genera y compara alternativas, coordina el panel de perspectivas expertas, registra el ADR en `docs/decisions/` y devuelve el veredicto. **No escribe documentación de nivel.** |

Los **sub-agentes expertos** del panel son técnicos transversales **solo-lectura**, adaptados de arquetipos públicos (VoltAgent) con cabecera de integración (contrato de panel + navegación atómica). El sistema trae de serie las lentes transversales — `expert-architecture`, `expert-security`, `expert-performance`, `expert-data`, `expert-platform` — y las de *stack*, que se materializan según el proyecto (`expert-go`, `expert-grpc`… en un proyecto Go/gRPC). Es un registro **extensible por proyecto**; el `decision-agent` selecciona por decisión solo los relevantes y, si ninguno aplica, cubre la perspectiva él mismo. El conocimiento de dominio no es un experto: vive en los átomos.

### Output hacia desarrollo

| Agente | Cuándo se usa | Qué hace |
|---|---|---|
| `task-generator-agent` | Automático post-merge (hook) o bajo demanda | Interpreta el diff del merge de documentación, genera fichero de tareas implementativas en `tasks/` agrupadas por módulo con dependencias, y crea ramas `feature/` en el repo de código (según `config.code_repo`; p. ej. submódulo). |

### Soporte

| Agente | Cuándo se usa | Qué hace |
|---|---|---|
| `validation-agent` | Bajo demanda | Verifica trazabilidad (RTM), detecta requisitos duplicados/similares, encuentra gaps e inconsistencias entre niveles. |
| `doc-generator-agent` | Bajo demanda | Genera documentación formal en `docs/generated/` a partir de la doc interna, siguiendo la estructura y las instrucciones proporcionadas por el usuario. |

---

## Convenciones de los agentes

### Todos los agentes deben:

- **Leer `_convenciones.md` y `README.md`** del nivel donde van a escribir, antes de generar contenido (el primero da el método, el segundo la instancia del proyecto)
- **Leer las fuentes extraídas** (`extracted/`) cuando existan — nunca leer el PDF directamente
- **Cruzar con código** cuando exista `extracted/code-{modulo}.md` — documentar divergencias
- **Preguntar al usuario** si no están seguros de una decisión
- **Trabajar de forma autónoma** salvo en puntos de confirmación explícitos

### Dos modos de trabajo: documentar vs proponer

Aplica a **todos los niveles** (SRS, SAD, SSRS, SSD, SWDD):

- **Modo documentación** (fuentes existentes — PDF, código, docs previos): documentar lo que hay, cruzar fuentes, anotar divergencias. El código prevalece sobre la documentación.
- **Modo diseño** (funcionalidad nueva sin fuentes previas): **proponer** el contenido desde los niveles superiores ya existentes y el contexto del sistema. Aplicar los patrones, convenciones y tecnologías del resto del proyecto. Marcar decisiones abiertas como **TBD** si requieren confirmación del usuario.

Un mismo documento puede mezclar ambos modos: secciones que documentan lo existente y secciones que proponen diseño nuevo para funcionalidades añadidas.

Existe un **tercer modo, evaluación de alternativas**, que se intercala antes de *proponer* cuando hay más de un camino viable: en lugar de proponer un único diseño, el `decision-agent` compara alternativas y el usuario elige antes de propagar. Ver *Modo evaluación de alternativas (gate de decisión)*.

### Divergencias código vs documentación fuente

| Estado | Criterio | Acción |
|---|---|---|
| **VIGENTE** | Documentación y código coinciden | Documentar con ambas fuentes |
| **DIVERGENTE** | Documentación dice X, código hace Y | Documentar código + nota de divergencia |
| **SOLO-DOC** | No validable contra código | Documentar con nota "fuente: solo documentación" |
| **OBSOLETO** | Documentación describe algo que ya no existe en código | No incluir, listar como obsoleto |
| **NUEVO-EN-CODE** | Código tiene algo no documentado | Documentar desde código |

---

## Estado del proyecto: project-status.json

```json
{
  "project_name": "",
  "phase": "inventory | extraction | documentation | operational",
  "last_updated": "",
  "config": {
    "code_repo": { "type": "submodule | path | none", "location": "src/" },
    "task_generator_mode": "local | jira+git | jira",
    "jira": { "project_key": "", "base_url": "", "issue_type": "Task", "epic_prefix": "" }
  },
  "inputs": {
    "documents": [],
    "code": []
  },
  "extraction_progress": {
    "sections_total": 0,
    "sections_extracted": 0,
    "modules_total": 0,
    "modules_extracted": 0
  },
  "documentation_progress": {
    "srs": {},
    "sad": {},
    "ssrs": {},
    "ssd": {},
    "swdd": {}
  }
}
```
