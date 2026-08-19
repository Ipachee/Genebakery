-- Carga de proveedores y facturas de compra (no factura electrónica de venta
-- -- es simple registro manual: "le compramos tal cosa a tal proveedor, por
-- tanta plata, tal fecha", para poder despues buscar por proveedor y ver
-- todo lo que se le cargo). Solo administrador, mismo patron de RLS que
-- insumos.
create table proveedores (
  id bigint generated always as identity primary key,
  nombre text not null,
  cuit text,
  telefono text,
  email text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table facturas_proveedor (
  id bigint generated always as identity primary key,
  proveedor_id bigint not null references proveedores(id),
  numero_factura text,
  fecha date not null,
  monto numeric(10, 2) not null,
  cargado_por uuid references profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index facturas_proveedor_proveedor_id_idx on facturas_proveedor(proveedor_id);

alter table proveedores enable row level security;
alter table facturas_proveedor enable row level security;

create policy "admin gestiona proveedores" on proveedores for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.activo and p.rol = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.activo and p.rol = 'admin'));

create policy "admin gestiona facturas de proveedor" on facturas_proveedor for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.activo and p.rol = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.activo and p.rol = 'admin'));

-- Se suman las dos tablas nuevas a la papelera. create or replace view no
-- garantiza mantener security_invoker (que ya se había activado en
-- 20260809041500_fix_papelera_security_invoker.sql) asi que se reafirma
-- explicito aca -- sin esto, la vista volveria a correr con los permisos de
-- su dueño en vez de los de quien la consulta, salteandose el RLS de admin
-- que se acaba de definir arriba para estas dos tablas nuevas.
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
  order by deleted_at desc;

alter view public.papelera set (security_invoker = on);
