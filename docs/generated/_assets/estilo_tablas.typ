// Formato de tablas

#let tabla_control_versiones(..datos) = {

  show table.cell.where(y: 0): set text(weight: "bold") 
	show table: set text(size: 10pt)

  table(
    //columns: colwidth,
    columns: (20%, 20%, 60%),
    align: (x, y) => if y == 0 { center } else if y > 0 and x == 2 { left } else { center },
    fill: (_, y) => if y == 0 { silver },
    stroke: 0.5pt,
    table.header([*Versión*], [*Fecha*], [*Descripción*]),
    ..datos
    )
}

#let tabla1(cols, tabla, col_width: (), mark_row: (-1,)) = {
// #let tabla1(cols, tabla, desc_col: -1, desc_width: 35%, mark_row: (-1,), def_col: auto) = {

  /*
  PARAMETROS
  **********

  cols  
        Número de columnas de la tabla
  
  desc_col 
        Columna que contiene la descripción (la primera columna es 0). Se le asignará un mayor ancho predefinido. Si es un valor negativo, todas las columnas aplicarán el formato 'auto'.

  def_col
        Ancho de columna por defecto. Puede adoptar los valores 'auto', '1fr', en función de lo que interese en cada caso.
  col_width
        Establecer ancho de cada columna independientemente.
        Usar col_width si se proporciona, de lo contrario usar auto para todas las columnas.
  */

  show table.cell.where(y: 0): set text(weight: "bold")
	show table: set text(size: 10pt)

  let datos = tabla.flatten()

  // Usar col_width si se proporciona, de lo contrario usar auto para todas las columnas
  let colwidth = if col_width.len() > 0 { col_width } else { (auto,) * cols }

  // let colwidth = ()
  
  // let n = 0
  // while n < cols {
  //   if n == desc_col {colwidth.push(desc_width)} else {colwidth.push(def_col)}
  //   n = n + 1
  // }

  table(
    columns: colwidth,
    align: center + horizon,
    fill: (_, y) => if y == 0 { silver },
    stroke: (x, y) => ( 
        top: if y in mark_row {red + 2pt} else {if y == 0 {0.5pt}}, 
        left: if y in mark_row and x == 0 {red + 2pt} else {0.5pt}, 
        right: if y in mark_row and x == cols - 1 {red + 2pt} else {0.5pt}, 
        bottom: if y in mark_row {red + 2pt} else {0.5pt},
        ),
    table.header(..datos.slice(0, cols)),
    ..datos.slice(cols, ),
    )
}


#let tabla2(cols, tabla, desc_col: -1, def_col: auto) = {

  /*
  PARAMETROS
  **********

  cols  
        Número de columnas de la tabla
  
  desc_col 
        Columna que contiene la descripción (la primera columna es 0). Se le asignará un mayor ancho predefinido. Si es un valor negativo, todas las columnas aplicarán el formato 'auto'.

  def_col
        Ancho de columna por defecto. Puede adoptar los valores 'auto', '1fr', en función de lo que interese en cada caso.
  */

  show table.cell.where(y: 0): set text(weight: "bold")
	show table: set text(size: 10pt)

  let colwidth = ()
  let datos = tabla.flatten()
  
  let n = 0
  while n < cols {
    if n == desc_col {colwidth.push(35%)} else {colwidth.push(def_col)}
    n = n + 1
  }
  
  table(
    columns: colwidth,
    align: center + horizon,
    fill: (_, y) => if y == 0 { blue.lighten(90%) },
    stroke: 0.5pt,
    table.header(..datos.slice(0, cols)),
    ..datos.slice(cols, )
    )
}


#let tabla_capp(cols, tabla, desc_col: -1) = {

  /*
  PARAMETROS MENSAJE CAPA APLICACION
  **********************************

  cols  
        Número de columnas de la tabla
  desc_col 
        Columna que contiene la descripción (la primera columna es 0). Se le asignará un mayor ancho predefinido. Si es un valor negativo, todas las columnas aplicarán el formato 'auto'.
  */

  show table.cell.where(y: 0): set text(weight: "bold")
  show table.cell.where(y: 1): set text(weight: "bold")
	show table: set text(size: 10pt)

  let colwidth = ()
  let datos = tabla.flatten()
  
  let n = 0
  while n < cols {
    if n == desc_col {colwidth.push(35%)} else {colwidth.push(auto)}
    n = n + 1
  }

  table(
    columns: colwidth,
    align: center + horizon,
    fill: (_, y) => if y in (0, 1, 2) { silver },
    stroke: 0.5pt,
    table.header(
        table.cell(colspan: cols, datos.at(0)),
        datos.at(cols),
        table.cell(colspan: cols - 1, datos.at(cols + 1)),
    ),
    ..datos.slice(2*cols,)  
  )
}

#let tabla_bits(cols, tabla, desc_col: -1) = {

  /*
  PARAMETROS campo de bits
  ************************

  cols  
        Número de bits del campo
  desc_col 
        Columna que contiene la descripción (la primera columna es 0). Se le asignará un mayor ancho predefinido. Si es un valor negativo, todas las columnas aplicarán el formato 'auto'.
  */

  show table.cell.where(y: 0): set text(weight: "bold")
	show table: set text(size: 10pt)

  let colwidth = ()
  let datos = tabla.flatten()
  
  let n = 0
  while n < cols {
    if n == desc_col {colwidth.push(35%)} else {colwidth.push(auto)}
    n = n + 1
  }

  table(
    columns: colwidth,
    align: center + horizon,
    fill: (_, y) => if y == 0 { yellow.lighten(60%) },
    stroke: 0.5pt,
    table.header(
        table.cell(colspan: cols, datos.at(0)),
        table.cell(colspan: cols, datos.at(cols)),
    ),
    ..datos.slice(2*cols,)  
  )
}

#let tabla_gbtb(cols, tabla) = {

  /*
  PARAMETROS MENSAJE GB/TB
  ************************

  data_cols  
        Número de columnas totales
  
  */

  let color_head1 = rgb("#806000")
  let color_head2 = rgb("#ffd966")
  let color_head3 = rgb("#fff2cc")

  show table.cell.where(y: 0): set text(weight: "bold", fill: rgb("#ffffff"))
  show table.cell.where(y: 1): set text(weight: "bold")
  show table.cell.where(y: 2): set text(size: 8pt)
  show table.cell.where(y: 3): set text(size: 8pt)
  show table.cell.where(y: 4): set text(size: 8pt, fill: blue.darken(40%))

	show table: set text(size: 10pt)

  let datos = tabla.flatten()
  
  table(
    columns: cols * (auto, ),
    align: center + horizon,
    fill: (_, y) => if y == 0 { color_head1 } else if y == 1 { color_head2 } else if y == 2 { color_head3 } else if y == 3 { silver } else if y == 4 {silver.lighten(50%)},
    stroke: white + 1pt,
    table.header(
        table.cell(colspan: cols, datos.at(0)),
        table.cell(rowspan: 2, datos.at(cols)),
        table.cell(rowspan: 2, datos.at(cols + 1)),
        table.cell(rowspan: 2, datos.at(cols + 2)),
        table.cell(rowspan: 2, datos.at(cols + 3)),
        table.cell(rowspan: 2, datos.at(cols + 4)),
        table.cell(colspan: cols - 5, datos.at(cols + 5)),
        ..datos.slice(2 * cols + 5, 3 * cols),
    ),
    ..datos.slice(3*cols,)  
  )
}

#let tabla_nmc(cols, tabla) = {

  /*
  PARAMETROS NETWORK MANAGEMENT COMMANDS
  ************************

  data_cols  
        Número de columnas totales
  
  */

  let color_head1 = rgb("#806000")
  let color_head2 = rgb("#ffd966")
  let color_head3 = rgb("#fff2cc")

  show table.cell.where(y: 0): set text(weight: "bold", fill: rgb("#ffffff"))
  show table.cell.where(y: 1): set text(weight: "bold")
  show table.cell.where(y: 2): set text(size: 8pt)
  show table.cell.where(y: 3): set text(size: 8pt)
  show table.cell.where(y: 4): set text(size: 8pt, fill: blue.darken(40%))

	show table: set text(size: 10pt)

  let datos = tabla.flatten()
  
  table(
    columns: cols * (auto, ),
    align: center + horizon,
    fill: (_, y) => if y == 0 { color_head1 } else if y == 1 { color_head2 } else if y == 2 { color_head3 } else if y == 3 { silver } else if y == 4 {silver.lighten(50%)},
    stroke: white + 1pt,
    table.header(
        table.cell(colspan: cols, datos.at(0)),
        table.cell(rowspan: 2, datos.at(cols)),
        table.cell(colspan: cols - 1, datos.at(cols + 1)),
        ..datos.slice(2 * cols + 1, 3 * cols),
    ),
    ..datos.slice(3*cols,) 
  )
}


#let grid_tablas(tablas) = {
  /*
  Genera una malla de tablas de una sola columna.

  PARAMETROS 
  **********

  tablas:
          Array de tablas a disponer en el grid
  */

  grid(
        columns: 1,
        gutter: 10pt,
        inset: 0pt,

        ..tablas.flatten()
    )
}

#let tabla3(cols, tabla, desc_col: -1) = {

  /*
  PARAMETROS MENSAJE CAPA APLICACION
  **********************************

  cols  
        Número de columnas de la tabla
  desc_col 
        Columna que contiene la descripción (la primera columna es 0). Se le asignará un mayor ancho predefinido. Si es un valor negativo, todas las columnas aplicarán el formato 'auto'.
  */

  show table.cell.where(y: 0): set text(weight: "bold")
	show table: set text(size: 10pt)

  let colwidth = ()
  let datos = tabla.flatten()
  
  let n = 0
  while n < cols {
    if n == desc_col {colwidth.push(35%)} else {colwidth.push(auto)}
    n = n + 1
  }

  table(
    columns: colwidth,
    align: center + horizon,
    fill: (_, y) => if y == 0 { blue.lighten(90%) },
    stroke: 0.5pt,
    table.header(
        ..datos.slice(0, 2),
        table.cell(colspan: 8, datos.at(2)),
        ..datos.slice(10, 12),
    ),
    ..datos.slice(cols,)  
  )
}
