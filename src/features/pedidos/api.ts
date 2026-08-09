import { supabase } from '../../lib/supabase/client';

export async function fetchProductos() {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('activo', true)
    .is('deleted_at', null)
    .order('categoria')
    .order('nombre');
  if (error) throw error;
  return data;
}

export async function fetchPedidoAbiertoDeMesa(mesaId: number) {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*, pedido_items(*, productos(*))')
    .eq('mesa_id', mesaId)
    .in('estado', ['abierto', 'enviado_cocina'])
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function crearPedido(mesaId: number, turnoId: number, mozoId: string) {
  const { data, error } = await supabase
    .from('pedidos')
    .insert({ mesa_id: mesaId, turno_id: turnoId, mozo_id: mozoId, estado: 'abierto' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function agregarItem(pedidoId: number, productoId: number, precioUnitario: number, nota: string) {
  const { error } = await supabase.from('pedido_items').insert({
    pedido_id: pedidoId,
    producto_id: productoId,
    precio_unitario: precioUnitario,
    nota: nota || null,
  });
  if (error) throw error;
}

export async function actualizarCantidadItem(itemId: number, cantidad: number) {
  const { error } = await supabase.from('pedido_items').update({ cantidad }).eq('id', itemId);
  if (error) throw error;
}

export async function actualizarNotaItem(itemId: number, nota: string) {
  const { error } = await supabase.from('pedido_items').update({ nota: nota || null }).eq('id', itemId);
  if (error) throw error;
}

export async function quitarItem(itemId: number) {
  const { error } = await supabase.from('pedido_items').delete().eq('id', itemId);
  if (error) throw error;
}

export async function enviarACocina(pedidoId: number) {
  const { error: e1 } = await supabase
    .from('pedido_items')
    .update({ enviado_cocina: true })
    .eq('pedido_id', pedidoId)
    .eq('enviado_cocina', false);
  if (e1) throw e1;
  const { error: e2 } = await supabase
    .from('pedidos')
    .update({ estado: 'enviado_cocina' })
    .eq('id', pedidoId)
    .eq('estado', 'abierto');
  if (e2) throw e2;
}

export async function cobrarPedido(params: {
  pedidoId: number;
  turnoId: number;
  mesaId: number;
  mozoId: string;
  clienteId: number | null;
  subtotal: number;
  descuento: number;
  total: number;
  metodoPago: string;
}) {
  const { error: e1 } = await supabase
    .from('pedidos')
    .update({
      estado: 'cobrado',
      cobrado_at: new Date().toISOString(),
      subtotal: params.subtotal,
      descuento: params.descuento,
      total: params.total,
      metodo_pago: params.metodoPago,
      cliente_id: params.clienteId,
    })
    .eq('id', params.pedidoId);
  if (e1) throw e1;

  const { error: e2 } = await supabase.from('ventas').insert({
    pedido_id: params.pedidoId,
    turno_id: params.turnoId,
    mesa_id: params.mesaId,
    mozo_id: params.mozoId,
    cliente_id: params.clienteId,
    subtotal: params.subtotal,
    descuento: params.descuento,
    total: params.total,
    metodo_pago: params.metodoPago,
  });
  if (e2) throw e2;
}
