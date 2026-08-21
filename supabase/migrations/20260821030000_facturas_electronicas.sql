-- Registro de facturas pedidas por clientes puntuales (no la facturación
-- automática a ARCA de cada venta -- eso es aparte y todavía no está
-- conectado). Por ahora esto es solo la "memoria" de qué venta pidió
-- comprobante y a qué mail hay que mandárselo: cuando se conecte AfipSDK
-- de verdad, ese paso solo tiene que llenar cae/numero/pdf_url acá y
-- pasar estado a 'emitida', sin tocar el resto del flujo ya armado
-- (el botón, el modal, dónde vive el mail).
create table facturas_electronicas (
  id bigint generated always as identity primary key,
  venta_id bigint not null references ventas(id),
  cliente_id bigint references clientes(id),
  tipo_comprobante text not null default 'factura_b'
    check (tipo_comprobante in ('factura_a', 'factura_b', 'factura_c')),
  mail_envio text not null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'emitida', 'error')),
  cae text,
  cae_vencimiento date,
  numero bigint,
  pdf_url text,
  error_mensaje text,
  enviada_por_mail_at timestamptz,
  creado_por uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table facturas_electronicas enable row level security;

-- Mismo criterio que ventas/pedidos: cualquier staff activo puede pedir
-- una factura al cobrar, no es algo exclusivo de admin.
create policy "staff activo opera facturas_electronicas" on facturas_electronicas for all
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
  union all
  select 'factura_electronica', id, 'Factura venta #' || venta_id, deleted_at from facturas_electronicas where deleted_at is not null
  order by deleted_at desc;

alter view public.papelera set (security_invoker = on);
