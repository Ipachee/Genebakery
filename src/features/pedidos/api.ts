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
    .in('estado', ['abierto', 'enviado_cocina', 'entregado'])
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
  const { data, error } = await supabase
    .from('pedido_items')
    .insert({ pedido_id: pedidoId, producto_id: productoId, precio_unitario: precioUnitario, nota: nota || null })
    .select('*, productos(*)')
    .single();
  if (error) throw error;
  return data;
}

export async function actualizarCantidadItem(itemId: number, cantidad: number) {
  const { data, error } = await supabase.from('pedido_items').update({ cantidad }).eq('id', itemId).select('*, productos(*)').single();
  if (error) throw error;
  return data;
}

export async function actualizarNotaItem(itemId: number, nota: string) {
  const { data, error } = await supabase
    .from('pedido_items')
    .update({ nota: nota || null })
    .eq('id', itemId)
    .select('*, productos(*)')
    .single();
  if (error) throw error;
  return data;
}

export async function quitarItem(itemId: number) {
  const { error } = await supabase.from('pedido_items').delete().eq('id', itemId);
  if (error) throw error;
}

// Si al mozo se le va la mano y agrega-y-saca un producto sin llegar a
// enviarlo a cocina, el pedido queda "abierto" con 0 items -- eso dejaba la
// mesa marcada como ocupada para siempre sin nada adentro. Se cancela ese
// pedido vacío (soft delete) para que la mesa vuelva a libre.
export async function cancelarPedido(pedidoId: number) {
  const { error } = await supabase.from('pedidos').update({ deleted_at: new Date().toISOString() }).eq('id', pedidoId);
  if (error) throw error;
}

export async function enviarACocina(pedidoId: number) {
  const { error: e1 } = await supabase
    .from('pedido_items')
    .update({ enviado_cocina: true })
    .eq('pedido_id', pedidoId)
    .eq('enviado_cocina', false);
  if (e1) throw e1;
  // Sin el filtro por estado 'abierto': una segunda tanda de la misma mesa
  // (agregada después de que cocina ya marcó "Entregado" la primera) tiene
  // que poder volver a "enviado_cocina" -- si no, el pedido quedaba
  // "entregado" en la base aunque la comandera mostrara otra cosa en el
  // momento, y al refrescar volvía a verse verde en vez de azul.
  const { error: e2 } = await supabase
    .from('pedidos')
    .update({ estado: 'enviado_cocina', enviado_at: new Date().toISOString() })
    .eq('id', pedidoId)
    .neq('estado', 'cobrado');
  if (e2) throw e2;
}

export async function marcarEntregado(pedidoId: number) {
  const { error } = await supabase.from('pedidos').update({ estado: 'entregado' }).eq('id', pedidoId);
  if (error) throw error;
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
  const { error } = await supabase.rpc('fn_cobrar_pedido', {
    p_pedido_id: params.pedidoId,
    p_turno_id: params.turnoId,
    p_mesa_id: params.mesaId,
    p_mozo_id: params.mozoId,
    p_cliente_id: params.clienteId ?? undefined,
    p_subtotal: params.subtotal,
    p_descuento: params.descuento,
    p_total: params.total,
    p_metodo_pago: params.metodoPago,
  });
  if (error) throw error;
}
