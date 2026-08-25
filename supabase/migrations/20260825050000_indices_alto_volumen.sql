-- Issue #8 del roadmap: las tablas que crecen para siempre (ventas,
-- pedidos, pedido_items, movimientos, gastos) no tenían ningún índice más
-- allá de la primary key -- hoy no se nota porque hay poco historial, pero
-- cada reporte por turno/fecha es un full scan que empeora solo con el
-- tiempo.
--
-- No se indexan las 32 foreign keys que están sin índice: cada índice
-- cuesta en cada INSERT/UPDATE, así que sólo van las columnas que alguna
-- consulta real filtra u ordena de verdad (verificado leyendo las queries
-- en src/features/*/api.ts y las funciones SQL). Quedan a propósito sin
-- índice las columnas de auditoría (creado_por, usuario_id, mozo_id,
-- cargado_por, abierto_por) -- nadie filtra por ellas -- y las tablas
-- chicas de catálogo (mesas, salones, empleados, profiles), donde un full
-- scan de unas decenas de filas es más barato que mantener el índice.
--
-- Los índices parciales (`where deleted_at is null`) van así porque TODAS
-- las consultas de esas tablas filtran los borrados: el índice queda más
-- chico y no indexa filas que nunca se leen.

-- ventas: cierre de turno (turno_id), listado y reportes por rango
-- (created_at, sirve en los dos sentidos porque Postgres puede recorrer un
-- índice al revés), y fn_anular_venta (pedido_id, para ver si queda otra
-- venta activa del mismo pedido en un pago dividido).
create index if not exists ventas_turno_id_idx on ventas (turno_id) where deleted_at is null;
create index if not exists ventas_created_at_idx on ventas (created_at) where deleted_at is null;
create index if not exists ventas_pedido_id_idx on ventas (pedido_id);

-- pedidos: reportes por turno, y fetchPedidoAbiertoDeMesa -- que corre en
-- cada toque de mesa en el Salón, es de las consultas más calientes.
create index if not exists pedidos_turno_id_idx on pedidos (turno_id);
create index if not exists pedidos_mesa_id_idx on pedidos (mesa_id) where deleted_at is null;

-- pedido_items: el más caliente de todos -- lo recorren fn_cobrar_pedido
-- (validación de stock + descuento), fn_anular_venta (reversión), el
-- ticket, y la reimpresión.
create index if not exists pedido_items_pedido_id_idx on pedido_items (pedido_id);
create index if not exists pedido_items_producto_id_idx on pedido_items (producto_id);

-- movimientos: el listado ordena por fecha desc; los joins a insumos y
-- elaborados filtran por su id.
create index if not exists movimientos_fecha_idx on movimientos (fecha desc);
create index if not exists movimientos_insumo_id_idx on movimientos (insumo_id);
create index if not exists movimientos_elaborado_id_idx on movimientos (elaborado_id);

-- gastos: listado por fecha y resumen por insumo.
create index if not exists gastos_fecha_idx on gastos (fecha desc) where deleted_at is null;
create index if not exists gastos_insumo_id_idx on gastos (insumo_id);

-- elaborados.producto_id: lo consultan fn_cobrar_pedido y fn_anular_venta
-- una vez POR ÍTEM del pedido, para decidir si el producto es un elaborado
-- o va por receta.
create index if not exists elaborados_producto_id_idx on elaborados (producto_id) where deleted_at is null;

-- recetas.insumo_id: producto_id ya está cubierto por el unique
-- (producto_id, insumo_id) al ser la primera columna; falta el sentido
-- inverso (qué recetas usan tal insumo).
create index if not exists recetas_insumo_id_idx on recetas (insumo_id);

-- facturas_electronicas.venta_id: VentasView trae el estado de factura de
-- cada venta del listado en el mismo select.
create index if not exists facturas_electronicas_venta_id_idx on facturas_electronicas (venta_id);

-- producciones.elaborado_id: historial de producción por elaborado.
create index if not exists producciones_elaborado_id_idx on producciones (elaborado_id);
