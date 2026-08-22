-- Extiende el modelo de "Ver" (menú)/"Editar" (agregar/editar/borrar) a
-- las secciones de back-office que hasta ahora eran 100% admin-only (o
-- staff-wide sin ningún control) tanto para lectura como escritura.
-- Antes de esto, tildar "Ver" en el panel de permisos para, por ejemplo,
-- Insumos, no alcanzaba: la tabla ni siquiera se podía LEER bajo RLS
-- (quedaba en blanco), y la escritura era todo-o-nada según el rol fuera
-- admin. Acá se separa en dos: lectura sigue el tick de "Ver", escritura
-- exige el tick de "Editar" (puede_editar_seccion, ya usado por
-- Calendario desde la migración anterior).
--
-- Ojo: salón/comandera/productos/categorías/ventas tienen partes que
-- son operación normal de mozo (tomar pedidos, ver el total del turno) y
-- NO se tocan acá -- solo se separa lo que es específicamente "administrar
-- la sección" (plano del salón, alta de insumos/proveedores/etc, editar
-- una venta ya cobrada).

create or replace function public.puede_ver_seccion(p_seccion text)
returns boolean
language sql
stable security definer
set search_path = public
as $$
  select case
    when is_admin() then true
    when not is_active_staff() then false
    else exists (
      select 1 from permisos_navegacion pn
      join profiles p on p.rol = pn.rol
      where p.id = auth.uid() and pn.seccion_id = p_seccion and pn.visible
    )
  end;
$$;

-- Salón: mesas/salones/elementos_decorativos. La lectura sigue abierta a
-- cualquier staff activo (Comandera necesita ver las mesas para asignar
-- pedidos, sin importar si tiene o no el tick de Salón); solo la edición
-- del plano (mover, agregar, borrar mesas/salones/decoración) exige admin
-- o el tick de "Editar" en Salón.
drop policy if exists "staff activo opera mesas" on public.mesas;
create policy "staff activo lee mesas" on public.mesas for select using (is_active_staff());
create policy "editar plano mesas" on public.mesas for all
  using (is_admin() or puede_editar_seccion('salon'))
  with check (is_admin() or puede_editar_seccion('salon'));

drop policy if exists "staff activo opera salones" on public.salones;
create policy "staff activo lee salones" on public.salones for select using (is_active_staff());
create policy "editar plano salones" on public.salones for all
  using (is_admin() or puede_editar_seccion('salon'))
  with check (is_admin() or puede_editar_seccion('salon'));

drop policy if exists "staff activo opera elementos_decorativos" on public.elementos_decorativos;
create policy "staff activo lee elementos_decorativos" on public.elementos_decorativos for select using (is_active_staff());
create policy "editar plano elementos_decorativos" on public.elementos_decorativos for all
  using (is_admin() or puede_editar_seccion('salon'))
  with check (is_admin() or puede_editar_seccion('salon'));

-- Insumos: antes 100% admin (ni lectura). Ver = leer stock; Editar = alta/edición.
drop policy if exists "solo admin opera insumos" on public.insumos;
create policy "ver seccion insumos lee insumos" on public.insumos for select using (puede_ver_seccion('insumos'));
create policy "editar seccion insumos" on public.insumos for all
  using (is_admin() or puede_editar_seccion('insumos'))
  with check (is_admin() or puede_editar_seccion('insumos'));

-- Empleados: ya había una policy de lectura acotada a Cobranzas -- se
-- agrega una lectura más amplia si además tienen "Ver" tildado en la
-- sección Empleados, y se reemplaza el "todo admin" por Editar.
drop policy if exists "solo admin opera empleados" on public.empleados;
create policy "ver seccion empleados lee empleados" on public.empleados for select using (puede_ver_seccion('empleados'));
create policy "editar seccion empleados" on public.empleados for all
  using (is_admin() or puede_editar_seccion('empleados'))
  with check (is_admin() or puede_editar_seccion('empleados'));

-- Elaborados y producciones: antes 100% admin.
drop policy if exists "solo admin opera elaborados" on public.elaborados;
create policy "ver seccion elaborados lee elaborados" on public.elaborados for select using (puede_ver_seccion('elaborados'));
create policy "editar seccion elaborados" on public.elaborados for all
  using (is_admin() or puede_editar_seccion('elaborados'))
  with check (is_admin() or puede_editar_seccion('elaborados'));

drop policy if exists "solo admin opera producciones" on public.producciones;
create policy "ver seccion elaborados lee producciones" on public.producciones for select using (puede_ver_seccion('elaborados'));
create policy "editar seccion elaborados producciones" on public.producciones for all
  using (is_admin() or puede_editar_seccion('elaborados'))
  with check (is_admin() or puede_editar_seccion('elaborados'));

-- Recetas (líneas de ingrediente) y productos (el plato/producto en sí,
-- que se crea/pausa desde la pantalla de Recetas). La lectura de
-- productos queda IGUAL que antes (staff activo, sin condicionar a
-- ningún tick) porque alimenta el menú de Comandar pedidos para
-- cualquiera -- solo se toca la escritura.
drop policy if exists "solo admin opera recetas" on public.recetas;
create policy "ver seccion recetas lee recetas" on public.recetas for select using (puede_ver_seccion('recetas'));
create policy "editar seccion recetas" on public.recetas for all
  using (is_admin() or puede_editar_seccion('recetas'))
  with check (is_admin() or puede_editar_seccion('recetas'));

drop policy if exists "solo admin opera productos" on public.productos;
drop policy if exists "solo admin edita productos" on public.productos;
create policy "editar seccion recetas productos" on public.productos for all
  using (is_admin() or puede_editar_seccion('recetas'))
  with check (is_admin() or puede_editar_seccion('recetas'));

-- Proveedores y sus facturas: antes 100% admin.
drop policy if exists "admin gestiona proveedores" on public.proveedores;
create policy "ver seccion proveedores lee proveedores" on public.proveedores for select using (puede_ver_seccion('proveedores'));
create policy "editar seccion proveedores" on public.proveedores for all
  using (is_admin() or puede_editar_seccion('proveedores'))
  with check (is_admin() or puede_editar_seccion('proveedores'));

drop policy if exists "admin gestiona facturas de proveedor" on public.facturas_proveedor;
create policy "ver seccion proveedores lee facturas" on public.facturas_proveedor for select using (puede_ver_seccion('proveedores'));
create policy "editar seccion proveedores facturas" on public.facturas_proveedor for all
  using (is_admin() or puede_editar_seccion('proveedores'))
  with check (is_admin() or puede_editar_seccion('proveedores'));

-- Categorías: la lectura queda staff-wide como estaba (alimenta las
-- pestañas de categoría al comandar, para cualquiera). Solo se separa
-- la escritura.
drop policy if exists "solo admin crea categorias" on public.categorias;
drop policy if exists "solo admin edita categorias" on public.categorias;
create policy "editar seccion categorias" on public.categorias for all
  using (is_admin() or puede_editar_seccion('categorias'))
  with check (is_admin() or puede_editar_seccion('categorias'));

-- Movimientos: son de solo lectura desde la UI (se generan solos) --
-- antes solo admin podía verlos, ahora también quien tenga "Ver".
drop policy if exists "solo admin lee movimientos" on public.movimientos;
create policy "ver seccion movimientos lee movimientos" on public.movimientos for select using (puede_ver_seccion('movimientos'));

-- Gastos: antes 100% admin.
drop policy if exists "solo admin opera gastos" on public.gastos;
create policy "ver seccion gastos lee gastos" on public.gastos for select using (puede_ver_seccion('gastos'));
create policy "editar seccion gastos" on public.gastos for all
  using (is_admin() or puede_editar_seccion('gastos'))
  with check (is_admin() or puede_editar_seccion('gastos'));

-- Ventas: alta sigue abierta a cualquier staff activo (es parte del
-- cobro normal, no de "administrar la sección Ventas"); solo editar
-- método de pago o borrar una venta ya cargada pasa a exigir el tick.
drop policy if exists "admin edita y borra ventas" on public.ventas;
create policy "editar seccion ventas" on public.ventas for update
  using (is_admin() or puede_editar_seccion('ventas'))
  with check (is_admin() or puede_editar_seccion('ventas'));
create policy "borrar seccion ventas" on public.ventas for delete
  using (is_admin() or puede_editar_seccion('ventas'));

-- Cobranzas: hasta acá el tick de "Ver" (visible) ya daba lectura Y
-- escritura completa sobre pagos_empleados -- se separa para que solo
-- "Editar" habilite cargar/editar/borrar un pago, "Ver" only deja mirar
-- la tabla nomás.
drop policy if exists "admin o permiso tildado crea pagos_empleados" on public.pagos_empleados;
create policy "editar seccion cobranzas crea pagos" on public.pagos_empleados for insert
  with check (is_admin() or puede_editar_seccion('cobranzas'));

drop policy if exists "admin o permiso tildado edita pagos_empleados" on public.pagos_empleados;
create policy "editar seccion cobranzas edita pagos" on public.pagos_empleados for update
  using (is_admin() or puede_editar_seccion('cobranzas'))
  with check (is_admin() or puede_editar_seccion('cobranzas'));

drop policy if exists "admin o permiso tildado borra pagos_empleados" on public.pagos_empleados;
create policy "editar seccion cobranzas borra pagos" on public.pagos_empleados for delete
  using (is_admin() or puede_editar_seccion('cobranzas'));
