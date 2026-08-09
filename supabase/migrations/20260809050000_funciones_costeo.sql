-- Motor de costeo: promedio ponderado para compras de insumos y para
-- producciones de elaborados (misma logica matematica en los dos casos,
-- como ya estaba validado en el prototipo), y descuento de stock al
-- vender: receta directa descuenta insumo crudo, elaborado descuenta
-- porcion (no vuelve a tocar el insumo, porque ese consumo ya paso al
-- producir). Todo en funciones security definer para que la
-- actualizacion de stock + costo + movimiento quede atomica.

create or replace function public.fn_registrar_gasto(
  p_insumo_id bigint,
  p_cantidad numeric,
  p_costo_total numeric,
  p_proveedor text,
  p_usuario_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock_actual numeric;
  v_costo_actual numeric;
  v_costo_compra_unit numeric;
  v_nuevo_stock numeric;
  v_nuevo_costo numeric;
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  select stock, costo_unit into v_stock_actual, v_costo_actual from insumos where id = p_insumo_id for update;
  if not found then
    raise exception 'Insumo % no existe', p_insumo_id;
  end if;

  v_costo_compra_unit := p_costo_total / nullif(p_cantidad, 0);
  v_nuevo_stock := v_stock_actual + p_cantidad;
  v_nuevo_costo := case when v_nuevo_stock = 0 then v_costo_actual
    else (v_stock_actual * v_costo_actual + p_cantidad * v_costo_compra_unit) / v_nuevo_stock end;

  update insumos set stock = v_nuevo_stock, costo_unit = v_nuevo_costo where id = p_insumo_id;

  insert into gastos (fecha, insumo_id, cantidad, costo_total, proveedor, usuario_id)
  values (current_date, p_insumo_id, p_cantidad, p_costo_total, p_proveedor, p_usuario_id);

  insert into movimientos (insumo_id, tipo, cantidad, stock_resultante, ref)
  values (p_insumo_id, 'compra', p_cantidad, v_nuevo_stock, 'Compra insumo #' || p_insumo_id);
end;
$$;

create or replace function public.fn_registrar_produccion(
  p_elaborado_id bigint,
  p_cantidad_unidades numeric,
  p_usuario_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_elaborado record;
  v_receta record;
  v_costo_total numeric := 0;
  v_consumo numeric;
  v_nuevo_stock_insumo numeric;
  v_porciones_nuevas numeric;
  v_nuevo_stock_porciones numeric;
  v_nuevo_costo_porcion numeric;
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  select * into v_elaborado from elaborados where id = p_elaborado_id for update;
  if not found then
    raise exception 'Elaborado % no existe', p_elaborado_id;
  end if;

  for v_receta in
    select r.cantidad, i.id as insumo_id, i.nombre, i.stock, i.costo_unit
    from recetas r join insumos i on i.id = r.insumo_id
    where r.producto_id = v_elaborado.producto_id
  loop
    v_consumo := v_receta.cantidad * p_cantidad_unidades;
    if v_receta.stock < v_consumo then
      raise exception 'Stock insuficiente de % para producir', v_receta.nombre;
    end if;
    v_nuevo_stock_insumo := v_receta.stock - v_consumo;
    update insumos set stock = v_nuevo_stock_insumo where id = v_receta.insumo_id;
    v_costo_total := v_costo_total + v_consumo * v_receta.costo_unit;
    insert into movimientos (insumo_id, tipo, cantidad, stock_resultante, ref)
    values (v_receta.insumo_id, 'produccion', -v_consumo, v_nuevo_stock_insumo, 'Producción elaborado #' || p_elaborado_id);
  end loop;

  v_porciones_nuevas := p_cantidad_unidades * v_elaborado.porciones_por_unidad;
  v_nuevo_stock_porciones := v_elaborado.stock_porciones + v_porciones_nuevas;
  v_nuevo_costo_porcion := case when v_nuevo_stock_porciones = 0 then v_elaborado.costo_unit_porcion
    else (v_elaborado.stock_porciones * v_elaborado.costo_unit_porcion + v_costo_total) / v_nuevo_stock_porciones end;

  update elaborados set stock_porciones = v_nuevo_stock_porciones, costo_unit_porcion = v_nuevo_costo_porcion
  where id = p_elaborado_id;

  insert into producciones (elaborado_id, fecha, cantidad_unidades, costo_total, usuario_id)
  values (p_elaborado_id, current_date, p_cantidad_unidades, v_costo_total, p_usuario_id);

  insert into movimientos (elaborado_id, tipo, cantidad, stock_resultante, ref)
  values (p_elaborado_id, 'produccion', v_porciones_nuevas, v_nuevo_stock_porciones, 'Producción #' || p_elaborado_id);
end;
$$;

create or replace function public.fn_cobrar_pedido(
  p_pedido_id bigint,
  p_turno_id bigint,
  p_mesa_id bigint,
  p_mozo_id uuid,
  p_cliente_id bigint,
  p_subtotal numeric,
  p_descuento numeric,
  p_total numeric,
  p_metodo_pago text
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
begin
  if not public.is_active_staff() then
    raise exception 'No autorizado';
  end if;

  update pedidos set estado = 'cobrado', cobrado_at = now(), subtotal = p_subtotal,
    descuento = p_descuento, total = p_total, metodo_pago = p_metodo_pago, cliente_id = p_cliente_id
  where id = p_pedido_id;

  insert into ventas (pedido_id, turno_id, mesa_id, mozo_id, cliente_id, subtotal, descuento, total, metodo_pago)
  values (p_pedido_id, p_turno_id, p_mesa_id, p_mozo_id, p_cliente_id, p_subtotal, p_descuento, p_total, p_metodo_pago);

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

revoke execute on function public.fn_registrar_gasto(bigint, numeric, numeric, text, uuid) from public;
revoke execute on function public.fn_registrar_produccion(bigint, numeric, uuid) from public;
revoke execute on function public.fn_cobrar_pedido(bigint, bigint, bigint, uuid, bigint, numeric, numeric, numeric, text) from public;

grant execute on function public.fn_registrar_gasto(bigint, numeric, numeric, text, uuid) to authenticated;
grant execute on function public.fn_registrar_produccion(bigint, numeric, uuid) to authenticated;
grant execute on function public.fn_cobrar_pedido(bigint, bigint, bigint, uuid, bigint, numeric, numeric, numeric, text) to authenticated;
