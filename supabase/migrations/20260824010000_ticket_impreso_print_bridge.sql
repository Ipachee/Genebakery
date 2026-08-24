-- print-bridge ahora también imprime el ticket de cobro y la Factura B/A/C
-- por ESC/POS (antes solo comandas de cocina/barra) -- necesita una forma
-- persistida de saber qué ventas/facturas ya imprimió, a diferencia de las
-- comandas (que usan un Set en memoria, ver print-bridge/index.js). Se
-- backfillea a las filas existentes para que el primer arranque no
-- intente reimprimir todo el historial de golpe.
alter table ventas add column ticket_impreso_at timestamptz;
update ventas set ticket_impreso_at = created_at where ticket_impreso_at is null;

alter table facturas_electronicas add column ticket_impreso_at timestamptz;
update facturas_electronicas set ticket_impreso_at = created_at where ticket_impreso_at is null;
