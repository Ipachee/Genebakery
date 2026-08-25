-- Issue #11 del roadmap: la Papelera podía restaurar cualquiera de los 17
-- tipos, pero no eliminar nada de forma definitiva -- lo borrado quedaba
-- acumulándose para siempre.
--
-- Decisiones tomadas acá, a propósito:
--
-- 1. SÓLO ADMIN. Restaurar es reversible; purgar no. No se usa
--    puede_editar_seccion('papelera') porque eso permitiría que un cargo
--    con el tick de "Editar" borre datos de forma irrecuperable.
--
-- 2. SIN expiración automática. Purgar solo lo que quedó viejo requiere
--    elegir un plazo de retención (¿30 días? ¿90?) y eso es una decisión
--    del negocio, no técnica -- y equivocarse destruye datos reales sin
--    que nadie lo pida. Queda como paso aparte si se decide un plazo.
--
-- 3. El nombre de tabla NUNCA viene del parámetro: sale de un CASE
--    hardcodeado. Si llegara a armarse el SQL concatenando p_tipo, un
--    valor malicioso ahí sería inyección directa contra una función
--    security definer.
--
-- 4. Si algo depende del registro (ej. un producto que ya se vendió y
--    tiene pedido_items), la FK lo impide -- eso está bien, borrarlo
--    rompería el historial. Se captura el error para dar un mensaje que
--    se entienda en vez del texto crudo de Postgres.
create or replace function public.fn_purgar_papelera(p_tipo text, p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tabla text;
  v_borradas int;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede eliminar definitivamente';
  end if;

  v_tabla := case p_tipo
    when 'insumo' then 'insumos'
    when 'producto' then 'productos'
    when 'mesa' then 'mesas'
    when 'salon' then 'salones'
    when 'cliente' then 'clientes'
    when 'empleado' then 'empleados'
    when 'elaborado' then 'elaborados'
    when 'produccion' then 'producciones'
    when 'pedido' then 'pedidos'
    when 'venta' then 'ventas'
    when 'gasto' then 'gastos'
    when 'proveedor' then 'proveedores'
    when 'factura_proveedor' then 'facturas_proveedor'
    when 'categoria' then 'categorias'
    when 'elemento_decorativo' then 'elementos_decorativos'
    when 'factura_electronica' then 'facturas_electronicas'
    when 'calendario_equipo' then 'calendario_equipo'
    when 'pago_empleado' then 'pagos_empleados'
    else null
  end;

  if v_tabla is null then
    raise exception 'Tipo desconocido en la papelera: %', p_tipo;
  end if;

  -- El `deleted_at is not null` no es de más: impide que una llamada
  -- directa al RPC borre un registro ACTIVO, salteándose la papelera.
  begin
    execute format('delete from %I where id = $1 and deleted_at is not null', v_tabla) using p_id;
    get diagnostics v_borradas = row_count;
  exception
    when foreign_key_violation then
      raise exception 'No se puede eliminar definitivamente: hay otros registros que todavía dependen de este. Borralos primero.';
  end;

  if v_borradas = 0 then
    raise exception 'No se encontró ese registro en la papelera (puede que ya lo hayan restaurado o eliminado)';
  end if;
end;
$$;

revoke execute on function public.fn_purgar_papelera(text, bigint) from public;
grant execute on function public.fn_purgar_papelera(text, bigint) to authenticated;
