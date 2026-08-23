# Ventas

**Qué hace:** listado de mesas/pedidos cobrados, con estado de factura electrónica de cada uno.

**Archivos clave:** `src/features/ventas/components/VentasView.tsx`, `FacturaTicket.tsx`,
`src/components/DataTable.tsx` (`useOrdenTabla`)

## Ojo: ordenar mesas es por `mesa_id`, no por el texto "#N"

`mesas.label` es `null` en casi todas las mesas reales — lo que se ve como "#9" en pantalla es un
fallback `#${mesa_id}` armado en el momento, no un valor guardado. Un primer intento de arreglo comparó
ese string formateado parseándolo a número, pero `Number('#9')` da `NaN` (el `#` rompe el parseo) y caía
en comparación de texto silenciosamente — por eso "#1" quedaba antes que "#10" aunque hubiera "#9", "#8",
"#5" en el medio. El arreglo real compara `mesa_id` numérico directo, sin pasar por el string formateado.
Si se toca `compararMesas` de nuevo, no reintroducir ese atajo.

## Descuento manual

`descuentoManualPct` (gateado por `usePuedeEditar('ventas')`, ver [[Convenciones]]) pisa el
`descuento_pct` automático del cliente cuando no está vacío. El tilde de confirmación al lado del campo
no bloquea nada — solo saca el foco del input (`.blur()`) para que un toque de más no se meta en la
casilla y sume dígitos de más.

## Facturación desde acá

El badge de factura (emitida/error/pendiente/sin factura) y el botón de imprimir ticket con QR viven en
esta vista. Ver [[Facturacion-electronica]] para el flujo completo.

**Relacionado:** [[Turnos]], [[Facturacion-electronica]], [[Permisos]]
