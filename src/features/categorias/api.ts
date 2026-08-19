import { supabase } from '../../lib/supabase/client';

export async function fetchCategorias() {
  const { data, error } = await supabase.from('categorias').select('*').is('deleted_at', null).order('orden').order('nombre');
  if (error) throw error;
  return data;
}

export async function crearCategoria(v: { nombre: string; orden: number }) {
  const { error } = await supabase.from('categorias').insert({ nombre: v.nombre, orden: v.orden });
  if (error) throw error;
}

export async function actualizarCategoria(v: { id: number; nombre: string; orden: number }) {
  const { error } = await supabase.from('categorias').update({ nombre: v.nombre, orden: v.orden }).eq('id', v.id);
  if (error) throw error;
}

export async function borrarCategoria(id: number) {
  const { error } = await supabase.from('categorias').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
