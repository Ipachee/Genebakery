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

## fn_cobrar_pedido es idempotente (desde el 25/08/2026)

Bug real encontrado en un audit externo y confirmado leyendo el código: la función no tenía ningún lock
ni chequeo de "¿este pedido ya está cobrado?" antes de insertar en `ventas` y descontar stock. Dos
llamadas simultáneas para el mismo pedido (doble click, reintento de red, el modo offline que dispara el
cobro sin esperar confirmación) podían duplicar la venta y el descuento de stock. Arreglado con un
`select ... for update` sobre la fila de `pedidos` al principio de la función -- bloquea la fila hasta
que termina la transacción, así una segunda llamada concurrente espera y después corta con
`raise exception` en vez de duplicar todo. Ver `20260825010000_cobro_idempotente.sql`.

## Anular una venta revierte el stock (desde el 25/08/2026)

`borrarVenta` ya no es un `update` directo a `deleted_at` -- pasa por `fn_anular_venta` (RPC), que además
de marcar la venta borrada revierte el stock consumido al cobrar (inserta un movimiento `tipo='anulacion'`,
nuevo valor agregado al `CHECK` de `movimientos.tipo`). Ojo con el caso de pago dividido: un mismo
`pedido_id` puede tener varias filas en `ventas` (una por forma de pago) -- la función NO revierte stock
hasta que se anule la ÚLTIMA venta activa de ese pedido, para no revertir de más si solo se anula uno de
varios pagos parciales.

## Facturación desde acá

El badge de factura (emitida/error/pendiente/sin factura) y el botón de imprimir ticket con QR viven en
esta vista. Ver [[Facturacion-electronica]] para el flujo completo.

`FacturaTicket.tsx` tiene la condición de IVA del comprador **inferida del tipo de comprobante elegido**
(`COND_IVA_COMPRADOR`) -- Factura A siempre es Responsable Inscripto, B/C caen a Consumidor Final. No es
un dato que se cargue por cliente hoy, así que no inventar un campo nuevo para esto sin que haga falta de
verdad.

**Relacionado:** [[Turnos]], [[Facturacion-electronica]], [[Permisos]]
