-- Calendario de equipo: una sola tabla para las 3 cosas que pidió el
-- usuario (quién trabaja qué turno cada día, vacaciones, y eventos
-- generales), distinguidas por "tipo" -- así el frontend arma UNA vista de
-- calendario en vez de tres pantallas separadas. Las horas trabajadas se
-- derivan de los turno_asignado (turno + día), no hace falta una carga de
-- horas aparte.
create table calendario_equipo (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('turno_asignado', 'vacaciones', 'evento')),
  fecha_inicio date not null,
  fecha_fin date not null,
  empleado_id bigint references empleados(id),
  turno_etiqueta text check (turno_etiqueta in ('Mañana', 'Tarde', 'Noche')),
  titulo text,
  nota text,
  creado_por uuid references profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint calendario_equipo_fechas check (fecha_fin >= fecha_inicio),
  -- turno_asignado y vacaciones son siempre de un empleado puntual; evento
  -- es general (feriado, reunión de equipo) y no necesita uno.
  constraint calendario_equipo_campos check (
    (tipo = 'turno_asignado' and empleado_id is not null and turno_etiqueta is not null)
    or (tipo = 'vacaciones' and empleado_id is not null)
    or (tipo = 'evento' and titulo is not null)
  )
);

alter table calendario_equipo enable row level security;

-- Cualquier staff activo lo puede VER (para que el equipo entero sepa cómo
-- viene la semana), pero solo admin lo puede cargar/editar/borrar -- el
-- dueño o quien maneje RRHH entra con la cuenta de admin para esto.
create policy "staff activo lee calendario_equipo" on calendario_equipo for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.activo));

create policy "admin inserta calendario_equipo" on calendario_equipo for insert
  with check (public.is_admin());

create policy "admin actualiza calendario_equipo" on calendario_equipo for update
  using (public.is_admin()) with check (public.is_admin());

create policy "admin borra calendario_equipo" on calendario_equipo for delete
  using (public.is_admin());

create index calendario_equipo_rango_idx on calendario_equipo (fecha_inicio, fecha_fin) where deleted_at is null;

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
  union all
  select 'calendario_equipo', id,
    case tipo
      when 'evento' then titulo
      else (select nombre || ' ' || apellido from empleados where id = calendario_equipo.empleado_id) || ' — ' ||
        (case tipo when 'vacaciones' then 'Vacaciones' else turno_etiqueta end)
    end,
    deleted_at
  from calendario_equipo where deleted_at is not null
  order by deleted_at desc;

alter view public.papelera set (security_invoker = on);
