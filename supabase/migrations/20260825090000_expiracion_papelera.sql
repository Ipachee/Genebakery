-- Issue #11 (parte 2) del roadmap: purga automática de la papelera a los
-- 60 días. Decidido por el dueño del proyecto el 25/08/2026.
--
-- Decisiones:
--
-- 1. `fn_purgar_papelera_vencidos()` NO se le da permiso a `authenticated`
--    -- a diferencia de `fn_purgar_papelera` (la manual, ver
--    20260825060000), esta la dispara sólo el cron como `postgres`. Nadie
--    debería poder llamarla desde la app.
--
-- 2. Recorre registro por registro (no un DELETE masivo por tabla) para
--    poder atrapar `foreign_key_violation` de a uno: si un pedido viejo
--    todavía tiene una venta activa apuntándole (o cualquier otra
--    dependencia real), ESE registro se salta y sigue en la papelera --
--    se reintenta solo, el próximo día. Un DELETE masivo abortaría toda
--    la tabla por un solo registro bloqueado.
--
-- 3. Nombres de tabla desde un array hardcodeado, mismo criterio que el
--    CASE de la purga manual -- nunca desde un parámetro externo.
--
-- 4. Sin tabla de log aparte: pg_cron ya guarda el historial de cada
--    corrida en `cron.job_run_details` (retorno, duración, errores) --
--    agregar una tabla de auditoría propia es I/O de más para algo que ya
--    viene gratis. Si más adelante se necesita algo más rico, ver el
--    issue #17 (audit log).
create extension if not exists pg_cron with schema extensions;

create or replace function public.fn_purgar_papelera_vencidos()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_retencion interval := interval '60 days';
  v_tablas text[] := array[
    'insumos', 'productos', 'mesas', 'salones', 'clientes', 'empleados', 'elaborados',
    'producciones', 'pedidos', 'ventas', 'gastos', 'proveedores', 'facturas_proveedor',
    'categorias', 'elementos_decorativos', 'facturas_electronicas', 'calendario_equipo', 'pagos_empleados'
  ];
  v_tabla text;
  v_id bigint;
  v_total int := 0;
begin
  foreach v_tabla in array v_tablas loop
    for v_id in execute format('select id from %I where deleted_at < now() - $1 order by id', v_tabla) using v_retencion
    loop
      begin
        execute format('delete from %I where id = $1', v_tabla) using v_id;
        v_total := v_total + 1;
      exception
        when foreign_key_violation then
          -- Sigue en la papelera -- algo todavía depende de este
          -- registro. Se reintenta solo mañana, cuando ya no dependa.
          continue;
      end;
    end loop;
  end loop;
  return v_total;
end;
$$;

revoke execute on function public.fn_purgar_papelera_vencidos() from public;
revoke execute on function public.fn_purgar_papelera_vencidos() from authenticated;

-- 6am UTC = 3am de Argentina -- fuera del horario de atención de un café,
-- para no competir por I/O con el uso real.
select cron.schedule(
  'purgar-papelera-vencida',
  '0 6 * * *',
  $$ select public.fn_purgar_papelera_vencidos(); $$
);
