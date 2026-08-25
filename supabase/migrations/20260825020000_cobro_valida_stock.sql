-- Issue #2 del roadmap: a diferencia de la producción de elaborados (que
-- ya bloquea con "raise exception" si falta insumo, ver
-- fn_producir_elaborado en 20260809050000_funciones_costeo.sql), la venta
-- nunca validaba que hubiera stock suficiente antes de descontarlo -- podía
-- quedar negativo en silencio. Mismo patrón acá: si algún ítem del pedido
-- no tiene stock suficiente (elaborado o insumo por receta), se corta todo
-- el cobro con un error claro -- como es una sola función, el rollback es
-- automático (no queda la venta ni el pedido a medio cobrar).
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
  v_nombre_producto text;
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
  v_estado_actual text;
begin
  if not public.is_active_staff() then
    raise exception 'No autorizado';
  end if;

  select estado into v_estado_actual from pedidos where id = p_pedido_id for update;
  if v_estado_actual is null then
    raise exception 'Pedido % no encontrado', p_pedido_id;
  end if;
  if v_estado_actual = 'cobrado' then
    raise exception 'Este pedido ya fue cobrado -- no se puede cobrar de nuevo.';
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

  -- Se valida TODO el stock antes de tocar nada -- si un pedido tiene 3
  -- productos y el tercero no alcanza, no queremos haber descontado ya los
  -- primeros dos (por eso es un loop de validación aparte, antes del loop
  -- que efectivamente descuenta más abajo).
  for v_item in select * from pedido_items where pedido_id = p_pedido_id loop
    select id, stock_porciones into v_elaborado_id, v_stock_porciones
    from elaborados where producto_id = v_item.producto_id and deleted_at is null limit 1;

    if v_elaborado_id is not null then
      if v_stock_porciones < v_item.cantidad then
        select nombre into v_nombre_producto from productos where id = v_item.producto_id;
        raise exception 'Stock insuficiente de % para cobrar este pedido', coalesce(v_nombre_producto, 'producto #' || v_item.producto_id);
      end if;
    else
      for v_receta in
        select r.cantidad, i.nombre, i.stock
        from recetas r join insumos i on i.id = r.insumo_id
        where r.producto_id = v_item.producto_id
      loop
        v_consumo := v_receta.cantidad * v_item.cantidad;
        if v_receta.stock < v_consumo then
          raise exception 'Stock insuficiente de % para cobrar este pedido', v_receta.nombre;
        end if;
      end loop;
    end if;
  end loop;

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
