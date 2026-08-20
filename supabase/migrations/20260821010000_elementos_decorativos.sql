-- Las puertas y la barra del plano estaban hardcodeadas en el frontend
-- (arrays DOORS/BARRA en SalonView.tsx) y eran puramente visuales, sin
-- posición en la base -- al mover/agrandar un salón a mano, esas marcas se
-- quedaban clavadas en su lugar original y dejaban de coincidir con el
-- salón real. Se pasan a una tabla editable, mismo patrón que salones y
-- mesas, para poder moverlas/redimensionarlas junto con el resto del plano.
create table elementos_decorativos (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('puerta', 'barra')),
  x int not null, y int not null, w int not null, h int not null,
  deleted_at timestamptz
);

-- Posiciones originales del plano real (las mismas que tenían los arrays
-- hardcodeados), para que el cambio no mueva nada visualmente al desplegar.
insert into elementos_decorativos (tipo, x, y, w, h) values
  ('puerta', 298, 95, 6, 26),
  ('puerta', 653, 95, 6, 26),
  ('puerta', 140, 203, 26, 6),
  ('puerta', 55, 318, 26, 6),
  ('puerta', 55, 403, 26, 6),
  ('barra', 760, 205, 340, 16);

alter table elementos_decorativos enable row level security;

create policy "staff activo opera elementos_decorativos" on elementos_decorativos for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.activo))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.activo));

create or replace view papelera as
  select 'insumo' as tipo, id, nombre as resumen, deleted_at from insumos where deleted_at is not null
  union all
  select 'producto', id, nombre, deleted_at from productos where deleted_at is not null
  union all
  select 'mesa', id, coalesce(label, 'Mesa ' || id), deleted_at from mesas where deleted_at is not null
  union all
  select 'salon', id, nombre, deleted_at from salones where deleted_at is not null
  union all
  select 'cliente', id, nombre || ' ' || apellido, deleted_at from clientes where deleted_at is not null
  union all
  select 'empleado', id, nombre || ' ' || apellido, deleted_at from empleados where deleted_at is not null
  union all
  select 'elaborado', id, nombre, deleted_at from elaborados where deleted_at is not null
  union all
  select 'produccion', id, 'Producción #' || id, deleted_at from producciones where deleted_at is not null
  union all
  select 'pedido', id, 'Pedido #' || id, deleted_at from pedidos where deleted_at is not null
  union all
  select 'venta', id, 'Venta #' || id, deleted_at from ventas where deleted_at is not null
  union all
  select 'gasto', id, 'Gasto #' || id, deleted_at from gastos where deleted_at is not null
  union all
  select 'proveedor', id, nombre, deleted_at from proveedores where deleted_at is not null
  union all
  select 'factura_proveedor', id, coalesce('Factura ' || numero_factura, 'Factura #' || id), deleted_at from facturas_proveedor where deleted_at is not null
  union all
  select 'categoria', id, nombre, deleted_at from categorias where deleted_at is not null
  union all
  select 'elemento_decorativo', id, initcap(tipo) || ' #' || id, deleted_at from elementos_decorativos where deleted_at is not null
  order by deleted_at desc;

alter view public.papelera set (security_invoker = on);
