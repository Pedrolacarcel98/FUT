<!-- GENERADO por .ai/scripts/sync.py (target Codex) desde las fuentes del submódulo. No editar: los cambios van al submódulo. -->
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

