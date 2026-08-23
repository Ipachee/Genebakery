-- El cierre de turno (PDF que se manda al dueño por mail) necesita mostrar
-- los gastos del día junto a lo facturado -- pero gastos/pagos_empleados
-- están protegidos por RLS a quien tenga "Ver" tildado en esas secciones,
-- y quien CIERRA el turno (típicamente mozo) no necesariamente lo tiene.
-- Mismo patrón que fn_nombres_empleados: una función security definer que
-- expone solo lo que hace falta (concepto + monto + tipo, nada de
-- proveedor/insumo/empleado en detalle) a cualquier staff activo, sin
-- darle acceso general a esas pantallas.
create or replace function public.fn_resumen_gastos_dia(p_fecha date)
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
  where g.fecha = p_fecha
    and g.deleted_at is null
    and exists (select 1 from profiles p where p.id = auth.uid() and p.activo)
  union all
  select
    trim(coalesce(e.nombre, '') || ' ' || coalesce(e.apellido, '')) || coalesce(' — ' || pe.concepto, ''),
    pe.monto,
    'Pago a empleado'
  from pagos_empleados pe
  left join empleados e on e.id = pe.empleado_id
  where pe.fecha = p_fecha
    and pe.deleted_at is null
    and exists (select 1 from profiles p where p.id = auth.uid() and p.activo);
$$;
