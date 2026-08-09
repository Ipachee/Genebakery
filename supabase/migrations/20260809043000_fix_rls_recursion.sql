-- Las policies chequeaban rol/activo con "exists (select ... from profiles ...)"
-- directo adentro de la policy. Como esa subconsulta vuelve a pasar por RLS de
-- profiles, se disparaba a si misma -> "infinite recursion detected in policy".
--
-- Fix: dos funciones security definer (corren con permisos del dueño, sin pasar
-- por RLS) que hacen el chequeo una sola vez, y las policies llaman a la funcion
-- en vez de repetir la subconsulta.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and rol = 'admin'
  );
$$;

create or replace function public.is_active_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and activo
  );
$$;

-- profiles
drop policy if exists "ve su perfil, admin ve todos" on profiles;
create policy "ve su perfil, admin ve todos" on profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "admin actualiza perfiles" on profiles;
create policy "admin actualiza perfiles" on profiles for update
  using (public.is_admin());

-- staff activo (admin o mozo)
drop policy if exists "staff activo opera turnos" on turnos;
create policy "staff activo opera turnos" on turnos for all
  using (public.is_active_staff()) with check (public.is_active_staff());

drop policy if exists "staff activo opera salones" on salones;
create policy "staff activo opera salones" on salones for all
  using (public.is_active_staff()) with check (public.is_active_staff());

drop policy if exists "staff activo opera mesas" on mesas;
create policy "staff activo opera mesas" on mesas for all
  using (public.is_active_staff()) with check (public.is_active_staff());

drop policy if exists "staff activo lee productos" on productos;
create policy "staff activo lee productos" on productos for select
  using (public.is_active_staff());

drop policy if exists "staff activo opera pedidos" on pedidos;
create policy "staff activo opera pedidos" on pedidos for all
  using (public.is_active_staff()) with check (public.is_active_staff());

drop policy if exists "staff activo opera pedido_items" on pedido_items;
create policy "staff activo opera pedido_items" on pedido_items for all
  using (public.is_active_staff()) with check (public.is_active_staff());

drop policy if exists "staff activo crea ventas" on ventas;
create policy "staff activo crea ventas" on ventas for insert
  with check (public.is_active_staff());

drop policy if exists "staff activo lee ventas" on ventas;
create policy "staff activo lee ventas" on ventas for select
  using (public.is_active_staff());

drop policy if exists "staff activo lee/crea clientes" on clientes;
create policy "staff activo lee/crea clientes" on clientes for all
  using (public.is_active_staff()) with check (public.is_active_staff());

-- solo admin
drop policy if exists "solo admin opera insumos" on insumos;
create policy "solo admin opera insumos" on insumos for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "solo admin opera recetas" on recetas;
create policy "solo admin opera recetas" on recetas for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "solo admin opera elaborados" on elaborados;
create policy "solo admin opera elaborados" on elaborados for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "solo admin opera producciones" on producciones;
create policy "solo admin opera producciones" on producciones for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "solo admin opera gastos" on gastos;
create policy "solo admin opera gastos" on gastos for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "solo admin opera productos" on productos;
create policy "solo admin opera productos" on productos for insert
  with check (public.is_admin());

drop policy if exists "solo admin edita productos" on productos;
create policy "solo admin edita productos" on productos for update
  using (public.is_admin());

drop policy if exists "solo admin opera empleados" on empleados;
create policy "solo admin opera empleados" on empleados for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "solo admin lee movimientos" on movimientos;
create policy "solo admin lee movimientos" on movimientos for select
  using (public.is_admin());

drop policy if exists "sistema inserta movimientos" on movimientos;
create policy "sistema inserta movimientos" on movimientos for insert
  with check (public.is_active_staff());
