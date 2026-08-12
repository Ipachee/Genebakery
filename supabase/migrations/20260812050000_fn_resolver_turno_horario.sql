-- Antes se podía abrir cualquier etiqueta de turno a cualquier hora: si
-- Tarde se cerraba (con o sin mesas pendientes, eso ya estaba permitido a
-- propósito), no había nada que impidiera abrir Mañana de nuevo en vez de
-- Noche, que es el que realmente sigue. Se agrega una ventana horaria fija
-- por etiqueta -- Mañana 07:00-13:30, Tarde 13:30-20:30, Noche 20:00-01:00
-- (cruza la medianoche) -- y se rechaza con un error explícito si se
-- intenta abrir fuera de horario.
--
-- El chequeo NO aplica si el turno ya está abierto (se retoma sin
-- preguntas): no hay que trabarle el acceso a quien sigue atendiendo
-- pasado el horario "normal" de su turno, por ejemplo Tarde extendiéndose
-- después de las 20:30 -- solo se bloquea el acto de EMPEZAR uno nuevo (o
-- reabrir uno cerrado) fuera de su ventana.
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
  v_hora time;
  v_rango text;
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

  if found and v_turno.estado = 'abierto' then
    return v_turno;
  end if;

  v_hora := (now() at time zone v_zona)::time;
  v_rango := case p_etiqueta
    when 'Mañana' then '07:00 a 13:30'
    when 'Tarde' then '13:30 a 20:30'
    when 'Noche' then '20:00 a 01:00'
  end;
  if v_rango is not null and not (
    case p_etiqueta
      when 'Mañana' then v_hora >= time '07:00' and v_hora < time '13:30'
      when 'Tarde' then v_hora >= time '13:30' and v_hora < time '20:30'
      when 'Noche' then v_hora >= time '20:00' or v_hora < time '01:00'
    end
  ) then
    raise exception 'El turno % solo se puede abrir de % — ahora son las %.', p_etiqueta, v_rango, to_char(v_hora, 'HH24:MI');
  end if;

  if not found then
    insert into turnos (abierto_por, etiqueta) values (p_usuario_id, p_etiqueta) returning * into v_turno;
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
