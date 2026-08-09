import { supabase } from '../../lib/supabase/client';

export async function fetchUltimoTurno(etiqueta: string) {
  const { data, error } = await supabase
    .from('turnos')
    .select('*')
    .eq('etiqueta', etiqueta)
    .order('abierto_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchTurnoPorId(id: number) {
  const { data, error } = await supabase.from('turnos').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function abrirTurno(etiqueta: string, userId: string) {
  const { data, error } = await supabase
    .from('turnos')
    .insert({ etiqueta, abierto_por: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function reabrirTurno(id: number) {
  const { data, error } = await supabase
    .from('turnos')
    .update({ estado: 'abierto', cerrado_at: null })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function cerrarTurno(id: number) {
  const { data, error } = await supabase
    .from('turnos')
    .update({ estado: 'cerrado', cerrado_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchFacturadoTurno(turnoId: number) {
  const { data, error } = await supabase
    .from('ventas')
    .select('total')
    .eq('turno_id', turnoId)
    .is('deleted_at', null);
  if (error) throw error;
  return (data ?? []).reduce((sum, v) => sum + Number(v.total), 0);
}
