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
