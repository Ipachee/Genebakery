import { supabase } from '../../lib/supabase/client';

export async function fetchVentas() {
  const { data, error } = await supabase
    .from('ventas')
    .select('*, mesas(label), clientes(nombre, apellido)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}

export async function actualizarMetodoPago(id: number, metodoPago: string) {
  const { error } = await supabase.from('ventas').update({ metodo_pago: metodoPago }).eq('id', id);
  if (error) throw error;
}

export async function borrarVenta(id: number) {
  const { error } = await supabase.from('ventas').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
