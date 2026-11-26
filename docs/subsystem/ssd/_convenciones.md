# SSD — Subsystem Design Document

## Propósito

Documentar el diseño interno de cada subsistema: arquitectura de capas, modelo de datos y interfaces entre componentes. Sirve de puente entre los requisitos abstractos (SSRS) y el diseño detallado de software (SWDD).

## Estructura esperada

```
docs/subsystem/ssd/{subsistema}/
  README.md              ← este fichero (convenciones)
  diseno.md              ← arquitectura interna, capas, patrones
  modelo-datos.md        ← tablas, estructuras, esquemas (nivel conceptual)
  interfaces.md          ← interfaces entre componentes del subsistema
```

Para subsistemas que agrupan varios componentes independientes, los ficheros se prefijan con el nombre del componente:

```
docs/subsystem/ssd/{subsistema}/
  README.md
  {componente-a}-diseno.md        ← diseño del componente A
  {componente-a}-modelo-datos.md
  {componente-a}-interfaces.md
  {componente-b}-diseno.md        ← diseño del componente B
  {componente-b}-modelo-datos.md
  {componente-b}-interfaces.md
```

Qué subsistemas existen y qué componentes caen en cada uno lo fija la **taxonomía del SAD** (`docs/system/sad/vision-general.md`), no este README.

### Ficheros obligatorios por componente

Cada componente **siempre** debe tener los 3 ficheros, sin excepción:

| Fichero | Contenido | Obligatorio |
|---------|-----------|-------------|
| `diseno.md` | Arquitectura, capas, flujos, concurrencia | **Sí** |
| `modelo-datos.md` | Tablas, entidades, restricciones | **Sí** |
| `interfaces.md` | Interfaces públicas e internas | **Sí** |

Si un componente no tiene modelo de datos propio (ej: una librería pura), el fichero `modelo-datos.md` documenta explícitamente que no aplica y por qué.

## Contenido por fichero

### `diseno.md`
- Arquitectura interna del subsistema (capas, componentes)
- Patrones de diseño aplicados
- Flujos principales (lectura, escritura, procesamiento)
- Concurrencia y estado (si aplica)
- Divergencias con documentación fuente (si hay código)

### `modelo-datos.md`
- Tablas / colecciones / esquemas con descripción de campos
- Relaciones entre entidades
- Restricciones de integridad
- Estructuras de datos complejas (JSON embebido, bitfields, protocolos)
- No incluir tipos del lenguaje — eso va en SWDD

### `interfaces.md`
- Interfaces públicas del subsistema (qué expone a otros)
- Consumidores del componente (quién lo usa)
- Dependencias del componente (qué usa)
- Interfaces internas entre componentes
- Sin firmas concretas del lenguaje — eso va en SWDD

## Relación con otros documentos

- **← Fuente:** SSRS (requisitos), SAD (contexto arquitectónico), código existente
- **→ Alimenta:** SWDD (diseño detallado para implementar)
