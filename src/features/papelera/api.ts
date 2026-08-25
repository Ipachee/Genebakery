import { supabase } from '../../lib/supabase/client';
import type { Database } from '../../lib/supabase/types';

type TablaSoftDelete = Exclude<
  keyof Database['public']['Tables'],
  | 'movimientos'
  | 'recetas'
  | 'pedido_items'
  | 'turnos'
  | 'profiles'
  | 'perfil_negocio'
  | 'credenciales_facturacion'
  | 'roles_personalizados'
  | 'permisos_navegacion'
  | 'configuracion_turnos'
>;

const TABLA_POR_TIPO: Record<string, TablaSoftDelete> = {
  insumo: 'insumos',
  producto: 'productos',
  mesa: 'mesas',
  salon: 'salones',
  cliente: 'clientes',
  empleado: 'empleados',
  elaborado: 'elaborados',
  produccion: 'producciones',
  pedido: 'pedidos',
  venta: 'ventas',
  gasto: 'gastos',
  proveedor: 'proveedores',
  factura_proveedor: 'facturas_proveedor',
  categoria: 'categorias',
  elemento_decorativo: 'elementos_decorativos',
  factura_electronica: 'facturas_electronicas',
  calendario_equipo: 'calendario_equipo',
  pago_empleado: 'pagos_empleados',
};

export async function fetchPapelera() {
  const { data, error } = await supabase.from('papelera').select('*');
  if (error) throw error;
  return data;
}

export async function restaurar(tipo: string, id: number) {
  const tabla = TABLA_POR_TIPO[tipo];
  if (!tabla) throw new Error(`Tipo desconocido: ${tipo}`);
  const { error } = await supabase.from(tabla).update({ deleted_at: null }).eq('id', id);
  if (error) throw error;
}

// Borrado definitivo -- va por RPC y no por un delete directo porque la
// función es la que exige que sea admin (restaurar es reversible, esto no)
// y la que traduce el error de foreign key a algo que se entienda cuando
// hay historial dependiendo del registro. Ver docs/Papelera.md.
export async function purgar(tipo: string, id: number) {
  const { error } = await supabase.rpc('fn_purgar_papelera', { p_tipo: tipo, p_id: id });
  if (error) throw error;
}
