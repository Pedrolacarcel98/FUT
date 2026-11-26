# `_assets/` — plantillas y estilos de los entregables formales

Todo lo que consumen los `.typ` de `docs/generated/{documento}/build/`. Los genera y los usa el `doc-generator-agent` y el `proposal-doc-generator`.

| Fichero | Qué es | ¿Hay que tocarlo al instanciar? |
|---|---|---|
| `plantilla_ficha.typ` | Plantilla maestra: portada, cabecera con logo, pie, control de versiones, numeración | Solo si cambia el formato corporativo |
| `estilo_tablas.typ` | Helpers de tabla (`#tabla1`, …) | No |
| `estilo_texto.typ` | Fuentes, tamaños, estilos de texto | Solo para ajustar identidad visual |
| `estilo_diagramas.typ` | Estilos de figuras y diagramas | No |
| `biblio.yaml` | Bibliografía citable (formato Hayagriva) | **Sí** — rellenar con las fuentes reales |
| `logo.svg` | **Placeholder** del logo corporativo | **Sí** — sustituir |

## Sustituir el logo

`plantilla_ficha.typ` referencia `logo.svg` desde esta misma carpeta. Dos opciones:

1. **Recomendada** — sustituye `logo.svg` por el logo real manteniendo el nombre. No hay que tocar la plantilla.
2. Deja el fichero real con su nombre (`logo-miempresa.png`, …) y actualiza la única línea `#image(...)` de `plantilla_ficha.typ`.

Typst admite `.svg`, `.png` y `.jpg`. Ajusta el `width: 500%` del `#box` si el logo real tiene otra relación de aspecto.

> **No versiones logos de cliente en repos que vayan a circular fuera del proyecto.** El placeholder existe precisamente para que la plantilla compile sin arrastrar branding ajeno.

## Compilar

```
typst compile --root . docs/generated/{documento}/build/{documento}.typ
```

El `.typ` se versiona; el `.pdf` está en `.gitignore`.
