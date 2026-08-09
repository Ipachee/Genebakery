import { supabase } from '../../lib/supabase/client';

export async function fetchMovimientos() {
  const { data, error } = await supabase
    .from('movimientos')
    .select('*, insumos(nombre), elaborados(nombre)')
    .order('fecha', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}
