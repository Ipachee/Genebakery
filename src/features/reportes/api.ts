import { supabase } from '../../lib/supabase/client';

export async function fetchVentasDesde(desde: string) {
  const { data, error } = await supabase
    .from('ventas')
    .select('total, created_at, metodo_pago')
    .gte('created_at', desde)
    .is('deleted_at', null)
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function fetchProductoMasVendido(desde: string) {
  const { data, error } = await supabase
    .from('pedido_items')
    .select('cantidad, productos(nombre), pedidos!inner(created_at, estado, deleted_at)')
    .gte('pedidos.created_at', desde)
    .eq('pedidos.estado', 'cobrado')
    .is('pedidos.deleted_at', null);
  if (error) throw error;
  return data;
}
