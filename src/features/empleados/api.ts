import { supabase } from '../../lib/supabase/client';

export async function fetchEmpleados() {
  const { data, error } = await supabase.from('empleados').select('*').is('deleted_at', null).order('nombre');
  if (error) throw error;
  return data;
}

export async function crearEmpleado(v: {
  nombre: string;
  apellido: string;
  dni: string;
  puesto: string;
  ingreso: string;
  descuentoPct: number;
}) {
  const { error } = await supabase.from('empleados').insert({
    nombre: v.nombre,
    apellido: v.apellido,
    dni: v.dni || null,
    puesto: v.puesto || null,
    ingreso: v.ingreso || null,
    descuento_pct: v.descuentoPct,
  });
  if (error) throw error;
}

export async function actualizarEmpleado(v: {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  puesto: string;
  ingreso: string;
  descuentoPct: number;
}) {
  const { error } = await supabase
    .from('empleados')
    .update({
      nombre: v.nombre,
      apellido: v.apellido,
      dni: v.dni || null,
      puesto: v.puesto || null,
      ingreso: v.ingreso || null,
      descuento_pct: v.descuentoPct,
    })
    .eq('id', v.id);
  if (error) throw error;
}

export async function borrarEmpleado(id: number) {
  const { error } = await supabase.from('empleados').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
