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

// Todavía no dispara nada hacia AFIP/ARCA de verdad -- solo deja pedido el
// registro (venta, tipo de comprobante, mail de envío) para que, cuando se
// conecte la emisión real, ese paso encuentre acá todo lo que necesita y
// solo tenga que completar cae/numero/pdf_url y pasar el estado a
// 'emitida'. Mientras tanto queda en 'pendiente'.
export async function crearFacturaPendiente(v: {
  ventaId: number;
  clienteId: number | null;
  tipoComprobante: 'factura_a' | 'factura_b' | 'factura_c';
  mailEnvio: string;
  usuarioId: string;
}) {
  const { error } = await supabase.from('facturas_electronicas').insert({
    venta_id: v.ventaId,
    cliente_id: v.clienteId,
    tipo_comprobante: v.tipoComprobante,
    mail_envio: v.mailEnvio,
    creado_por: v.usuarioId,
  });
  if (error) throw error;
}
