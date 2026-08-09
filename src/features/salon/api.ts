import { supabase } from '../../lib/supabase/client';

export async function fetchSalones() {
  const { data, error } = await supabase
    .from('salones')
    .select('*')
    .is('deleted_at', null)
    .order('orden');
  if (error) throw error;
  return data;
}

export async function fetchMesas() {
  const { data, error } = await supabase
    .from('mesas')
    .select('*')
    .is('deleted_at', null);
  if (error) throw error;
  return data;
}
