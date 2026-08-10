-- La logica de "retomar/reabrir/crear turno" vivia en el cliente (leer,
-- decidir, escribir en 3 pasos separados). Si el componente que la dispara
-- se remonta dos veces casi al mismo tiempo -- por ejemplo, al usar el
-- candado de admin, que cambia de sesion y hace que React desmonte y
-- vuelva a montar el arbol -- las dos ejecuciones en paralelo pueden
-- terminar creando DOS turnos abiertos para la misma etiqueta. Se mueve
-- todo a una funcion atomica del lado del servidor, con un lock que
-- serializa llamadas concurrentes para la misma etiqueta.
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

  perform pg_advisory_xact_lock(hashtext('turno:' || p_etiqueta));

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
