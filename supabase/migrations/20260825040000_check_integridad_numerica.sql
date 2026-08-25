-- Issue #4 del roadmap: ninguna tabla exigía stock/precio/cantidad/monto >= 0
-- a nivel de base -- un bug de UI o una llamada directa al RPC podía dejar
-- valores negativos sin que la base lo impidiera. Se verificó antes de
-- aplicar que no hay ninguna fila actual que viole estos checks.
--
-- movimientos.cantidad queda afuera a propósito: esa columna es un delta
-- con signo (negativo cuando descuenta, positivo cuando repone), no una
-- cantidad absoluta -- ponerle >= 0 rompería el diseño de la tabla.

alter table productos add constraint productos_precio_check check (precio >= 0);

alter table insumos add constraint insumos_stock_check check (stock >= 0);
alter table insumos add constraint insumos_stock_inicial_check check (stock_inicial >= 0);
alter table insumos add constraint insumos_costo_unit_check check (costo_unit >= 0);
alter table insumos add constraint insumos_stock_min_check check (stock_min >= 0);

alter table recetas add constraint recetas_cantidad_check check (cantidad > 0);

alter table elaborados add constraint elaborados_porciones_por_unidad_check check (porciones_por_unidad > 0);
alter table elaborados add constraint elaborados_stock_porciones_check check (stock_porciones >= 0);
alter table elaborados add constraint elaborados_costo_unit_porcion_check check (costo_unit_porcion >= 0);
alter table elaborados add constraint elaborados_porciones_min_check check (porciones_min >= 0);

alter table producciones add constraint producciones_cantidad_unidades_check check (cantidad_unidades > 0);

alter table pedido_items add constraint pedido_items_cantidad_check check (cantidad > 0);
alter table pedido_items add constraint pedido_items_precio_unitario_check check (precio_unitario >= 0);

alter table ventas add constraint ventas_subtotal_check check (subtotal >= 0);
alter table ventas add constraint ventas_descuento_check check (descuento >= 0);
alter table ventas add constraint ventas_total_check check (total >= 0);

alter table gastos add constraint gastos_cantidad_check check (cantidad > 0);
alter table gastos add constraint gastos_costo_total_check check (costo_total >= 0);
