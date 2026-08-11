import { supabase } from '../../lib/supabase/client';

export async function fetchEstadoCredenciales() {
  const { data, error } = await supabase.rpc('fn_estado_credenciales_facturacion').single();
  if (error) throw error;
  return data;
}

// Los campos en blanco no borran lo que ya había cargado -- así se puede
// cambiar el proveedor sin tener que volver a tipear la clave.
export async function guardarCredenciales(v: { proveedor: string; usuario: string; claveSecreta: string; tokenApi: string }) {
  const { error } = await supabase.rpc('fn_guardar_credenciales_facturacion', {
    p_proveedor: v.proveedor,
    p_usuario: v.usuario,
    p_clave_secreta: v.claveSecreta,
    p_token_api: v.tokenApi,
  });
  if (error) throw error;
}
