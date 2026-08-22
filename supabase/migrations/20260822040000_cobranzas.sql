-- Cobranzas: registro simple de pagos a empleados (sueldo, adelantos,
-- etc.) -- "se carga el empleado, con sus pagos", nada más por ahora; el
-- usuario va a pedir campos más específicos más adelante. Vive en Finanzas
-- en el menú, y es una sección más del panel de Roles y permisos (tildable
-- para mozo o para el rol RRHH) -- a diferencia de clientes (que mozo ya
-- podía escribir desde antes), acá NINGÚN rol que no sea admin tiene
-- acceso hasta que admin lo tilde explícitamente en el panel.
create table pagos_empleados (
  id bigint generated always as identity primary key,
  empleado_id bigint not null references empleados(id),
  monto numeric(10,2) not null,
  fecha date not null default current_date,
  concepto text,
  metodo_pago text,
  creado_por uuid references profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table pagos_empleados enable row level security;

create policy "admin o permiso tildado lee pagos_empleados" on pagos_empleados for select
  using (
    public.is_admin() or exists (
      select 1 from profiles p
      join permisos_navegacion pn on pn.rol = p.rol
      where p.id = auth.uid() and p.activo and pn.seccion_id = 'cobranzas' and pn.visible
    )
  );

create policy "admin o permiso tildado crea pagos_empleados" on pagos_empleados for insert
  with check (
    public.is_admin() or exists (
      select 1 from profiles p
      join permisos_navegacion pn on pn.rol = p.rol
      where p.id = auth.uid() and p.activo and pn.seccion_id = 'cobranzas' and pn.visible
    )
  );

create policy "admin o permiso tildado borra pagos_empleados" on pagos_empleados for delete
  using (
    public.is_admin() or exists (
      select 1 from profiles p
      join permisos_navegacion pn on pn.rol = p.rol
      where p.id = auth.uid() and p.activo and pn.seccion_id = 'cobranzas' and pn.visible
    )
  );

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
  union all
  select 'pago_empleado', id,
    (select nombre || ' ' || apellido from empleados where id = pagos_empleados.empleado_id) || ' — ' || monto::text,
    deleted_at
  from pagos_empleados where deleted_at is not null
  order by deleted_at desc;

alter view public.papelera set (security_invoker = on);
