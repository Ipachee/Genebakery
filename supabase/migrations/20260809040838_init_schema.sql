-- ComandaCafé — esquema inicial
-- 16 tablas + vista papelera + RLS de ejemplo, según diseño revisado con el dueño del proyecto.

-- IDENTIDAD ---------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  apellido text not null,
  rol text not null check (rol in ('admin','mozo')),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table turnos (
  id bigint generated always as identity primary key,
  abierto_por uuid not null references profiles(id),
  etiqueta text not null default 'Turno',
  abierto_at timestamptz not null default now(),
  cerrado_at timestamptz,
  estado text not null default 'abierto' check (estado in ('abierto','cerrado'))
);

-- PERSONAS -----------------------------------------------------
create table clientes (
  id bigint generated always as identity primary key,
  nombre text not null, apellido text not null,
  dni text, cuit text, direccion text,
  condicion_fiscal text, email text,
  descuento_pct numeric(5,2) not null default 0,
  visitas int not null default 0,
  total_gastado numeric(10,2) not null default 0,
  deleted_at timestamptz
);

create table empleados (
  id bigint generated always as identity primary key,
  profile_id uuid references profiles(id),
  nombre text not null, apellido text not null,
  dni text, cuit text, direccion text,
  puesto text, ingreso date,
  descuento_pct numeric(5,2) not null default 0,
  deleted_at timestamptz
);

-- SALÓN ----------------------------------------------------------
create table salones (
  id bigint generated always as identity primary key,
  nombre text not null,
  x int not null, y int not null, w int not null, h int not null,
  tag text, orden int not null default 0,
  deleted_at timestamptz
);

create table mesas (
  id bigint generated always as identity primary key,
  salon_id bigint not null references salones(id),
  mesa_padre_id bigint references mesas(id),
  label text,
  x int not null, y int not null, w int not null, h int not null,
  shape text not null default 'square' check (shape in ('square','round')),
  deleted_at timestamptz
);

-- MENÚ Y COSTEO --------------------------------------------------
create table productos (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  categoria text not null check (categoria in ('bebida','comida','pasteleria')),
  precio numeric(10,2) not null,
  activo boolean not null default true,
  deleted_at timestamptz
);

create table insumos (
  id bigint generated always as identity primary key,
  nombre text not null, unidad text not null,
  stock numeric(10,3) not null default 0,
  stock_inicial numeric(10,3) not null default 0,
  costo_unit numeric(10,2) not null default 0,
  stock_min numeric(10,3) not null default 0,
  deleted_at timestamptz
);

create table recetas (
  id bigint generated always as identity primary key,
  producto_id bigint not null references productos(id),
  insumo_id bigint not null references insumos(id),
  cantidad numeric(10,4) not null,
  unique (producto_id, insumo_id)
);

create table elaborados (
  id bigint generated always as identity primary key,
  producto_id bigint not null references productos(id),
  nombre text not null,
  porciones_por_unidad int not null,
  stock_porciones numeric(10,2) not null default 0,
  costo_unit_porcion numeric(10,2) not null default 0,
  porciones_min numeric(10,2) not null default 0,
  deleted_at timestamptz
);

create table producciones (
  id bigint generated always as identity primary key,
  elaborado_id bigint not null references elaborados(id),
  fecha date not null default current_date,
  cantidad_unidades numeric(10,2) not null,
  costo_total numeric(10,2) not null,
  usuario_id uuid not null references profiles(id),
  deleted_at timestamptz
);

-- OPERACIÓN --------------------------------------------------------
create table pedidos (
  id bigint generated always as identity primary key,
  mesa_id bigint references mesas(id),
  turno_id bigint not null references turnos(id),
  mozo_id uuid not null references profiles(id),
  cliente_id bigint references clientes(id),
  estado text not null default 'abierto'
    check (estado in ('abierto','enviado_cocina','cobrado','cancelado')),
  subtotal numeric(10,2) not null default 0,
  descuento numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  metodo_pago text,
  created_at timestamptz not null default now(),
  cobrado_at timestamptz,
  deleted_at timestamptz
);

create table pedido_items (
  id bigint generated always as identity primary key,
  pedido_id bigint not null references pedidos(id) on delete cascade,
  producto_id bigint not null references productos(id),
  cantidad numeric(10,2) not null default 1,
  precio_unitario numeric(10,2) not null,
  nota text,
  enviado_cocina boolean not null default false,
  created_at timestamptz not null default now()
);

-- REGISTRO FINANCIERO ------------------------------------------------
create table ventas (
  id bigint generated always as identity primary key,
  pedido_id bigint not null references pedidos(id),
  turno_id bigint not null references turnos(id),
  mesa_id bigint references mesas(id),
  cliente_id bigint references clientes(id),
  mozo_id uuid not null references profiles(id),
  subtotal numeric(10,2) not null,
  descuento numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  metodo_pago text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table gastos (
  id bigint generated always as identity primary key,
  fecha date not null default current_date,
  insumo_id bigint not null references insumos(id),
  cantidad numeric(10,3) not null,
  costo_total numeric(10,2) not null,
  proveedor text,
  usuario_id uuid not null references profiles(id),
  deleted_at timestamptz
);

create table movimientos (
  id bigint generated always as identity primary key,
  fecha timestamptz not null default now(),
  insumo_id bigint references insumos(id),
  elaborado_id bigint references elaborados(id),
  tipo text not null check (tipo in ('compra','venta','produccion','ajuste')),
  cantidad numeric(10,3) not null,
  stock_resultante numeric(10,3) not null,
  ref text
);

-- VISTA PAPELERA (une todo lo que tiene deleted_at) -------------------
create view papelera as
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
  order by deleted_at desc;

-- ROW LEVEL SECURITY ---------------------------------------------------
alter table profiles enable row level security;
alter table turnos enable row level security;
alter table clientes enable row level security;
alter table empleados enable row level security;
alter table salones enable row level security;
alter table mesas enable row level security;
alter table productos enable row level security;
alter table insumos enable row level security;
alter table recetas enable row level security;
alter table elaborados enable row level security;
alter table producciones enable row level security;
alter table pedidos enable row level security;
alter table pedido_items enable row level security;
alter table ventas enable row level security;
alter table gastos enable row level security;
alter table movimientos enable row level security;

create policy "ve su perfil, admin ve todos" on profiles for select
  using (auth.uid() = id or exists (
    select 1 from profiles p where p.id = auth.uid() and p.rol = 'admin'
  ));
create policy "admin actualiza perfiles" on profiles for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.rol = 'admin'));

-- Staff activo (admin o mozo) opera el día a día del salón
create policy "staff activo opera turnos" on turnos for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.activo))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.activo));
create policy "staff activo opera salones" on salones for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.activo))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.activo));
create policy "staff activo opera mesas" on mesas for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.activo))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.activo));
create policy "staff activo lee productos" on productos for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.activo));
create policy "staff activo opera pedidos" on pedidos for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.activo))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.activo));
create policy "staff activo opera pedido_items" on pedido_items for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.activo))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.activo));
create policy "staff activo crea ventas" on ventas for insert
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.activo));
create policy "staff activo lee ventas" on ventas for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.activo));
create policy "staff activo lee/crea clientes" on clientes for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.activo))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.activo));

-- Solo admin: costos, insumos, recetas, elaborados, gastos, movimientos, empleados
create policy "solo admin opera insumos" on insumos for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.rol = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.rol = 'admin'));
create policy "solo admin opera recetas" on recetas for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.rol = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.rol = 'admin'));
create policy "solo admin opera elaborados" on elaborados for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.rol = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.rol = 'admin'));
create policy "solo admin opera producciones" on producciones for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.rol = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.rol = 'admin'));
create policy "solo admin opera gastos" on gastos for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.rol = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.rol = 'admin'));
create policy "solo admin opera productos" on productos for insert
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.rol = 'admin'));
create policy "solo admin edita productos" on productos for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.rol = 'admin'));
create policy "solo admin opera empleados" on empleados for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.rol = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.rol = 'admin'));
create policy "solo admin lee movimientos" on movimientos for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.rol = 'admin'));
create policy "sistema inserta movimientos" on movimientos for insert
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.activo));
