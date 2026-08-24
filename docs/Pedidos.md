# Pedidos

Estado: stub — completar cuando se trabaje acá.

**Archivos:** `src/features/pedidos/components/PedidoPanel.tsx` (y `.css`), `PedidoCarrito.tsx`,
`PedidoFooterAcciones.tsx`, `PedidoFooterCobro.tsx`, `PedidoFooterTransferir.tsx`, `PedidoMenu.tsx`,
`Cronometro.tsx`

El panel de cobro (`PedidoFooterCobro.tsx`) tiene el campo de descuento manual — ver
[[Ventas#Descuento manual]]. El modal comparte chrome mobile (`.pedido-overlay`/`.pedido-modal`) ya
resuelto para pantallas chicas (bottom-sheet a partir de 560px).

## Ticket de cobro: real vs. vista previa

El ticket real (`recibo` en `PedidoPanel.tsx`) ya NO dispara `window.print()` -- lo imprime
[[Print-bridge]] solo, apenas la venta queda en la base. El botón "🖨️ Imprimir ticket" de
`PedidoFooterCobro.tsx` es otra cosa: una vista previa ANTES de elegir método de pago (todavía no hay
venta cargada para que print-bridge la vea), así que sí usa `window.print()` del navegador -- es manual
y ocasional, no un auto-print en cada cobro, por eso no hacía falta sacarlo del todo. Dice "A confirmar"
en el método de pago porque en ese momento todavía no se eligió ninguno.

## Roadmap: rediseño del ticket de cobro (print-bridge)

Pendiente, no implementado -- boceto mostrado y aprobado en el chat, sin fecha para hacerlo:

- Tabla de 4 columnas con encabezado: Cant. / Descripción / SubTot. (precio unitario) / Total, en vez de
  la fila actual "cant.x nombre ... total" (ver `imprimirItemsTabla` en `print-bridge/index.js`).
- Más espacio (un renglón en blanco) entre la lista de items y el bloque Subtotal/Descuento/Total.
- Agregar al pie: "DOCUMENTO NO VÁLIDO COMO FACTURA" -- solo en el ticket de cobro, **no** en la Factura
  B/A/C (esa sí es válida como factura).
- **"Paga con" / "Vuelto": descartado a propósito** -- el usuario confirmó que no lo necesitan. No
  agregar el campo de monto entregado en `PedidoFooterCobro.tsx` para esto si se retoma el resto del
  rediseño.

**Relacionado:** [[Salon]], [[Ventas]], [[Print-bridge]], [[Index]]
