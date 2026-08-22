import { supabase } from '../../lib/supabase/client';

export async function fetchClientes() {
  const { data, error } = await supabase.from('clientes').select('*').is('deleted_at', null).order('nombre');
  if (error) throw error;
  return data;
}

export async function crearCliente(v: {
  nombre: string;
  apellido: string;
  dni: string;
  cuit: string;
  direccion: string;
  condicionFiscal: string;
  email: string;
  descuentoPct: number;
}) {
  const { error } = await supabase.from('clientes').insert({
    nombre: v.nombre,
    apellido: v.apellido,
    dni: v.dni || null,
    cuit: v.cuit || null,
    direccion: v.direccion || null,
    condicion_fiscal: v.condicionFiscal || null,
    email: v.email || null,
    descuento_pct: v.descuentoPct,
  });
  if (error) throw error;
}

export async function actualizarCliente(v: {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  cuit: string;
  direccion: string;
  condicionFiscal: string;
  email: string;
  descuentoPct: number;
}) {
  const { error } = await supabase
    .from('clientes')
    .update({
      nombre: v.nombre,
      apellido: v.apellido,
      dni: v.dni || null,
      cuit: v.cuit || null,
      direccion: v.direccion || null,
      condicion_fiscal: v.condicionFiscal || null,
      email: v.email || null,
      descuento_pct: v.descuentoPct,
    })
    .eq('id', v.id);
  if (error) throw error;
}

export async function borrarCliente(id: number) {
  const { error } = await supabase.from('clientes').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
