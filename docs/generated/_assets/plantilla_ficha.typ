#let plantilla_ficha(
  tabla_control_versiones,
  documento: [Documento],
  titulo: [Título],
  subtitulo: [Subtítulo],
  propietario: [Propietario del documento],
  gestor: [Grupo gestor],
  id: [Código de documento],
  editor: [Nombre editor],
  revisor: [Nombre revisor],
  fecha: [01/01/1970] ,
  version: [1.0],
  borrador: false,
  contenido) = {
   
    // import "@preview/i-figured:0.2.4"
    
    // Fuentes, estilos e idioma generales
    set text(font: "Calibri", lang: "es", size: 12pt)
    set list(indent: 8pt)
    set terms(indent: 16pt)
    set math.equation(numbering: "(1)")
    let tab_counter = counter("tab_count") 
    
    show heading: it => [#it #v(.5em)]

    // Tablas multipágina
    show figure: set block(breakable: true)

    // Numeración de tablas incluyendo sección
    // show figure: i-figured.show-figure

    // Configuración de página

    set par(justify: true)
    set heading(numbering: "1.")

    set page(
      paper: "a4",
      margin: (top: 4cm, bottom: 2cm),
      binding: left,

      header: {
        table(
          columns: (20%, 30%, 1fr, 1fr, 1fr),
          align: center + horizon,
          fill: white,
          stroke: 0.5pt,
          // Logo corporativo. Sustituye logo.svg por el logo real del proyecto
          // (mismo nombre de fichero, o cambia la ruta aquí). Ver _assets/README.md.
          table.cell(rowspan: 2)[#box(width: 20%)[#image("logo.svg", width: 500%)]],
          table.cell(colspan: 4)[#box(width: 100%)[*#titulo \ #subtitulo*]],
          [*Gestor* \ #text(size: 10pt)[#gestor]], [*Id* \ #text(size:10pt)[#id]], [*Versión* \ #text(size:10pt)[#version]], [*Fecha* \ #text(size:10pt)[#fecha]],
        )
      },
      footer: context{
        if counter(page).get().first() >= 1 [
          #line(length: 100%, stroke: 1pt)
          #grid(columns: (80%, 1fr), align: center+horizon,
              align(left, [#documento]), 
              [Página #counter(page).display("1 de 1", both: true)]  
          )
        ]
      },
      background: {
        if borrador {
          rotate(-60deg, text(50pt, fill: silver)[*B O R R A D O R*])
        }
      }
    )

    // Control de versiones

    text(size: 16pt, [*Control de versiones*])

    tabla_control_versiones

    // Tabla de contenidos
    pagebreak()
    outline(
      title: [Tabla de contenidos],
      indent: auto
    )

    // Tabla de figuras
    pagebreak()
    outline(
      title: [Tabla de estructuras],
      target: figure.where(kind: "E"),
    )

    // Bibliografía
       
    pagebreak()
    bibliography("biblio.yaml", title: "Documentos de referencia")    

    // Camiar titulos de las tablas de Tabla a E (Estructura)
    show figure.where(kind: table): set figure(kind: "E", supplement: [E])

    // Contenido
    pagebreak()
    contenido
}

