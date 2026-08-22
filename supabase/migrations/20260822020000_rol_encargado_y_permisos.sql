-- Tercer rol "encargado" (nombre editable después, ver roles_personalizados)
-- para una persona de confianza que no es ni mozo de turno ni el dueño.
-- Reemplaza el hardcodeo de "qué sección ve cada rol" (que vivía fijo en
-- nav.ts) por una tabla que admin puede tildar/destildar desde Ajustes.
-- Admin siempre ve todo (no pasa por esta tabla) para no poder auto-
-- bloquearse la propia pantalla de permisos.
alter table profiles drop constraint profiles_rol_check;
alter table profiles add constraint profiles_rol_check check (rol in ('admin', 'mozo', 'encargado'));

-- Etiqueta visible del rol nuevo, editable sin tocar código (el usuario
-- todavía no definió el puesto real de esta persona). Legible sin login
-- (la pantalla de login la necesita para mostrar el cartel de la cuenta),
-- por eso el select es público -- no hay nada sensible en esta tabla.
create table roles_personalizados (
  clave text primary key,
  etiqueta text not null,
  icono text not null default '👤'
);

insert into roles_personalizados (clave, etiqueta, icono) values ('encargado', 'Encargado', '🗂️');

alter table roles_personalizados enable row level security;

create policy "cualquiera lee roles_personalizados" on roles_personalizados for select
  using (true);

create policy "admin actualiza roles_personalizados" on roles_personalizados for update
  using (public.is_admin()) with check (public.is_admin());

-- Qué sección del menú ve cada rol. Solo mozo/encargado tienen filas acá --
-- admin no, a propósito (ver arriba). Sin fila para una combinación
-- rol+sección = no visible.
create table permisos_navegacion (
  rol text not null check (rol in ('mozo', 'encargado')),
  seccion_id text not null,
  visible boolean not null default true,
  primary key (rol, seccion_id)
);

alter table permisos_navegacion enable row level security;

create policy "staff activo lee permisos_navegacion" on permisos_navegacion for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.activo));

create policy "admin escribe permisos_navegacion" on permisos_navegacion for insert
  with check (public.is_admin());

create policy "admin actualiza permisos_navegacion" on permisos_navegacion for update
  using (public.is_admin()) with check (public.is_admin());

-- Semilla = el comportamiento hardcodeado de hoy (mozo ve Salón/Comandera/
-- Calendario, nada más), para que esta migración no cambie nada visible
-- hasta que admin empiece a tildar cosas nuevas para encargado.
insert into permisos_navegacion (rol, seccion_id, visible) values
  ('mozo', 'salon', true),
  ('mozo', 'comandera', true),
  ('mozo', 'calendario', true);
