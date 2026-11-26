<!-- GENERADO por .ai/scripts/sync.py (target Codex) desde las fuentes del submódulo. No editar: los cambios van al submódulo. -->
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
| Panel de lentes expertas disponibles (`expert-*`) | `.codex/agents/expert-*.md` (el registro de `.babel-config.json` se deriva de ahí) | decision-agent, assessment-agent, research-agent |
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

→ **Detalle en `.codex/method/estructura-de-ficheros.md`.** Léelo entero antes de aplicar o ejecutar lo que describe esta sección.

## Formato de requisito

→ **Detalle en `.codex/method/formato-de-requisito.md`.** Léelo entero antes de aplicar o ejecutar lo que describe esta sección.

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

→ **Detalle en `.codex/method/registro-de-decision-adr.md`.** Léelo entero antes de aplicar o ejecutar lo que describe esta sección.

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

→ **Detalle en `.codex/method/flujo-de-propuesta-a-cliente.md`.** Léelo entero antes de aplicar o ejecutar lo que describe esta sección.

### Flujo de evaluación de propuesta entrante (cliente propone)

→ **Detalle en `.codex/method/flujo-de-evaluacion-de-propuesta-entrante-cliente-propone.md`.** Léelo entero antes de aplicar o ejecutar lo que describe esta sección.

### Flujo de investigación previa a la decisión (research)

→ **Detalle en `.codex/method/flujo-de-investigacion-previa-a-la-decision-research.md`.** Léelo entero antes de aplicar o ejecutar lo que describe esta sección.

### Reconciliación código → documentación

→ **Detalle en `.codex/method/reconciliacion-codigo-documentacion.md`.** Léelo entero antes de aplicar o ejecutar lo que describe esta sección.

### Generación de documentación formal

→ **Detalle en `.codex/method/generacion-de-documentacion-formal.md`.** Léelo entero antes de aplicar o ejecutar lo que describe esta sección.

## Agentes

### Ingesta (bootstrap)

| Agente | Cuándo se usa | Qué hace |
|---|---|---|
| `pdf-extraction-agent` | Bootstrap | Indexa el PDF, extrae secciones a `extracted/` |
| `code-inventory-agent` | Bootstrap | Indexa el código, extrae módulos a `extracted/` |
| `intake-agent` | Entrada de tarea (`$intake`) | Triaje de `incoming/` (ticket/documento/PDF) → `brief.md` digerible. Para PDF se apoya en `pdf-extraction-agent`. |

### Flujo principal

| Agente | Cuándo se usa | Qué hace |
|---|---|---|
| `capture-agent` | Requisito nuevo o cambio de cliente | Actualiza SRS. Detecta impacto en niveles inferiores y avisa. |
| `design-agent` | Propagación de cambios / generación de diseño | Genera y actualiza SAD, SSRS, SSD, SWDD. Propaga cambios nivel a nivel con confirmación. Lee código existente para detectar divergencias. |
| `proposal-agent` | Propuesta a cliente (`$propose`) | Redacta la propuesta cliente-facing (pre-canónica, viva) hasta nivel SSD desde la tarea + el ADR + los átomos. No escribe en la base canónica. |
| `assessment-agent` | Evaluación de propuesta entrante (`$assess`, `$assess-qa`, `$assess-estimate`) | Audita la propuesta del cliente (espejo del `proposal-agent`): redacta `analisis.md`, resuelve preguntas contra las fuentes y estima con bandas (por módulo y, en modo estimación de tareas, por `TT` en jornadas-persona). Solo-lectura sobre la base; escribe en `docs/assessments/{tarea}/`. |
| `task-planner-agent` | Desglose técnico de propuesta entrante (`$assess-tasks`, `$assess-task-add`, `$assess-task-revise`, `$assess-roadmap`) y **spikes de investigación** (`$research-spikes`) | Desglosa una propuesta auditada en tareas técnicas de nivel SWDD por capacidad (`tasks/TT-*.md`), explicativas (contexto funcional + arquitectura + ejemplos SWDD en pseudocódigo). Analiza tareas inyectadas, aplica revisiones y organiza el roadmap de incrementos de valor por sprint. En modo spikes, desglosa las preguntas de una investigación en experimentos `RT-*`. No estima (lo hace `assessment-agent`). Solo-lectura sobre la base. |
| `research-agent` | Investigación previa a la decisión (`$research`, `$research-spikes`, `$research-log`, `$research-review`, `$research-close`) | Conduce una investigación técnica **viva** cuando una decisión necesita evidencia real (mediciones, spikes, verificar supuestos). Dueño de `docs/research/{tema}/`: pregunta raíz, mapa de preguntas abiertas (estado+confianza), evidencia acumulada y fechada, veredicto provisional. Reutiliza el panel (interpretar evidencia), `task-planner-agent` (spikes), `intake` (fuentes), `assessment-agent` (incertidumbre) y `decision-agent` (salida). No decide ni propaga. Solo-lectura sobre la base; escribe solo en `docs/research/`. |

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
