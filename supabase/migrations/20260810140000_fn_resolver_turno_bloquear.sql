-- El cierre automático de otro turno resultó confuso: el mozo de Tarde no
-- se enteraba de que Mañana seguía abierto, simplemente se cerraba solo. En
-- vez de eso, fn_resolver_turno ahora RECHAZA con un error explícito si hay
-- otro turno abierto -- el mozo tiene que entrar con la cuenta de ese turno
-- (o como admin) y cerrarlo primero antes de poder abrir el siguiente.
create or replace function public.fn_resolver_turno(p_etiqueta text, p_usuario_id uuid)
returns turnos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_turno turnos;
  v_otro turnos;
  v_zona text := 'America/Argentina/Buenos_Aires';
begin
  if not public.is_active_staff() then
    raise exception 'No autorizado';
  end if;

  perform pg_advisory_xact_lock(hashtext('turno-resolver'));

  select * into v_otro from turnos where estado = 'abierto' and etiqueta <> p_etiqueta limit 1;
  if found then
    raise exception 'El turno % está abierto. Hay que cerrarlo antes de abrir %.', v_otro.etiqueta, p_etiqueta;
  end if;

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
