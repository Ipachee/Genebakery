-- Antes, agregar una segunda tanda de productos a una mesa ya entregada
-- mezclaba todo en el mismo ticket de comandera: cocina veía "2 aguas"
-- cuando en realidad 1 ya había salido, y volvía a llevar de más. Se agrega
-- el concepto de "ronda": cada click en "Enviar a cocina" numera esa tanda,
-- y la comandera arma un ticket separado por ronda en vez de uno por mesa.

alter table pedido_items add column if not exists ronda integer;
alter table pedido_items add column if not exists entregado boolean not null default false;
alter table pedido_items add column if not exists enviado_cocina_at timestamptz;
alter table pedidos add column if not exists ronda_actual integer not null default 0;

-- Backfill: pedidos que ya estaban enviados/entregados antes de esta
-- migración no tenían ronda -- se los marca como ronda 1 para que no
-- desaparezcan de la comandera en medio de un turno en curso.
update pedido_items pi
set ronda = 1, enviado_cocina_at = coalesce(pi.enviado_cocina_at, p.enviado_at, p.created_at)
from pedidos p
where pi.pedido_id = p.id and pi.enviado_cocina = true and pi.ronda is null;

update pedidos set ronda_actual = 1
where estado in ('enviado_cocina', 'entregado') and ronda_actual = 0;

update pedido_items
set entregado = true
where enviado_cocina = true
  and entregado = false
  and pedido_id in (select id from pedidos where estado = 'entregado');

-- Envía a cocina los items pendientes del carrito como una ronda nueva.
create or replace function public.fn_enviar_a_cocina(p_pedido_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ronda int;
begin
  if not public.is_active_staff() then
    raise exception 'No autorizado';
  end if;

  update pedidos set ronda_actual = ronda_actual + 1
  where id = p_pedido_id and estado <> 'cobrado'
  returning ronda_actual into v_ronda;

  if v_ronda is null then
    raise exception 'Pedido no encontrado o ya cobrado';
  end if;

  update pedido_items
  set enviado_cocina = true, ronda = v_ronda, enviado_cocina_at = now()
  where pedido_id = p_pedido_id and enviado_cocina = false;

  update pedidos set estado = 'enviado_cocina', enviado_at = now()
  where id = p_pedido_id;
end;
$$;

revoke execute on function public.fn_enviar_a_cocina(bigint) from public;
grant execute on function public.fn_enviar_a_cocina(bigint) to authenticated;

-- Marca entregada una ronda puntual (desde la comandera). El pedido pasa a
-- "entregado" recién cuando no queda ninguna ronda pendiente.
create or replace function public.fn_marcar_ronda_entregada(p_pedido_id bigint, p_ronda int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pendientes int;
begin
  if not public.is_active_staff() then
    raise exception 'No autorizado';
  end if;

  update pedido_items set entregado = true
  where pedido_id = p_pedido_id and ronda = p_ronda and entregado = false;

  select count(*) into v_pendientes
  from pedido_items
  where pedido_id = p_pedido_id and enviado_cocina = true and entregado = false;

  update pedidos
  set estado = case when v_pendientes = 0 then 'entregado' else 'enviado_cocina' end
  where id = p_pedido_id;
end;
$$;

revoke execute on function public.fn_marcar_ronda_entregada(bigint, int) from public;
grant execute on function public.fn_marcar_ronda_entregada(bigint, int) to authenticated;

-- Marca entregado todo lo pendiente del pedido de una sola vez (botón
-- "Entregado" dentro del panel de la mesa, no en la comandera).
create or replace function public.fn_marcar_pedido_entregado(p_pedido_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_staff() then
    raise exception 'No autorizado';
  end if;

  update pedido_items set entregado = true
  where pedido_id = p_pedido_id and enviado_cocina = true and entregado = false;

  update pedidos set estado = 'entregado' where id = p_pedido_id;
end;
$$;

revoke execute on function public.fn_marcar_pedido_entregado(bigint) from public;
grant execute on function public.fn_marcar_pedido_entregado(bigint) to authenticated;
