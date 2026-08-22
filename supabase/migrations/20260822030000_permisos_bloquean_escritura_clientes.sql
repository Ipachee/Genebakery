-- "Esa persona no puede hacer nada que no sea tildable" -- el panel de
-- Roles y permisos hoy solo controla qué VE cada rol en el menú, pero
-- clientes tenía una policy "para cualquier staff activo" que dejaba
-- escribir (insert/update/delete) sin pasar por ese panel para nada,
-- rol encargado incluido. Se agrega una función reutilizable que chequea
-- el panel de permisos para el rol 'encargado' específicamente (admin y
-- mozo no cambian en nada -- siguen con acceso total como siempre) y se
-- usa para gatear la escritura de clientes. Pensada para reusarse el día
-- que se agregue otra sección "de staff amplio" al panel (ej. una futura
-- solapa de Cobros).
create or replace function public.puede_operar_seccion(p_seccion text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select case
    when not exists (select 1 from profiles p where p.id = auth.uid() and p.activo) then false
    when (select rol from profiles where id = auth.uid()) <> 'encargado' then true
    else exists (
      select 1 from permisos_navegacion pn
      where pn.rol = 'encargado' and pn.seccion_id = p_seccion and pn.visible
    )
  end;
$$;

revoke execute on function public.puede_operar_seccion(text) from public;
grant execute on function public.puede_operar_seccion(text) to authenticated;

drop policy "staff activo lee/crea clientes" on clientes;

create policy "staff activo lee clientes" on clientes for select
  using (is_active_staff());

create policy "staff activo crea clientes" on clientes for insert
  with check (is_active_staff() and public.puede_operar_seccion('clientes'));

create policy "staff activo actualiza clientes" on clientes for update
  using (is_active_staff() and public.puede_operar_seccion('clientes'))
  with check (is_active_staff() and public.puede_operar_seccion('clientes'));

create policy "staff activo borra clientes" on clientes for delete
  using (is_active_staff() and public.puede_operar_seccion('clientes'));
