# Movimientos

**Qué hace:** historial de todo lo que movió stock, unificado para insumos y elaborados. Es una tabla de
sólo-lectura desde la UI — nadie escribe un movimiento a mano, los generan las funciones SQL.

**Archivos:** `src/features/movimientos/api.ts`, `components/MovimientosView.tsx`

## `cantidad` es un delta CON SIGNO

No es una cantidad absoluta: negativo cuando descuenta stock, positivo cuando lo repone.
`stock_resultante` guarda cómo quedó el stock después de ese movimiento, así el historial se puede leer
sin recalcular nada. Por eso `movimientos.cantidad` quedó **afuera** de los CHECK `>= 0` que se agregaron
al resto de las tablas (ver [[Arquitectura#CHECK de integridad numérica]]) — ponerle esa restricción
rompería el diseño de la tabla.

## Los 5 tipos y quién los genera

| tipo | lo genera | signo |
|---|---|---|
| `compra` | cargar un gasto de insumo | + |
| `venta` | `fn_cobrar_pedido` | − |
| `produccion` | `fn_producir_elaborado` | + el elaborado, − los insumos |
| `ajuste` | `fn_ajustar_stock` (desde el 25/08/2026) | según el conteo |
| `anulacion` | `fn_anular_venta` (desde el 25/08/2026) | + (devuelve lo descontado) |

## Ajuste manual de stock (issue #12)

Hasta el 25/08/2026 el tipo `ajuste` existía en el CHECK y en la UI del listado, pero **ningún flujo lo
generaba** — la única forma de corregir un stock desviado era editar la base a mano.
`fn_ajustar_stock(tipo, id, stock_real, motivo)` lo resuelve, con el modal `AjusteStockModal` (el mismo
para insumos y elaborados, por eso vive en `src/features/ajuste-stock/` y no adentro de ninguno de los
dos). Decisiones:

- **Se pide el stock real contado, no el delta.** Es lo que la persona tiene enfrente ("quedan 3
  botellas"); calcular la diferencia del lado del cliente es una fuente de errores de signo.
- **El motivo es obligatorio.** Un ajuste es justamente el movimiento que no tiene comprobante atrás (no
  hay compra ni venta que lo explique), así que el texto es el único rastro de por qué cambió el stock.
  Sin eso el historial miente por omisión.
- **`select ... for update`** sobre la fila: si dos personas ajustan el mismo insumo a la vez, la segunda
  espera y calcula su delta sobre el stock ya corregido en vez de pisar el ajuste de la primera.
- Permiso: `is_admin() or puede_editar_seccion('insumos'/'elaborados')` según el tipo.

**Relacionado:** [[Insumos]], [[Elaborados]], [[Gastos]], [[Ventas]], [[Arquitectura]], [[Index]]
