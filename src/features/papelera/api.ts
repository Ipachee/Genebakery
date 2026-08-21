import { supabase } from '../../lib/supabase/client';
import type { Database } from '../../lib/supabase/types';

type TablaSoftDelete = Exclude<
  keyof Database['public']['Tables'],
  'movimientos' | 'recetas' | 'pedido_items' | 'turnos' | 'profiles' | 'perfil_negocio' | 'credenciales_facturacion'
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
