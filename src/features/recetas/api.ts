import { supabase } from '../../lib/supabase/client';

export async function fetchProductos() {
  const { data, error } = await supabase.from('productos').select('*').is('deleted_at', null).order('categoria').order('nombre');
  if (error) throw error;
  return data;
}

export async function crearProducto(v: { nombre: string; categoria: string; precio: number }) {
  const { data, error } = await supabase
    .from('productos')
    .insert({ nombre: v.nombre, categoria: v.categoria, precio: v.precio })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// "Pausado" (activo=false) saca el producto del menú de Comandar pedidos
// sin borrarlo -- conserva receta, costo e historial, para cuando vuelva a
// haber stock/se retome. La receta se sigue pudiendo ver y editar
// pausado o no.
export async function actualizarActivoProducto(id: number, activo: boolean) {
  const { error } = await supabase.from('productos').update({ activo }).eq('id', id);
  if (error) throw error;
}

export async function fetchInsumos() {
  const { data, error } = await supabase.from('insumos').select('*').is('deleted_at', null).order('nombre');
  if (error) throw error;
  return data;
}

export async function fetchRecetaDeProducto(productoId: number) {
  const { data, error } = await supabase.from('recetas').select('*, insumos(*)').eq('producto_id', productoId);
  if (error) throw error;
  return data;
}

export async function agregarIngrediente(productoId: number, insumoId: number, cantidad: number) {
  const { error } = await supabase
    .from('recetas')
    .upsert({ producto_id: productoId, insumo_id: insumoId, cantidad }, { onConflict: 'producto_id,insumo_id' });
  if (error) throw error;
}

export async function quitarIngrediente(id: number) {
  const { error } = await supabase.from('recetas').delete().eq('id', id);
  if (error) throw error;
}
