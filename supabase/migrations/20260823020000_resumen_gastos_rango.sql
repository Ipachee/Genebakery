-- Misma idea que fn_resumen_gastos_dia, pero para un rango (Reportes
-- semanal/mensual) en vez de un solo día -- quien ve Reportes no
-- necesariamente tiene "Ver" tildado en Gastos o Cobranzas, así que sin
-- esto el total de gastos del período le quedaría siempre en $0.
create or replace function public.fn_resumen_gastos_rango(p_desde date, p_hasta date default current_date)
returns table (concepto text, monto numeric, tipo text)
language sql
stable security definer
set search_path = public
as $$
  select
    coalesce(g.concepto, i.nombre, 'Insumo'),
    g.costo_total,
    case when g.tipo = 'servicio' then 'Servicio' else 'Insumo' end
  from gastos g
  left join insumos i on i.id = g.insumo_id
  where g.fecha between p_desde and p_hasta
    and g.deleted_at is null
    and exists (select 1 from profiles p where p.id = auth.uid() and p.activo)
  union all
  select
    trim(coalesce(e.nombre, '') || ' ' || coalesce(e.apellido, '')) || coalesce(' — ' || pe.concepto, ''),
    pe.monto,
    'Pago a empleado'
  from pagos_empleados pe
  left join empleados e on e.id = pe.empleado_id
  where pe.fecha between p_desde and p_hasta
    and pe.deleted_at is null
    and exists (select 1 from profiles p where p.id = auth.uid() and p.activo);
$$;
