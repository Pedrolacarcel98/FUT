# ICD — Interface Control Documents

## Propósito

Tablas de referencia de códigos de error y de protocolo utilizados en las interfaces del sistema. **No son requisitos ni diseño** — son datos de referencia consumidos por múltiples módulos, que se repetirían (y divergirían) si vivieran dentro de cada SSD/SWDD.

## Cuándo crear un fichero aquí

Cuando una tabla de códigos cumple las tres condiciones:
1. La consumen **dos o más módulos**.
2. Es **dato de referencia**, no una decisión de diseño ni un requisito.
3. Tiene una **fuente autoritativa** (una especificación de protocolo, una sección del documento fuente, o el código que la implementa).

Una tabla que solo usa un módulo vive en su SWDD, no aquí.

## Estructura esperada

Un fichero por **familia de códigos** (normalmente, por protocolo o por interfaz):

```
docs/system/icd/
  README.md                    ← este fichero (convenciones)
  {familia-de-codigos}.md      ← una familia por fichero
```

Mantén un índice al principio de este README con lo que hay:

| Fichero | Contenido | Origen |
|---------|-----------|--------|
| _(rellenar por proyecto)_ | | |

## Formato de un fichero de familia

```markdown
# {Familia} — códigos de {protocolo/interfaz}

Contexto: qué interfaz usa estos códigos y quién los emite/consume.

| Código | Nombre | Significado | Emisor | Acción esperada del receptor |
|--------|--------|-------------|--------|------------------------------|
| ...    | ...    | ...         | ...    | ...                          |

**Origen:** {sección del documento fuente} · {módulo de código que lo implementa}
```

**Regla de divergencia:** si el código fuente y el documento fuente no coinciden, manda el código y se anota la divergencia (ver *Divergencias código vs documentación fuente* en `CLAUDE.md`).
