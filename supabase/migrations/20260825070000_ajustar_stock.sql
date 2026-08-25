-- Issue #12 del roadmap: el tipo 'ajuste' ya existía en el CHECK de
-- movimientos y en la UI del listado, pero ningún flujo lo generaba -- la
-- única forma de corregir un stock desviado (una merma, algo que se rompió,
-- un conteo físico que no coincide) era editar la base a mano.
--
-- Decisiones:
--
-- 1. Se pide el stock REAL contado, no el delta. Es lo que la persona tiene
--    enfrente ("hay 3 botellas"); calcular la diferencia es trabajo de la
--    función, y hacerlo del otro lado es una fuente de errores de signo.
--
-- 2. El motivo es OBLIGATORIO. Un ajuste manual es justamente el movimiento
--    que no tiene un comprobante atrás (no hay compra ni venta que lo
--    explique), así que el texto es el único rastro de por qué el stock
--    cambió. Sin eso, el historial de movimientos miente por omisión.
--
-- 3. `cantidad` va con signo, igual que el resto de la tabla: negativo si
--    el ajuste descuenta (la merma típica), positivo si aparece stock.
create or replace function public.fn_ajustar_stock(
  p_tipo text,
  p_id bigint,
  p_stock_real numeric,
  p_motivo text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actual numeric;
  v_delta numeric;
  v_nombre text;
begin
  if p_tipo not in ('insumo', 'elaborado') then
    raise exception 'Tipo de ajuste desconocido: %', p_tipo;
  end if;

  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'Hay que escribir un motivo para ajustar el stock';
  end if;

  if p_stock_real is null or p_stock_real < 0 then
    raise exception 'El stock real no puede ser negativo';
  end if;

  if p_tipo = 'insumo' then
    if not (public.is_admin() or public.puede_editar_seccion('insumos')) then
      raise exception 'No autorizado';
    end if;
    -- for update: si dos personas ajustan el mismo insumo a la vez, la
    -- segunda espera y calcula su delta sobre el stock ya corregido, en
    -- vez de pisar el ajuste de la primera.
    select stock, nombre into v_actual, v_nombre
    from insumos where id = p_id and deleted_at is null for update;
  else
    if not (public.is_admin() or public.puede_editar_seccion('elaborados')) then
      raise exception 'No autorizado';
    end if;
    select stock_porciones, nombre into v_actual, v_nombre
    from elaborados where id = p_id and deleted_at is null for update;
  end if;

  if v_actual is null then
    raise exception 'No se encontró ese ítem para ajustar';
  end if;

  v_delta := p_stock_real - v_actual;
  if v_delta = 0 then
    raise exception 'El stock de % ya es %, no hay nada que ajustar', v_nombre, p_stock_real;
  end if;

  if p_tipo = 'insumo' then
    update insumos set stock = p_stock_real where id = p_id;
    insert into movimientos (insumo_id, tipo, cantidad, stock_resultante, ref)
    values (p_id, 'ajuste', v_delta, p_stock_real, 'Ajuste: ' || trim(p_motivo));
  else
    update elaborados set stock_porciones = p_stock_real where id = p_id;
    insert into movimientos (elaborado_id, tipo, cantidad, stock_resultante, ref)
    values (p_id, 'ajuste', v_delta, p_stock_real, 'Ajuste: ' || trim(p_motivo));
  end if;
end;
$$;

revoke execute on function public.fn_ajustar_stock(text, bigint, numeric, text) from public;
grant execute on function public.fn_ajustar_stock(text, bigint, numeric, text) to authenticated;
