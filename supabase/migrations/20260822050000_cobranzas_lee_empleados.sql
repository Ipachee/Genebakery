-- Cobranzas necesita mostrar la lista de empleados para elegir a quién se
-- le paga, pero empleados es 100% admin-only (ni SELECT). Se agrega una
-- policy de solo lectura para quien tenga 'cobranzas' tildado en el panel
-- de permisos -- no toca nada de admin (que ya tenía acceso total) ni
-- habilita escribir empleados desde acá.
create policy "permiso cobranzas lee empleados" on empleados for select
  using (
    public.is_admin() or exists (
      select 1 from profiles p
      join permisos_navegacion pn on pn.rol = p.rol
      where p.id = auth.uid() and p.activo and pn.seccion_id = 'cobranzas' and pn.visible
    )
  );
