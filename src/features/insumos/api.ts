import { supabase } from '../../lib/supabase/client';

export async function fetchInsumos() {
  const { data, error } = await supabase
    .from('insumos')
    .select('*')
    .is('deleted_at', null)
    .order('nombre');
  if (error) throw error;
  return data;
}

export async function crearInsumo(v: { nombre: string; unidad: string; stock: number; costoUnit: number; stockMin: number }) {
  const { error } = await supabase.from('insumos').insert({
    nombre: v.nombre,
    unidad: v.unidad,
    stock: v.stock,
    stock_inicial: v.stock,
    costo_unit: v.costoUnit,
    stock_min: v.stockMin,
  });
  if (error) throw error;
}

export async function borrarInsumo(id: number) {
  const { error } = await supabase
    .from('insumos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
