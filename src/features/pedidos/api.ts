import { supabase } from '../../lib/supabase/client';
import { ESTADOS_PEDIDO_ACTIVO } from '../../lib/pedidoConstantes';

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

// Mueve el pedido activo ENTERO a otra mesa (el cliente se cambió de
// lugar). No deja transferir a una mesa que ya tenga su propio pedido
// activo -- para eso está transferirItems, que sí permite sumarse a otro.
export async function transferirPedido(pedidoId: number, mesaDestinoId: number) {
  const { data: ocupada, error: e1 } = await supabase
    .from('pedidos')
    .select('id')
    .eq('mesa_id', mesaDestinoId)
    .in('estado', ESTADOS_PEDIDO_ACTIVO)
    .is('deleted_at', null)
    .limit(1);
  if (e1) throw e1;
  if ((ocupada ?? []).length > 0) {
    throw new Error('Esa mesa ya tiene un pedido activo.');
  }
  const { error: e2 } = await supabase.from('pedidos').update({ mesa_id: mesaDestinoId }).eq('id', pedidoId);
  if (e2) throw e2;
}

// Mueve solo ALGUNAS unidades a otra mesa (una persona de la mesa se
// cambia de lugar, y a veces se lleva solo parte de lo pedido -- ej. 1 de
// los 2 budines). Si la fila de origen tiene más cantidad de la que se
// pide transferir, se parte: se le resta la cantidad a la fila original y
// se crea una fila nueva en el destino con lo transferido (copiando si ya
// estaba enviado a cocina / entregado, para no perder ese estado). Si la
// fila entera se transfiere, simplemente cambia de pedido. Si la mesa
// destino ya tiene un pedido activo, se suma ahí; si está libre, se crea
// uno nuevo. Si al origen no le queda nada, se cancela solo.
export async function transferirItems(
  seleccion: { itemId: number; cantidad: number }[],
  origenPedidoId: number,
  mesaDestinoId: number,
  turnoId: number,
  mozoId: string
) {
  const { data: existente, error: e1 } = await supabase
    .from('pedidos')
    .select('id')
    .eq('mesa_id', mesaDestinoId)
    .in('estado', ESTADOS_PEDIDO_ACTIVO)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (e1) throw e1;
  let destinoPedidoId = existente?.id;
  if (!destinoPedidoId) {
    const { data: nuevo, error: e2 } = await supabase
      .from('pedidos')
      .insert({ mesa_id: mesaDestinoId, turno_id: turnoId, mozo_id: mozoId, estado: 'abierto' })
      .select('id')
      .single();
    if (e2) throw e2;
    destinoPedidoId = nuevo.id;
  }

  for (const { itemId, cantidad } of seleccion) {
    const { data: item, error: eItem } = await supabase.from('pedido_items').select('*').eq('id', itemId).single();
    if (eItem) throw eItem;
    if (Number(item.cantidad) <= cantidad) {
      const { error } = await supabase.from('pedido_items').update({ pedido_id: destinoPedidoId }).eq('id', itemId);
      if (error) throw error;
    } else {
      const { error: eBaja } = await supabase
        .from('pedido_items')
        .update({ cantidad: Number(item.cantidad) - cantidad })
        .eq('id', itemId);
      if (eBaja) throw eBaja;
      const { error: eNueva } = await supabase.from('pedido_items').insert({
        pedido_id: destinoPedidoId,
        producto_id: item.producto_id,
        precio_unitario: item.precio_unitario,
        cantidad,
        nota: item.nota,
        enviado_cocina: item.enviado_cocina,
        entregado: item.entregado,
        ronda: item.ronda,
        enviado_cocina_at: item.enviado_cocina_at,
      });
      if (eNueva) throw eNueva;
    }
  }

  const { data: quedan, error: e4 } = await supabase.from('pedido_items').select('id').eq('pedido_id', origenPedidoId).limit(1);
  if (e4) throw e4;
  if ((quedan ?? []).length === 0) {
    await cancelarPedido(origenPedidoId);
  }
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
  // Si viene con datos, se cobra dividido: una fila en "ventas" por cada
  // forma de pago. El total de los montos tiene que sumar `total` -- si
  // no, la función SQL rechaza el cobro entero.
  pagos?: { metodo: string; monto: number }[];
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
    p_pagos: params.pagos && params.pagos.length > 0 ? params.pagos : undefined,
  });
  if (error) throw error;
}
