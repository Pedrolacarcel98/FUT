# SWDD — Software Detailed Design Document

## Propósito

Diseño detallado listo para implementar. Contiene structs con campos y tipos, firmas de funciones, interfaces concretas del lenguaje, algoritmos paso a paso y detalle de protocolos. Es el documento desde el que se genera el código.

## Estructura esperada

```
docs/software/swdd/{modulo}/
  README.md              ← convenciones y estructura del código
  domain.md              ← structs, interfaces, constantes (OBLIGATORIO)
  service-layer.md       ← lógica de negocio, orquestación (OBLIGATORIO)
  handlers.md            ← API expuesta: gRPC, TCP, REST (OBLIGATORIO)
  {extra}.md             ← ficheros adicionales específicos del módulo
```

### Ficheros obligatorios por módulo

Cada módulo **siempre** debe tener los 3 ficheros base, sin excepción:

| Fichero | Contenido | Obligatorio |
|---------|-----------|-------------|
| `domain.md` | Structs con tipos del lenguaje, interfaces con firmas, constantes, enumerados, funciones de dominio | **Sí** |
| `service-layer.md` | Struct del servicio, constructor, lógica de negocio por área, orquestación | **Sí** |
| `handlers.md` | API expuesta (gRPC handlers, servidores TCP, endpoints REST), mapeo handler→servicio, entry point | **Sí** |

### Ficheros adicionales (opcionales, según necesidad del módulo)

| Fichero | Cuándo incluirlo |
|---------|-----------------|
| `storage.md` | Módulos con persistencia propia significativa (esquema SQL, migraciones, inicialización) |
| `tcp-servers.md` | Módulos con servidores TCP propios (protocolo binario, flujos de conexión) |
| `algorithms.md` | Módulos con algoritmos complejos que requieren documentación paso a paso |

Si un módulo no expone API (ej: librería interna), `handlers.md` documenta los puntos de entrada públicos del paquete.

## Contenido por fichero

### `domain.md`
- Structs/clases con campos, tipos concretos del lenguaje y tags (GORM, JSON, etc.)
- Interfaces con firmas completas
- Enumerados con valores
- Constantes de protocolo, máscaras de bits, valores por defecto
- Funciones de dominio exportadas
- Trazabilidad SSRS → tipos/interfaces

### `service-layer.md`
- Struct del servicio principal y constructor
- Lógica de negocio organizada por área funcional
- Flujos complejos paso a paso (SetDCData, GetCredential, etc.)
- Interacción con persistencia y otros servicios

### `handlers.md`
- Struct del servidor (gRPC, TCP)
- Lista completa de métodos/endpoints con request/response
- Mapeo de cada handler a función del servicio
- Patrones de protección (mutex, actividad, etc.)
- Entry point (main.go) y flujo de arranque

## Reglas

- Aplica la regla general de **documentar vs proponer** (ver CLAUDE.md, sección "Dos modos de trabajo")
- En modo diseño (sin código), el SWDD debe tener suficiente detalle para implementar directamente sin ambigüedad: structs con tipos, firmas de funciones, esquema de datos, algoritmos paso a paso
- Este documento debe ser **autosuficiente**: quien implemente no debería necesitar subir a otros niveles
- Incluir divergencias con documentación fuente cuando sean relevantes para el diseño

## Relación con otros documentos

- **← Fuente:** SSD (diseño subsistema), SSRS (requisitos), código existente
- **→ Alimenta:** `task-generator-agent` (traduce el diseño a tareas) y la implementación en el repo de código
