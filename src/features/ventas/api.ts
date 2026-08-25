import { supabase } from '../../lib/supabase/client';

export async function fetchVentas() {
  const { data, error } = await supabase
    .from('ventas')
    .select(
      '*, mesas(label, es_take_away), clientes(nombre, apellido, email, dni, cuit), mozo:profiles(nombre), facturas_electronicas(id, estado, tipo_comprobante, cae, cae_vencimiento, numero, punto_venta, cuit_emisor, error_mensaje)'
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}

// Para reimprimir el ticket de una venta vieja: los ítems del pedido
// original no se borran cuando se cobra (ni cuando se soft-borra la venta
// -- son tablas distintas), así que "reimprimir" es solo volver a leerlos,
// no algo que haya que guardar aparte a propósito.
export async function fetchItemsParaTicket(pedidoId: number) {
  const { data, error } = await supabase.from('pedido_items').select('*, productos(*)').eq('pedido_id', pedidoId).order('id');
  if (error) throw error;
  return data;
}

export async function actualizarMetodoPago(id: number, metodoPago: string) {
  const { error } = await supabase.from('ventas').update({ metodo_pago: metodoPago }).eq('id', id);
  if (error) throw error;
}

// RPC en vez de un update directo -- fn_anular_venta no solo marca
// deleted_at, también revierte el stock que se había descontado al cobrar
// (salvo que el mismo pedido tenga otra venta activa por un pago
// dividido, ahí espera a que se anule esa también).
export async function borrarVenta(id: number) {
  const { error } = await supabase.rpc('fn_anular_venta', { p_venta_id: id });
  if (error) throw error;
}
