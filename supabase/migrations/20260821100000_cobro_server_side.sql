-- SEGURIDAD: fn_cobrar_pedido confiaba en el subtotal/descuento/total que
-- mandaba el cliente sin verificarlos contra los precios reales -- una
-- sesión de mozo podía llamar el RPC directo (sin pasar por la UI) y cobrar
-- cualquier pedido por $1. Y un paso más atrás, agregarItem() insertaba
-- pedido_items con el precio_unitario que mandara el cliente, así que ni
-- siquiera hacía falta llegar al cobro para falsificar un precio.
--
-- Se cierra en dos capas:
-- 1) Un trigger en pedido_items pisa precio_unitario con el precio real de
--    productos al insertar -- lo que mande el cliente en el insert se
--    ignora, así el precio de cada línea queda confiable de una vez.
-- 2) fn_cobrar_pedido recalcula subtotal/descuento/total a partir de esas
--    líneas reales + el descuento_pct real del cliente, en vez de usar los
--    parámetros p_subtotal/p_descuento/p_total. Esos parámetros quedan en
--    la firma (para no romper el frontend, que sigue mandándolos) pero ya
--    no se usan para nada -- son puramente informativos ahora.

create or replace function public.fn_forzar_precio_item_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_precio numeric(10,2);
begin
  select precio into v_precio from productos where id = new.producto_id and deleted_at is null;
  if v_precio is null then
    raise exception 'Producto % no encontrado o sin precio', new.producto_id;
  end if;
  new.precio_unitario := v_precio;
  return new;
end;
$$;

drop trigger if exists trg_forzar_precio_item_pedido on pedido_items;
create trigger trg_forzar_precio_item_pedido
  before insert on pedido_items
  for each row execute function public.fn_forzar_precio_item_pedido();

create or replace function public.fn_cobrar_pedido(
  p_pedido_id bigint,
  p_turno_id bigint,
  p_mesa_id bigint,
  p_mozo_id uuid,
  p_cliente_id bigint default null,
  p_subtotal numeric default 0,
  p_descuento numeric default 0,
  p_total numeric default 0,
  p_metodo_pago text default null,
  p_pagos jsonb default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_elaborado_id bigint;
  v_stock_porciones numeric;
  v_nuevo_stock numeric;
  v_receta record;
  v_consumo numeric;
  v_pago jsonb;
  v_metodo_final text;
  v_suma_pagos numeric;
  v_es_primero boolean := true;
  v_hay_split boolean := p_pagos is not null and jsonb_array_length(p_pagos) > 0;
  v_subtotal numeric;
  v_descuento_pct numeric;
  v_descuento numeric;
  v_total numeric;
begin
  if not public.is_active_staff() then
    raise exception 'No autorizado';
  end if;

  select coalesce(sum(cantidad * precio_unitario), 0) into v_subtotal
  from pedido_items where pedido_id = p_pedido_id;

  v_descuento_pct := 0;
  if p_cliente_id is not null then
    select coalesce(descuento_pct, 0) into v_descuento_pct from clientes where id = p_cliente_id;
  end if;
  v_descuento := round(v_subtotal * coalesce(v_descuento_pct, 0) / 100, 2);
  v_total := v_subtotal - v_descuento;

  if v_hay_split then
    select sum((p->>'monto')::numeric) into v_suma_pagos from jsonb_array_elements(p_pagos) p;
    if abs(coalesce(v_suma_pagos, 0) - v_total) > 1 then
      raise exception 'La suma de los pagos (%) no coincide con el total (%)', v_suma_pagos, v_total;
    end if;
    select string_agg(distinct p->>'metodo', ' + ') into v_metodo_final from jsonb_array_elements(p_pagos) p;
  else
    v_metodo_final := p_metodo_pago;
  end if;

  update pedidos set estado = 'cobrado', cobrado_at = now(), subtotal = v_subtotal,
    descuento = v_descuento, total = v_total, metodo_pago = v_metodo_final, cliente_id = p_cliente_id
  where id = p_pedido_id;

  if v_hay_split then
    for v_pago in select * from jsonb_array_elements(p_pagos) loop
      insert into ventas (pedido_id, turno_id, mesa_id, mozo_id, cliente_id, subtotal, descuento, total, metodo_pago)
      values (
        p_pedido_id, p_turno_id, p_mesa_id, p_mozo_id, p_cliente_id,
        case when v_es_primero then v_subtotal else (v_pago->>'monto')::numeric end,
        case when v_es_primero then v_descuento else 0 end,
        (v_pago->>'monto')::numeric,
        v_pago->>'metodo'
      );
      v_es_primero := false;
    end loop;
  else
    insert into ventas (pedido_id, turno_id, mesa_id, mozo_id, cliente_id, subtotal, descuento, total, metodo_pago)
    values (p_pedido_id, p_turno_id, p_mesa_id, p_mozo_id, p_cliente_id, v_subtotal, v_descuento, v_total, p_metodo_pago);
  end if;

  for v_item in select * from pedido_items where pedido_id = p_pedido_id loop
    select id, stock_porciones into v_elaborado_id, v_stock_porciones
    from elaborados where producto_id = v_item.producto_id and deleted_at is null limit 1;

    if v_elaborado_id is not null then
      v_nuevo_stock := v_stock_porciones - v_item.cantidad;
      update elaborados set stock_porciones = v_nuevo_stock where id = v_elaborado_id;
      insert into movimientos (elaborado_id, tipo, cantidad, stock_resultante, ref)
      values (v_elaborado_id, 'venta', -v_item.cantidad, v_nuevo_stock, 'Venta pedido #' || p_pedido_id);
    else
      for v_receta in
        select r.cantidad, i.id as insumo_id, i.stock
        from recetas r join insumos i on i.id = r.insumo_id
        where r.producto_id = v_item.producto_id
      loop
        v_consumo := v_receta.cantidad * v_item.cantidad;
        v_nuevo_stock := v_receta.stock - v_consumo;
        update insumos set stock = v_nuevo_stock where id = v_receta.insumo_id;
        insert into movimientos (insumo_id, tipo, cantidad, stock_resultante, ref)
        values (v_receta.insumo_id, 'venta', -v_consumo, v_nuevo_stock, 'Venta pedido #' || p_pedido_id);
      end loop;
    end if;
  end loop;
end;
$$;

revoke execute on function public.fn_cobrar_pedido(bigint, bigint, bigint, uuid, bigint, numeric, numeric, numeric, text, jsonb) from public;
grant execute on function public.fn_cobrar_pedido(bigint, bigint, bigint, uuid, bigint, numeric, numeric, numeric, text, jsonb) to authenticated;
