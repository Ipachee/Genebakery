-- Deshacer un "Entregado" marcado por error en la Comandera. Simétrico a
-- fn_marcar_ronda_entregada: vuelve los items de esa ronda a entregado =
-- false, y si el pedido había pasado a estado 'entregado' (porque esa era
-- la última ronda pendiente), lo vuelve a 'enviado_cocina' -- nunca puede
-- "deshacerse" hasta 'abierto', porque ya se mandó a cocina de verdad.
create or replace function public.fn_desmarcar_ronda_entregada(p_pedido_id bigint, p_ronda int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_staff() then
    raise exception 'No autorizado';
  end if;

  update pedido_items set entregado = false
  where pedido_id = p_pedido_id and ronda = p_ronda and entregado = true;

  update pedidos set estado = 'enviado_cocina' where id = p_pedido_id and estado = 'entregado';
end;
$$;

revoke execute on function public.fn_desmarcar_ronda_entregada(bigint, int) from public;
grant execute on function public.fn_desmarcar_ronda_entregada(bigint, int) to authenticated;
