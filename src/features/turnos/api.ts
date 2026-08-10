import { supabase } from '../../lib/supabase/client';
import { ESTADOS_PEDIDO_ACTIVO } from '../../lib/pedidoConstantes';

// Visible sin login (RLS bypaseado a proposito en la vista): solo etiqueta +
// estado, para mostrar en la pantalla de inicio de sesion cual turno esta
// abierto antes de que nadie se loguee.
export async function fetchTurnosPublico() {
  const { data, error } = await supabase.from('turnos_publico').select('*');
  if (error) throw error;
  return data;
}

export async function resolverTurno(etiqueta: string, usuarioId: string) {
  const { data, error } = await supabase.rpc('fn_resolver_turno', { p_etiqueta: etiqueta, p_usuario_id: usuarioId });
  if (error) throw error;
  return data;
}

export async function fetchTurnoPorId(id: number) {
  const { data, error } = await supabase.from('turnos').select('*').eq('id', id).single();
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

export async function fetchVentasDelTurno(turnoId: number) {
  const { data, error } = await supabase
    .from('ventas')
    .select('*, mesas(label), clientes(nombre, apellido)')
    .eq('turno_id', turnoId)
    .is('deleted_at', null)
    .order('created_at');
  if (error) throw error;
  return data;
}

// Mesas sin cobrar en este momento, sin importar en que turno se abrio el
// pedido -- si mañana dejo una mesa pendiente, sigue pendiente para el
// cierre de tarde aunque el pedido no sea "de" ese turno.
export async function fetchMesasPendientesDelTurno(_turnoId: number) {
  const { data, error } = await supabase
    .from('pedidos')
    .select('mesa_id, estado, mesas(label)')
    .in('estado', ESTADOS_PEDIDO_ACTIVO)
    .is('deleted_at', null);
  if (error) throw error;
  return data;
}

export async function fetchInsumosStockBajo() {
  const { data, error } = await supabase.from('insumos').select('*').is('deleted_at', null);
  if (error) throw error;
  return (data ?? []).filter((i) => Number(i.stock) <= Number(i.stock_min));
}

function blobABase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function enviarResumenPorMail(v: { to: string; subject: string; pdf: Blob; filename: string }) {
  const pdfBase64 = await blobABase64(v.pdf);
  const { data, error } = await supabase.functions.invoke('send-cierre-email', {
    body: { to: v.to, subject: v.subject, pdfBase64, filename: v.filename },
  });
  if (error) throw error;
  return data;
}
