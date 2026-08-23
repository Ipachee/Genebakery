import { supabase } from '../../lib/supabase/client';

export async function fetchVentasDesde(desde: string) {
  const { data, error } = await supabase
    .from('ventas')
    .select('total, created_at, metodo_pago, mesas(es_take_away)')
    .gte('created_at', desde)
    .is('deleted_at', null)
    .order('created_at');
  if (error) throw error;
  return data;
}

// Via función security definer (fn_resumen_gastos_rango) -- quien ve
// Reportes no necesariamente tiene "Ver" tildado en Gastos/Cobranzas, y
// sin esto el total de gastos del período quedaría siempre en $0.
export async function fetchResumenGastosRango(desde: string, hasta: string) {
  const { data, error } = await supabase.rpc('fn_resumen_gastos_rango', { p_desde: desde, p_hasta: hasta });
  if (error) throw error;
  return data;
}

export async function fetchProductoMasVendido(desde: string) {
  const { data, error } = await supabase
    .from('pedido_items')
    .select('cantidad, precio_unitario, productos(nombre), pedidos!inner(created_at, estado, deleted_at)')
    .gte('pedidos.created_at', desde)
    .eq('pedidos.estado', 'cobrado')
    .is('pedidos.deleted_at', null);
  if (error) throw error;
  return data;
}
