#import "@preview/fletcher:0.5.8" as fletcher: diagram, node, edge
#import fletcher.shapes: diamond

#let nodo_start(pos, label, tint: white) = node(
  pos, align(center, label),
  corner-radius: 2pt, 
  extrude: (0, 1.5),
	shape: rect,
	fill: red.lighten(80%),
	stroke: 1pt + red.darken(20%)
)

#let nodo_rect(pos, label, tint: white) = node(
  pos, align(center, label),
	shape: rect,
	fill: blue.lighten(80%),
	stroke: 1pt + blue.darken(20%)
)

#let nodo_romb(pos, label, tint: white) = node(
  pos, align(center, label),
	shape: diamond,
	fill: gray.lighten(70%),
	stroke: 1pt + gray.darken(30%)
)