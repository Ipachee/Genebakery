# Categorías y Recetas — destino cocina/barra

**Qué hace:** separa la impresión de tickets al enviar a cocina — bebidas a la impresora/ticket de barra,
comida al de cocina, en vez de todo junto.

**Archivos clave:** `src/features/categorias/components/CategoriasView.tsx`,
`src/features/recetas/components/RecetasView.tsx`

## Dos niveles: categoría, con override por producto

`categorias.destino` (`'cocina'` | `'barra'`, default `'cocina'`; `Bebidas` viene seteada en `'barra'`)
define el destino por defecto de todo lo de esa categoría. `productos.destino` (nullable) puede
pisar ese default para un producto puntual — `null` significa "heredar de la categoría".

La UI en Recetas es deliberadamente simple: el select solo tiene "Cocina"/"Barra", sin explicación de
"según categoría" ni texto descriptivo — se da por sentado que si no se toca queda en lo de la
categoría. No agregar de nuevo las explicaciones largas si se retoca esta pantalla, ya se sacaron a
pedido explícito.

## Quién lo consume

[[Print-bridge]] resuelve el destino final así: `producto.destino ?? categoría.destino ?? 'cocina'`, y
imprime hasta dos tickets separados por ronda (uno con encabezado "COCINA", otro "BARRA").

**Relacionado:** [[Print-bridge]]
