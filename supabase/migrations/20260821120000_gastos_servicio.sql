-- Hasta ahora todo gasto tenía que estar atado a un insumo -- no había
-- forma de cargar luz, gas o alquiler. Se agrega tipo ('insumo' | 'servicio')
-- y concepto (texto libre, solo para servicio -- "Luz agosto", "Alquiler",
-- etc). Los gastos de insumo siguen exactamente igual que antes (insumo_id +
-- cantidad obligatorios); los de servicio no tocan stock ni costo promedio
-- de nada, son solo un registro de gasto suelto.
alter table gastos alter column insumo_id drop not null;
alter table gastos alter column cantidad drop not null;
alter table gastos add column tipo text not null default 'insumo' check (tipo in ('insumo', 'servicio'));
alter table gastos add column concepto text;
alter table gastos add constraint gastos_insumo_o_servicio check (
  (tipo = 'insumo' and insumo_id is not null and cantidad is not null and concepto is null)
  or
  (tipo = 'servicio' and insumo_id is null and cantidad is null and concepto is not null)
);

create or replace function public.fn_registrar_gasto_servicio(
  p_concepto text,
  p_costo_total numeric,
  p_proveedor text default null,
  p_usuario_id uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;
  if p_concepto is null or trim(p_concepto) = '' then
    raise exception 'Falta el concepto del gasto';
  end if;

  insert into gastos (fecha, tipo, concepto, costo_total, proveedor, usuario_id)
  values (current_date, 'servicio', trim(p_concepto), p_costo_total, p_proveedor, p_usuario_id);
end;
$$;

revoke execute on function public.fn_registrar_gasto_servicio(text, numeric, text, uuid) from public;
grant execute on function public.fn_registrar_gasto_servicio(text, numeric, text, uuid) to authenticated;
