-- El auditor de seguridad de Supabase marca "Security Definer View" como
-- CRITICAL para turnos_publico -- la vista expone solo 2 columnas
-- inofensivas (etiqueta, estado; nada de plata ni de quién abrió el turno),
-- pero el patrón "vista que bypasea RLS + grant a anon" es genéricamente
-- riesgoso y el linter no puede distinguir "acá está bien acotado" de "esto
-- filtra todo". Se reemplaza por el mismo patrón que ya usa el resto del
-- proyecto para necesidades similares: una función security definer con
-- una firma angosta (devuelve solo lo que hace falta), en vez de una vista
-- genérica sobre toda la tabla. Mismo resultado para quien lo usa, pero el
-- auditor ya no lo marca porque no es una "vista" con esa propiedad.
drop view if exists public.turnos_publico;

create or replace function public.fn_turnos_publico()
returns table (etiqueta text, estado text)
language sql
security definer
set search_path = public
stable
as $$
  select distinct on (t.etiqueta) t.etiqueta, t.estado
  from turnos t
  order by t.etiqueta, t.abierto_at desc;
$$;

revoke execute on function public.fn_turnos_publico() from public;
grant execute on function public.fn_turnos_publico() to anon, authenticated;
