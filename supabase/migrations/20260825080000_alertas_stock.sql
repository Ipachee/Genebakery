-- Issue #16 del roadmap: el stock bajo sólo se veía como un badge suelto
-- dentro de la tabla de Insumos y de la de Elaborados -- había que entrar a
-- las dos pantallas y mirarlas a ojo para saber qué falta comprar.
--
-- security definer a propósito, mismo criterio que fn_resumen_gastos_rango
-- (ver 20260822 reportes): quien mira Reportes no necesariamente tiene
-- "Ver" tildado en Insumos/Elaborados, y sin esto las alertas le
-- aparecerían siempre vacías en vez de avisarle lo que falta.
--
-- La condición es `stock <= minimo`, EXACTAMENTE la misma que usa el badge
-- "bajo" en InsumosView/ElaboradosView. Si acá se usara un criterio propio
-- (ej. sólo cuando hay un mínimo configurado), las dos pantallas se
-- contradirían y no habría forma de saber cuál miente.
create or replace function public.fn_alertas_stock()
returns table (
  tipo text,
  id bigint,
  nombre text,
  stock numeric,
  minimo numeric,
  unidad text
)
language sql
security definer
set search_path = public
as $$
  -- El union va adentro de una subconsulta para poder ordenar por
  -- (stock - minimo): un `order by` suelto sobre un UNION sólo acepta
  -- nombres de columna de salida o posiciones, no una expresión entre dos
  -- de ellas.
  select t.tipo, t.id, t.nombre, t.stock, t.minimo, t.unidad
  from (
    select 'insumo'::text as tipo, i.id, i.nombre, i.stock, i.stock_min as minimo, i.unidad
    from insumos i
    where i.deleted_at is null and i.stock <= i.stock_min
    union all
    select 'elaborado'::text, e.id, e.nombre, e.stock_porciones, e.porciones_min, 'porciones'::text
    from elaborados e
    where e.deleted_at is null and e.stock_porciones <= e.porciones_min
  ) t
  -- Lo más urgente primero: cuanto más abajo del mínimo, más arriba.
  order by (t.stock - t.minimo), t.nombre;
$$;

revoke execute on function public.fn_alertas_stock() from public;
grant execute on function public.fn_alertas_stock() to authenticated;
