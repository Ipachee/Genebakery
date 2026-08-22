-- Habilita cargos custom (más allá de admin/mozo/encargado) creados desde
-- + Nuevo cargo. `profiles.rol` y `permisos_navegacion.rol` tenían un
-- CHECK que solo permitía esos 3 valores fijos -- un CHECK no puede
-- validar contra otra tabla, así que se reemplaza por un trigger que
-- exige que el rol sea 'admin'/'mozo' o exista como fila en
-- roles_personalizados (que es donde + Nuevo cargo va a insertar el
-- cargo nuevo antes de crear el profile).

alter table public.profiles drop constraint if exists profiles_rol_check;

create or replace function public.rol_valido(p_rol text)
returns boolean
language sql
stable
as $$
  select p_rol in ('admin', 'mozo') or exists (select 1 from roles_personalizados where clave = p_rol);
$$;

create or replace function public.validar_rol_profile()
returns trigger
language plpgsql
as $$
begin
  if not public.rol_valido(new.rol) then
    raise exception 'rol "%" no existe -- creá el cargo primero desde Ajustes → Roles y permisos', new.rol;
  end if;
  return new;
end;
$$;

drop trigger if exists validar_rol_profile on public.profiles;
create trigger validar_rol_profile
  before insert or update of rol on public.profiles
  for each row execute function public.validar_rol_profile();

alter table public.permisos_navegacion drop constraint if exists permisos_navegacion_rol_check;

create or replace function public.validar_rol_permiso()
returns trigger
language plpgsql
as $$
begin
  if not (new.rol = 'mozo' or exists (select 1 from roles_personalizados where clave = new.rol)) then
    raise exception 'rol "%" no existe -- creá el cargo primero desde Ajustes → Roles y permisos', new.rol;
  end if;
  return new;
end;
$$;

drop trigger if exists validar_rol_permiso on public.permisos_navegacion;
create trigger validar_rol_permiso
  before insert or update of rol on public.permisos_navegacion
  for each row execute function public.validar_rol_permiso();

-- puede_operar_seccion (clientes) asumía "todo lo que no sea encargado es
-- mozo" (rol <> 'encargado' → acceso libre) -- válido cuando esos eran los
-- únicos 2 roles configurables, pero con cargos dinámicos un cargo nuevo
-- caería en esa rama y quedaría con acceso TOTAL a clientes sin ningún
-- tick. Se endurece a "solo mozo tiene el histórico acceso libre", todo
-- lo demás (encargado y cualquier cargo nuevo) exige el tick explícito,
-- como ya pasaba con encargado.
create or replace function public.puede_operar_seccion(p_seccion text)
returns boolean
language sql
stable security definer
set search_path = public
as $$
  select case
    when not exists (select 1 from profiles p where p.id = auth.uid() and p.activo) then false
    when (select rol from profiles where id = auth.uid()) = 'mozo' then true
    else exists (
      select 1 from permisos_navegacion pn
      where pn.rol = (select rol from profiles where id = auth.uid()) and pn.seccion_id = p_seccion and pn.visible
    )
  end;
$$;
