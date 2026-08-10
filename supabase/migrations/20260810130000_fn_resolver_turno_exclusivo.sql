-- El local funciona con un solo turno activo a la vez (Mañana 8 a 13:30,
-- Tarde 13:30 a 21, Noche de 21 al cierre). Si un mozo se loguea con la
-- cuenta de otro turno mientras el anterior quedó abierto (por ejemplo, se
-- olvidaron de cerrarlo), fn_resolver_turno ahora cierra automáticamente
-- cualquier otro turno que haya quedado abierto antes de abrir/retomar el
-- que corresponde -- evita que dos o tres turnos queden abiertos en
-- simultáneo, lo que confundía el total facturado y las mesas pendientes.
-- El lock pasa a ser global (antes era por etiqueta) porque ahora la
-- función lee/escribe turnos de otras etiquetas también.
create or replace function public.fn_resolver_turno(p_etiqueta text, p_usuario_id uuid)
returns turnos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_turno turnos;
  v_zona text := 'America/Argentina/Buenos_Aires';
begin
  if not public.is_active_staff() then
    raise exception 'No autorizado';
  end if;

  perform pg_advisory_xact_lock(hashtext('turno-resolver'));

  update turnos set estado = 'cerrado', cerrado_at = now()
  where estado = 'abierto' and etiqueta <> p_etiqueta;

  select * into v_turno from turnos where etiqueta = p_etiqueta order by abierto_at desc limit 1;

  if not found then
    insert into turnos (abierto_por, etiqueta) values (p_usuario_id, p_etiqueta) returning * into v_turno;
    return v_turno;
  end if;

  if v_turno.estado = 'abierto' then
    return v_turno;
  end if;

  if (coalesce(v_turno.cerrado_at, v_turno.abierto_at) at time zone v_zona)::date = (now() at time zone v_zona)::date then
    update turnos set estado = 'abierto', cerrado_at = null where id = v_turno.id returning * into v_turno;
    return v_turno;
  end if;

  insert into turnos (abierto_por, etiqueta) values (p_usuario_id, p_etiqueta) returning * into v_turno;
  return v_turno;
end;
$$;

revoke execute on function public.fn_resolver_turno(text, uuid) from public;
grant execute on function public.fn_resolver_turno(text, uuid) to authenticated;
