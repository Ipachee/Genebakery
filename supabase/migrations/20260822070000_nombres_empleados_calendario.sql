-- El calendario de equipo lo ve cualquier staff activo (mozo incluido por
-- default), pero empleados es 100% admin-only -- ni el nombre se podía
-- leer, así que el calendario le mostraba "Empleado" genérico en vez del
-- nombre real a cualquiera que no fuera admin (o tuviera 'cobranzas'
-- tildado). En vez de abrir toda la tabla empleados (tiene DNI, sueldo,
-- fecha de ingreso), se expone solo id+nombre+apellido -- lo mínimo que
-- hace falta para identificar de quién es cada turno/vacación en el
-- calendario.
create or replace function public.fn_nombres_empleados()
returns table (id bigint, nombre text, apellido text)
language sql
security definer
set search_path = public
stable
as $$
  select e.id, e.nombre, e.apellido
  from empleados e
  where e.deleted_at is null
    and exists (select 1 from profiles p where p.id = auth.uid() and p.activo);
$$;

revoke execute on function public.fn_nombres_empleados() from public;
grant execute on function public.fn_nombres_empleados() to authenticated;
