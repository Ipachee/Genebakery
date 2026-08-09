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

export async function moverMesa(id: number, x: number, y: number) {
  const { error } = await supabase.from('mesas').update({ x, y }).eq('id', id);
  if (error) throw error;
}

export async function redimensionarMesa(id: number, w: number, h: number) {
  const { error } = await supabase.from('mesas').update({ w, h }).eq('id', id);
  if (error) throw error;
}

export async function moverSalon(id: number, x: number, y: number) {
  const { error } = await supabase.from('salones').update({ x, y }).eq('id', id);
  if (error) throw error;
}

export async function redimensionarSalon(id: number, w: number, h: number) {
  const { error } = await supabase.from('salones').update({ w, h }).eq('id', id);
  if (error) throw error;
}

export async function renombrarSalon(id: number, nombre: string) {
  const { error } = await supabase.from('salones').update({ nombre }).eq('id', id);
  if (error) throw error;
}

export async function crearSalon(nombre: string) {
  const { error } = await supabase
    .from('salones')
    .insert({ nombre, x: 20, y: 20, w: 200, h: 150, orden: 99 });
  if (error) throw error;
}

export async function borrarSalon(id: number) {
  const { error } = await supabase
    .from('salones')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function crearMesa(salonId: number, x: number, y: number) {
  const { error } = await supabase
    .from('mesas')
    .insert({ salon_id: salonId, x, y, w: 55, h: 55, shape: 'square' });
  if (error) throw error;
}

export async function borrarMesa(id: number) {
  const { error } = await supabase
    .from('mesas')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function dividirMesa(mesa: { id: number; salon_id: number; x: number; y: number }) {
  const { error } = await supabase.from('mesas').insert([
    {
      salon_id: mesa.salon_id,
      mesa_padre_id: mesa.id,
      label: 'A',
      x: mesa.x - 15,
      y: mesa.y,
      w: 40,
      h: 40,
      shape: 'square',
    },
    {
      salon_id: mesa.salon_id,
      mesa_padre_id: mesa.id,
      label: 'B',
      x: mesa.x + 30,
      y: mesa.y,
      w: 40,
      h: 40,
      shape: 'square',
    },
  ]);
  if (error) throw error;
}

export async function unirMesa(mesaPadreId: number) {
  const { error } = await supabase
    .from('mesas')
    .update({ deleted_at: new Date().toISOString() })
    .eq('mesa_padre_id', mesaPadreId);
  if (error) throw error;
}
