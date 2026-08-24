import { supabase } from '../../lib/supabase/client';

export async function fetchConfiguracionTurnos() {
  const { data, error } = await supabase.from('configuracion_turnos').select('*').order('dia_isodow');
  if (error) throw error;
  return data;
}

export async function actualizarActivoTurno(id: number, activo: boolean) {
  const { error } = await supabase.from('configuracion_turnos').update({ activo }).eq('id', id);
  if (error) throw error;
}
