import { supabase } from '../../lib/supabase/client';

export async function fetchPagosEmpleados() {
  const { data, error } = await supabase
    .from('pagos_empleados')
    .select('*, empleados(nombre, apellido)')
    .is('deleted_at', null)
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data;
}

export async function crearPago(v: {
  empleadoId: number;
  monto: number;
  fecha: string;
  concepto: string;
  metodoPago: string;
  creadoPor: string;
}) {
  const { error } = await supabase.from('pagos_empleados').insert({
    empleado_id: v.empleadoId,
    monto: v.monto,
    fecha: v.fecha,
    concepto: v.concepto || null,
    metodo_pago: v.metodoPago || null,
    creado_por: v.creadoPor,
  });
  if (error) throw error;
}

export async function actualizarPago(v: {
  id: number;
  empleadoId: number;
  monto: number;
  fecha: string;
  concepto: string;
  metodoPago: string;
}) {
  const { error } = await supabase
    .from('pagos_empleados')
    .update({
      empleado_id: v.empleadoId,
      monto: v.monto,
      fecha: v.fecha,
      concepto: v.concepto || null,
      metodo_pago: v.metodoPago || null,
    })
    .eq('id', v.id);
  if (error) throw error;
}

export async function borrarPago(id: number) {
  const { error } = await supabase.from('pagos_empleados').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
