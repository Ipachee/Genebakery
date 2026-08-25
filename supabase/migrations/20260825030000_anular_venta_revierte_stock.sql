-- Issue #3 del roadmap: anular una venta (borrarVenta, un soft-delete
-- puro vía update directo desde el cliente) no revertía el stock que se
-- había descontado al cobrar -- el inventario quedaba desfasado del real.
--
-- Se mueve la baja a una función server-side (fn_anular_venta) que, además
-- de marcar deleted_at, revierte el stock consumido -- salvo que el mismo
-- pedido tenga OTRA venta activa (pago dividido en varias formas de pago,
-- ver fn_cobrar_pedido: un pedido puede generar varias filas en ventas).
-- En ese caso no se revierte nada todavía -- recién cuando se anula la
-- ÚLTIMA venta activa de ese pedido se entiende que la operación completa
-- quedó anulada y se devuelve el stock.
alter table movimientos drop constraint if exists movimientos_tipo_check;
alter table movimientos add constraint movimientos_tipo_check
  check (tipo in ('compra','venta','produccion','ajuste','anulacion'));

create or replace function public.fn_anular_venta(p_venta_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido_id bigint;
  v_quedan_otras boolean;
  v_item record;
  v_elaborado_id bigint;
  v_stock_porciones numeric;
  v_nuevo_stock numeric;
  v_receta record;
  v_consumo numeric;
begin
  if not (public.is_admin() or public.puede_editar_seccion('ventas')) then
    raise exception 'No autorizado';
  end if;

  select pedido_id into v_pedido_id from ventas where id = p_venta_id and deleted_at is null;
  if v_pedido_id is null then
    raise exception 'Venta % no encontrada o ya estaba anulada', p_venta_id;
  end if;

  update ventas set deleted_at = now() where id = p_venta_id;

  select exists(
    select 1 from ventas where pedido_id = v_pedido_id and id <> p_venta_id and deleted_at is null
  ) into v_quedan_otras;

  -- Todavía hay otro pago activo de este mismo pedido (pago dividido) --
  -- no se revierte stock hasta que se anule también ese otro.
  if v_quedan_otras then
    return;
  end if;

  for v_item in select * from pedido_items where pedido_id = v_pedido_id loop
    select id, stock_porciones into v_elaborado_id, v_stock_porciones
    from elaborados where producto_id = v_item.producto_id and deleted_at is null limit 1;

    if v_elaborado_id is not null then
      v_nuevo_stock := v_stock_porciones + v_item.cantidad;
      update elaborados set stock_porciones = v_nuevo_stock where id = v_elaborado_id;
      insert into movimientos (elaborado_id, tipo, cantidad, stock_resultante, ref)
      values (v_elaborado_id, 'anulacion', v_item.cantidad, v_nuevo_stock, 'Anulación venta #' || p_venta_id);
    else
      for v_receta in
        select r.cantidad, i.id as insumo_id, i.stock
        from recetas r join insumos i on i.id = r.insumo_id
        where r.producto_id = v_item.producto_id
      loop
        v_consumo := v_receta.cantidad * v_item.cantidad;
        v_nuevo_stock := v_receta.stock + v_consumo;
        update insumos set stock = v_nuevo_stock where id = v_receta.insumo_id;
        insert into movimientos (insumo_id, tipo, cantidad, stock_resultante, ref)
        values (v_receta.insumo_id, 'anulacion', v_consumo, v_nuevo_stock, 'Anulación venta #' || p_venta_id);
      end loop;
    end if;
  end loop;
end;
$$;

revoke execute on function public.fn_anular_venta(bigint) from public;
grant execute on function public.fn_anular_venta(bigint) to authenticated;
