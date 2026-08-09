import { supabase } from '../../lib/supabase/client';

export async function fetchGastos() {
  const { data, error } = await supabase
    .from('gastos')
    .select('*, insumos(nombre)')
    .is('deleted_at', null)
    .order('fecha', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export async function fetchInsumos() {
  const { data, error } = await supabase.from('insumos').select('*').is('deleted_at', null).order('nombre');
  if (error) throw error;
  return data;
}

export async function registrarGasto(v: { insumoId: number; cantidad: number; costoTotal: number; proveedor: string; usuarioId: string }) {
  const { error } = await supabase.rpc('fn_registrar_gasto', {
    p_insumo_id: v.insumoId,
    p_cantidad: v.cantidad,
    p_costo_total: v.costoTotal,
    p_proveedor: v.proveedor || undefined,
    p_usuario_id: v.usuarioId,
  });
  if (error) throw error;
}
