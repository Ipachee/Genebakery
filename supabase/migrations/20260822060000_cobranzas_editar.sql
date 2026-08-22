-- Faltaba la policy de UPDATE en pagos_empleados (la migración original
-- solo cubrió select/insert/delete) -- se necesita para poder editar un
-- pago cargado con un error, sin tener que borrarlo y cargarlo de nuevo.
create policy "admin o permiso tildado edita pagos_empleados" on pagos_empleados for update
  using (
    public.is_admin() or exists (
      select 1 from profiles p
      join permisos_navegacion pn on pn.rol = p.rol
      where p.id = auth.uid() and p.activo and pn.seccion_id = 'cobranzas' and pn.visible
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from profiles p
      join permisos_navegacion pn on pn.rol = p.rol
      where p.id = auth.uid() and p.activo and pn.seccion_id = 'cobranzas' and pn.visible
    )
  );
