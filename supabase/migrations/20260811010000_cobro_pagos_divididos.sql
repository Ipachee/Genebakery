-- Permite dividir el cobro de un pedido en varias formas de pago (ej. mitad
-- efectivo, mitad tarjeta). Se extiende fn_cobrar_pedido con un parámetro
-- opcional p_pagos (jsonb, array de {metodo, monto}) en vez de duplicar
-- toda la lógica de descuento de stock en una función aparte -- si viene
-- null (el caso de siempre, un solo método), el comportamiento es
-- exactamente el mismo de antes. Si viene con datos, se valida que sume
-- el total y se inserta una fila en "ventas" por cada forma de pago, todas
-- con el mismo pedido_id -- el total facturado del turno sigue siendo
-- correcto porque suma la columna total de todas las filas.
--
-- Agregar un parámetro cambia la firma, así que "create or replace" crearía
-- un overload nuevo en vez de reemplazar el viejo -- se dropea explícito
-- primero para no terminar con dos versiones ambiguas.
drop function if exists public.fn_cobrar_pedido(bigint, bigint, bigint, uuid, bigint, numeric, numeric, numeric, text);

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
begin
  if not public.is_active_staff() then
    raise exception 'No autorizado';
  end if;

  if v_hay_split then
    select sum((p->>'monto')::numeric) into v_suma_pagos from jsonb_array_elements(p_pagos) p;
    if abs(coalesce(v_suma_pagos, 0) - p_total) > 1 then
      raise exception 'La suma de los pagos (%) no coincide con el total (%)', v_suma_pagos, p_total;
    end if;
    select string_agg(distinct p->>'metodo', ' + ') into v_metodo_final from jsonb_array_elements(p_pagos) p;
  else
    v_metodo_final := p_metodo_pago;
  end if;

  update pedidos set estado = 'cobrado', cobrado_at = now(), subtotal = p_subtotal,
    descuento = p_descuento, total = p_total, metodo_pago = v_metodo_final, cliente_id = p_cliente_id
  where id = p_pedido_id;

  if v_hay_split then
    for v_pago in select * from jsonb_array_elements(p_pagos) loop
      insert into ventas (pedido_id, turno_id, mesa_id, mozo_id, cliente_id, subtotal, descuento, total, metodo_pago)
      values (
        p_pedido_id, p_turno_id, p_mesa_id, p_mozo_id, p_cliente_id,
        case when v_es_primero then p_subtotal else (v_pago->>'monto')::numeric end,
        case when v_es_primero then p_descuento else 0 end,
        (v_pago->>'monto')::numeric,
        v_pago->>'metodo'
      );
      v_es_primero := false;
    end loop;
  else
    insert into ventas (pedido_id, turno_id, mesa_id, mozo_id, cliente_id, subtotal, descuento, total, metodo_pago)
    values (p_pedido_id, p_turno_id, p_mesa_id, p_mozo_id, p_cliente_id, p_subtotal, p_descuento, p_total, p_metodo_pago);
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
