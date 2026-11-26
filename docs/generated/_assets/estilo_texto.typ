//Formato de texto para registros de tablas
#let reg(nombre) = {
  set text(hyphenate: false, weight: "regular", fill: gray.darken(45%))
  
  //highlight(fill: silver.darken(10%), stroke: none, top-edge: "ascender", bottom-edge: "descender", radius: 2pt, extent: 1pt,)[#nombre] 

  raw(nombre, )
}

//Formato de texto para resaltar las siglas (OLD)
#let sigla(nombre) = {
  set text(fill: blue)[#nombre] 
}

//Formato de texto para siglas
#let s(nombre) = {
  raw(nombre, )
}

//Formato de texto para marcar texto especial
#let m(nombre) = {
  text(fill: blue.darken(20%))[#nombre]
}

//Formato de texto para resaltar subapartados sin indice
#let sub(nombre) = {
  set text(fill: gray.darken(50%))
  //[#underline(nombre)] -> no formatea bien cuando se incluyen texto raw. Se elimina el subrayado.
  [#nombre] 
}

//Formato de texto para referirnos a tablas
#let tab(nombre) = {
  // Formato Cursiva
  set text(style: "italic")
  [#nombre] 
}

