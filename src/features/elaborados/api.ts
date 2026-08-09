import { supabase } from '../../lib/supabase/client';

export async function fetchElaborados() {
  const { data, error } = await supabase
    .from('elaborados')
    .select('*, productos(nombre)')
    .is('deleted_at', null)
    .order('nombre');
  if (error) throw error;
  return data;
}

export async function fetchProductosSinElaborado() {
  const { data: productos, error: e1 } = await supabase.from('productos').select('*').is('deleted_at', null);
  if (e1) throw e1;
  const { data: elaborados, error: e2 } = await supabase.from('elaborados').select('producto_id').is('deleted_at', null);
  if (e2) throw e2;
  const usados = new Set(elaborados?.map((e) => e.producto_id));
  return (productos ?? []).filter((p) => !usados.has(p.id));
}

export async function crearElaborado(v: { nombre: string; productoId: number; porcionesPorUnidad: number; porcionesMin: number }) {
  const { error } = await supabase.from('elaborados').insert({
    nombre: v.nombre,
    producto_id: v.productoId,
    porciones_por_unidad: v.porcionesPorUnidad,
    porciones_min: v.porcionesMin,
  });
  if (error) throw error;
}

export async function borrarElaborado(id: number) {
  const { error } = await supabase.from('elaborados').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function registrarProduccion(elaboradoId: number, cantidadUnidades: number, usuarioId: string) {
  const { error } = await supabase.rpc('fn_registrar_produccion', {
    p_elaborado_id: elaboradoId,
    p_cantidad_unidades: cantidadUnidades,
    p_usuario_id: usuarioId,
  });
  if (error) throw error;
}
