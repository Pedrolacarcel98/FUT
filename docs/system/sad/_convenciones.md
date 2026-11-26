# SAD — System Architecture Document

## Propósito

Documentar **cómo** se organiza el sistema: módulos, interfaces de alto nivel, datos, integración, despliegue y decisiones de arquitectura. Incluye las interfaces entre módulos a alto nivel (lo que antes era el ICD) y la estrategia de integración.

## Estructura esperada

```
docs/system/sad/
  README.md              ← este fichero (convenciones)
  vision-general.md      ← arquitectura de alto nivel, roles, TAXONOMÍA DE COMPONENTES, diagrama de arquitectura
  {categoria}-{nombre}.md ← un fichero por componente, con el prefijo de su categoría en la taxonomía
  integracion.md         ← cómo se comunican los componentes, protocolos, topología
  despliegue.md          ← modelo de despliegue, redes, configuración, plataforma
  decisiones.md          ← decisiones arquitectónicas
```

## La taxonomía de componentes se define AQUÍ

`vision-general.md` es la **fuente de verdad de la taxonomía de componentes del proyecto**: qué categorías de componente existen (p. ej. *aplicaciones* / *procedimientos* / *servicios*, o *bounded contexts*, o *capas*, o *microservicios*…) y qué componente pertenece a cada una.

**Esto no lo fija el método, lo fija el proyecto.** Todos los niveles inferiores (SSRS, SSD, SWDD) se organizan según esta taxonomía: cada categoría tiene su propio subsistema y no se mezclan componentes de categorías distintas dentro del mismo documento. Antes de crear cualquier SSRS/SSD/SWDD, consulta aquí a qué categoría pertenece el componente.

## Diagrama de arquitectura

`vision-general.md` debe incluir un diagrama de arquitectura de alto nivel (Mermaid u otro formato textual) que muestre:
- Los **componentes** de cada categoría de la taxonomía y sus relaciones
- Qué componentes consumen a qué otros
- Los **protocolos** entre ellos
- Los **actores externos** (sistemas de terceros, dispositivos, usuarios, servicios remotos)

Este diagrama es clave para entender la arquitectura de un vistazo.

## Fichero de módulo (`{modulo}.md`)

Cada módulo del sistema tiene un fichero con:

- **Descripción** — qué hace, frontera del módulo
- **Responsabilidades** — lista de responsabilidades
- **Interfaces de alto nivel** — qué expone y qué consume (sin detalle de campos/tipos)
- **Datos** — qué datos gestiona (tablas, esquemas, a nivel conceptual)
- **Dependencias** — de qué otros módulos depende
- **Divergencias** — si hay código, qué diverge de la documentación fuente

## Fichero de decisiones (`decisiones.md`)

Formato ligero ADR:

```markdown
### DEC-NNN — Título de la decisión
- **Contexto:** Situación que requirió la decisión
- **Decisión:** Qué se decidió
- **Alternativas:** Qué más se consideró
- **Justificación:** Por qué esta opción
- **Consecuencias:** Trade-offs aceptados
```

## Relación con otros documentos

- **← Fuente:** SRS (requisitos), código existente (vía `extracted/`), documentación fuente
- **→ Alimenta:** SSRS (asignación de requisitos a subsistemas), SSD (contexto arquitectónico)
