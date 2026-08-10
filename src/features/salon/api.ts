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

export async function fetchEstadoDeMesas() {
  const { data, error } = await supabase
    .from('pedidos')
    .select('mesa_id, estado')
    .in('estado', ['abierto', 'enviado_cocina', 'entregado'])
    .is('deleted_at', null)
    .not('mesa_id', 'is', null);
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

async function mesasConPedidoActivo(mesaIds: number[]) {
  const { data, error } = await supabase
    .from('pedidos')
    .select('mesa_id')
    .in('mesa_id', mesaIds)
    .in('estado', ['abierto', 'enviado_cocina', 'entregado'])
    .is('deleted_at', null);
  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function dividirMesa(mesa: { id: number; salon_id: number; x: number; y: number }) {
  if (await mesasConPedidoActivo([mesa.id])) {
    throw new Error('No se puede dividir: la mesa tiene un pedido activo. Cobralo o cancelalo primero.');
  }
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

// Layout real del local tal como se cargo en el seed inicial (supabase/seeds/01-plano.sql).
// "Restablecer" vuelve las posiciones/tamaños originales sin borrar nada
// agregado despues (mesas nuevas, salones nuevos).
const SALONES_ORIGINALES: Record<number, { x: number; y: number; w: number; h: number }> = {
  1: { x: 10, y: 10, w: 290, h: 195 },
  2: { x: 305, y: 10, w: 345, h: 280 },
  3: { x: 655, y: 10, w: 460, h: 280 },
  4: { x: 10, y: 210, w: 290, h: 110 },
  5: { x: 120, y: 325, w: 95, h: 105 },
  6: { x: 10, y: 410, w: 105, h: 75 },
  7: { x: 655, y: 195, w: 65, h: 95 },
};
const MESAS_ORIGINALES: Record<number, { x: number; y: number; w: number; h: number }> = {
  1: { x: 1030, y: 100, w: 55, h: 55 },
  2: { x: 900, y: 20, w: 55, h: 55 },
  3: { x: 712, y: 95, w: 55, h: 55 },
  4: { x: 555, y: 40, w: 68, h: 46 },
  5: { x: 310, y: 35, w: 55, h: 55 },
  6: { x: 310, y: 105, w: 68, h: 46 },
  7: { x: 505, y: 215, w: 55, h: 55 },
  8: { x: 370, y: 215, w: 55, h: 55 },
  9: { x: 215, y: 78, w: 68, h: 46 },
  10: { x: 25, y: 45, w: 68, h: 46 },
  11: { x: 30, y: 128, w: 68, h: 46 },
  12: { x: 165, y: 240, w: 55, h: 55 },
};

export async function restablecerPlano() {
  await Promise.all([
    ...Object.entries(SALONES_ORIGINALES).map(([id, pos]) =>
      supabase.from('salones').update(pos).eq('id', Number(id))
    ),
    ...Object.entries(MESAS_ORIGINALES).map(([id, pos]) =>
      supabase.from('mesas').update(pos).eq('id', Number(id))
    ),
  ]);
}

export async function unirMesa(mesaPadreId: number) {
  const { data: hijas, error: e1 } = await supabase
    .from('mesas')
    .select('id')
    .eq('mesa_padre_id', mesaPadreId)
    .is('deleted_at', null);
  if (e1) throw e1;
  const hijaIds = (hijas ?? []).map((h) => h.id);
  if (hijaIds.length && (await mesasConPedidoActivo(hijaIds))) {
    throw new Error('No se puede unir: una de las mitades tiene un pedido activo. Cobralo o cancelalo primero.');
  }
  const { error } = await supabase
    .from('mesas')
    .update({ deleted_at: new Date().toISOString() })
    .eq('mesa_padre_id', mesaPadreId);
  if (error) throw error;
}
