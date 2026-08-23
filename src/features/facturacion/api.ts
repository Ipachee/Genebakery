import { supabase } from '../../lib/supabase/client';

export async function fetchEstadoCredenciales() {
  const { data, error } = await supabase.rpc('fn_estado_credenciales_facturacion').single();
  if (error) throw error;
  return data;
}

// Los campos en blanco no borran lo que ya había cargado -- así se puede
// cambiar el proveedor sin tener que volver a tipear la clave.
export async function guardarCredenciales(v: {
  proveedor: string;
  usuario: string;
  claveSecreta: string;
  tokenApi: string;
  modo: 'dev' | 'prod';
}) {
  const { error } = await supabase.rpc('fn_guardar_credenciales_facturacion', {
    p_proveedor: v.proveedor,
    p_usuario: v.usuario,
    p_clave_secreta: v.claveSecreta,
    p_token_api: v.tokenApi,
    p_modo: v.modo,
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
  const { data, error } = await supabase
    .from('facturas_electronicas')
    .insert({
      venta_id: v.ventaId,
      cliente_id: v.clienteId,
      tipo_comprobante: v.tipoComprobante,
      mail_envio: v.mailEnvio,
      creado_por: v.usuarioId,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Llama a la Edge Function que le pide el CAE a ARCA (via AfipSDK) y deja
// la fila de facturas_electronicas actualizada con el resultado --
// 'emitida' + cae/numero, o 'error' + error_mensaje si ARCA la rechaza.
export async function emitirFactura(facturaId: number) {
  const { data, error } = await supabase.functions.invoke('emitir-factura', { body: { facturaId } });
  if (error) {
    const mensaje = (await error.context?.text?.().catch(() => null)) || error.message;
    throw new Error(mensaje);
  }
  return data as { ok: true; cae: string; numero: number; ptoVta: number; cbteTipo: number };
}
