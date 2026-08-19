import { supabase } from '../../lib/supabase/client';

export async function fetchProveedores() {
  const { data, error } = await supabase.from('proveedores').select('*').is('deleted_at', null).order('nombre');
  if (error) throw error;
  return data;
}

export async function crearProveedor(v: { nombre: string; cuit: string; telefono: string; email: string }) {
  const { error } = await supabase.from('proveedores').insert({
    nombre: v.nombre,
    cuit: v.cuit || null,
    telefono: v.telefono || null,
    email: v.email || null,
  });
  if (error) throw error;
}

export async function actualizarProveedor(v: { id: number; nombre: string; cuit: string; telefono: string; email: string }) {
  const { error } = await supabase
    .from('proveedores')
    .update({
      nombre: v.nombre,
      cuit: v.cuit || null,
      telefono: v.telefono || null,
      email: v.email || null,
    })
    .eq('id', v.id);
  if (error) throw error;
}

export async function borrarProveedor(id: number) {
  const { error } = await supabase.from('proveedores').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function fetchFacturasDeProveedor(proveedorId: number) {
  const { data, error } = await supabase
    .from('facturas_proveedor')
    .select('*')
    .eq('proveedor_id', proveedorId)
    .is('deleted_at', null)
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data;
}

export async function crearFactura(v: {
  proveedorId: number;
  fecha: string;
  monto: number;
  numeroFactura: string;
  cargadoPor: string;
}) {
  const { error } = await supabase.from('facturas_proveedor').insert({
    proveedor_id: v.proveedorId,
    fecha: v.fecha,
    monto: v.monto,
    numero_factura: v.numeroFactura || null,
    cargado_por: v.cargadoPor,
  });
  if (error) throw error;
}

export async function borrarFactura(id: number) {
  const { error } = await supabase.from('facturas_proveedor').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
