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

// Numera los items recién enviados con una "ronda" nueva (fn_enviar_a_cocina)
// para que la comandera pueda armar un ticket separado por cada tanda, en
// vez de mezclar los items nuevos con los de una tanda anterior ya entregada.
export async function enviarACocina(pedidoId: number) {
  const { error } = await supabase.rpc('fn_enviar_a_cocina', { p_pedido_id: pedidoId });
  if (error) throw error;
}

// Marca entregado TODO lo pendiente del pedido de una sola vez -- se usa
// desde el panel de la mesa (no desde la comandera, que marca ronda por
// ronda con marcarRondaEntregada).
export async function marcarPedidoEntregado(pedidoId: number) {
  const { error } = await supabase.rpc('fn_marcar_pedido_entregado', { p_pedido_id: pedidoId });
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
