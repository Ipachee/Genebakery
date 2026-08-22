-- Hasta acá `permisos_navegacion.visible` era la única perilla: si estaba
-- tildado, el rol veía Y podía operar la sección (para las pocas
-- secciones que ya tenían escritura gateada por esto, como Cobranzas).
-- Pero el calendario de equipo es un caso real de "ver sí, editar no": un
-- mozo puede necesitar ver quién trabaja qué turno, sin poder arrastrar
-- turnos ni cargar vacaciones -- eso se lo reservamos a RRHH. Y a futuro
-- puede pasar lo mismo con otras secciones, así que se agrega como una
-- segunda columna genérica, no algo hardcodeado solo para calendario.
alter table public.permisos_navegacion
  add column puede_editar boolean not null default false;

-- Espejo de puede_operar_seccion, pero para la columna nueva -- acá SÍ se
-- exige el tick explícito para mozo también (a diferencia de
-- puede_operar_seccion, que preserva el acceso histórico de mozo a
-- clientes sin tick). No hay comportamiento previo de "mozo edita
-- calendario" que preservar: hoy es 100% admin-only.
create or replace function public.puede_editar_seccion(p_seccion text)
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
      where p.id = auth.uid() and pn.seccion_id = p_seccion and pn.puede_editar
    )
  end;
$$;

drop policy if exists "admin actualiza calendario_equipo" on public.calendario_equipo;
create policy "editar calendario_equipo" on public.calendario_equipo
  for update using (is_admin() or puede_editar_seccion('calendario'))
  with check (is_admin() or puede_editar_seccion('calendario'));

drop policy if exists "admin borra calendario_equipo" on public.calendario_equipo;
create policy "borrar calendario_equipo" on public.calendario_equipo
  for delete using (is_admin() or puede_editar_seccion('calendario'));

drop policy if exists "admin inserta calendario_equipo" on public.calendario_equipo;
create policy "insertar calendario_equipo" on public.calendario_equipo
  for insert with check (is_admin() or puede_editar_seccion('calendario'));
