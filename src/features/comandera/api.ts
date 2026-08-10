import { supabase } from '../../lib/supabase/client';

export async function fetchPedidosComandera() {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*, mesas(label), pedido_items(*, productos(*))')
    .in('estado', ['enviado_cocina', 'entregado'])
    .is('deleted_at', null)
    .order('enviado_at', { ascending: true });
  if (error) throw error;
  return data;
}

// Marca entregada una ronda puntual (un ticket de la comandera), no todo el
// pedido -- si la mesa tiene otra ronda todavía sin entregar, sigue
// mostrándose por separado.
export async function marcarRondaEntregada(pedidoId: number, ronda: number) {
  const { error } = await supabase.rpc('fn_marcar_ronda_entregada', { p_pedido_id: pedidoId, p_ronda: ronda });
  if (error) throw error;
}
