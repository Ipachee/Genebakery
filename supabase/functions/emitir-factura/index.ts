// Le pide el CAE a ARCA (via AfipSDK) para una factura pendiente y deja la
// fila de facturas_electronicas actualizada con el resultado. Corre
// server-side porque necesita leer credenciales_facturacion (write-only
// para cualquier cliente, ni un admin la puede leer desde el navegador)
// con la service_role key.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ORIGENES_PERMITIDOS = ['https://comandacafe.vercel.app', 'https://comandacafedev.vercel.app', 'http://localhost:5173'];
const AAFIP_BASE = 'https://app.afipsdk.com/api/v1/afip';
// CUIT de demo que AfipSDK habilita en modo "dev" -- no hace falta
// certificado ni CUIT real para probar.
const CUIT_DEMO = '20409378472';
const PTO_VTA = 1;

const CBTE_TIPO: Record<string, number> = { factura_a: 1, factura_b: 6, factura_c: 11 };

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && ORIGENES_PERMITIDOS.includes(origin) ? origin : ORIGENES_PERMITIDOS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function soloDigitos(s: string | null | undefined): string {
  return (s ?? '').replace(/\D/g, '');
}

function fechaYYYYMMDD(d: Date): number {
  return Number(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`);
}

// La respuesta de AfipSDK envuelve todo en "<Metodo>Result" (viene de
// convertir XML->JSON) y en varios campos repetibles no queda claro si
// XML->JSON da un array o un objeto suelto cuando hay un solo elemento --
// esto normaliza ambos casos.
function unoOArray<T>(v: T | T[] | undefined): T | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

Deno.serve(async (req) => {
  const CORS_HEADERS = corsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('No autorizado', { status: 401, headers: CORS_HEADERS });
  const anon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });

  // Se parsea el body UNA sola vez acá afuera -- Request.json() solo se
  // puede leer una vez, así que si el catch de abajo necesitara volver a
  // leerlo (para marcar la fila como 'error') fallaría por "body already
  // used". Guardado en una variable de afuera, tanto el try como el catch
  // lo pueden usar sin problema.
  let facturaId: number | undefined;
  try {
    const body = await req.json();
    facturaId = body?.facturaId;
  } catch {
    return new Response('Body inválido', { status: 400, headers: CORS_HEADERS });
  }
  if (!facturaId) return new Response('Falta facturaId', { status: 400, headers: CORS_HEADERS });

  try {
    const { data: userData, error: userError } = await anon.auth.getUser();
    if (userError || !userData.user) return new Response('No autorizado', { status: 401, headers: CORS_HEADERS });

    const { data: profile } = await anon.from('profiles').select('activo').eq('id', userData.user.id).single();
    if (!profile?.activo) return new Response('Usuario inactivo', { status: 403, headers: CORS_HEADERS });

    // La fila de facturas_electronicas y la venta se leen con la sesión del
    // que llama (RLS normal, cualquier staff activo puede) -- solo las
    // credenciales necesitan la service_role key.
    const { data: factura, error: errorFactura } = await anon
      .from('facturas_electronicas')
      .select('*, ventas(total, created_at), clientes(dni, cuit)')
      .eq('id', facturaId)
      .single();
    if (errorFactura || !factura) return new Response('No se encontró la factura pendiente', { status: 404, headers: CORS_HEADERS });
    if (factura.estado === 'emitida') {
      return new Response(JSON.stringify({ ok: true, cae: factura.cae, numero: factura.numero, ptoVta: PTO_VTA, cbteTipo: CBTE_TIPO[factura.tipo_comprobante] }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const cbteTipo = CBTE_TIPO[factura.tipo_comprobante];
    if (!cbteTipo) return new Response(`Tipo de comprobante desconocido: ${factura.tipo_comprobante}`, { status: 400, headers: CORS_HEADERS });

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: cred } = await admin.from('credenciales_facturacion').select('*').eq('id', 1).single();
    if (!cred?.token_api) {
      return new Response('No hay credenciales de facturación cargadas (Ajustes → Facturación electrónica)', { status: 400, headers: CORS_HEADERS });
    }
    if (cred.proveedor !== 'afipsdk') {
      return new Response(`El proveedor "${cred.proveedor}" todavía no está conectado -- solo AfipSDK por ahora`, { status: 400, headers: CORS_HEADERS });
    }
    const environment = cred.modo === 'prod' ? 'prod' : 'dev';
    const accessToken = cred.token_api;

    let cuit = environment === 'dev' ? CUIT_DEMO : soloDigitos(cred.usuario);
    if (environment === 'prod' && !cuit) {
      const { data: perfil } = await admin.from('perfil_negocio').select('cuit').eq('id', 1).single();
      cuit = soloDigitos(perfil?.cuit);
    }
    if (!cuit) return new Response('Falta el CUIT del negocio (Usuario/CUIT en Facturación electrónica, o el CUIT en Ajustes → Negocio)', { status: 400, headers: CORS_HEADERS });

    async function afip(method: string, params: Record<string, unknown>) {
      const res = await fetch(`${AAFIP_BASE}/requests`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment, method, wsid: 'wsfe', params }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(typeof body === 'string' ? body : body?.message || `Error llamando a ${method}`);
      return body;
    }

    // Paso 1: token/sign de ARCA (los maneja AfipSDK, no hace falta
    // certificado propio de nuestro lado).
    const authRes = await fetch(`${AAFIP_BASE}/auth`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ environment, tax_id: cuit, wsid: 'wsfe' }),
    });
    const authBody = await authRes.json();
    if (!authRes.ok || !authBody?.token) {
      throw new Error(typeof authBody === 'string' ? authBody : authBody?.message || 'No se pudo autenticar contra ARCA -- revisá el Token/API key cargado');
    }
    const Auth = { Token: authBody.token, Sign: authBody.sign, Cuit: cuit };

    // Paso 2: último comprobante autorizado, para saber el próximo número.
    const ultimoRes = await afip('FECompUltimoAutorizado', { Auth, PtoVta: PTO_VTA, CbteTipo: cbteTipo });
    const ultimo = ultimoRes?.FECompUltimoAutorizadoResult ?? ultimoRes;
    const proximoNumero = Number(ultimo?.CbteNro ?? 0) + 1;

    // Paso 3: doc del comprador -- CUIT si lo tenemos, DNI si no, sino
    // consumidor final anónimo (99/0).
    const clienteCuit = soloDigitos(factura.clientes?.cuit);
    const clienteDni = soloDigitos(factura.clientes?.dni);
    const [docTipo, docNro] = clienteCuit ? [80, clienteCuit] : clienteDni ? [96, clienteDni] : [99, '0'];

    const total = Number(factura.ventas?.total ?? 0);
    // Factura C: el vendedor es monotributista, no discrimina IVA -- neto
    // = total, sin el bloque Iva. A/B sí discriminan el 21%.
    const esC = cbteTipo === 11;
    const impIVA = esC ? 0 : Math.round((total - total / 1.21) * 100) / 100;
    const impNeto = esC ? total : Math.round((total - impIVA) * 100) / 100;
    const fecha = factura.ventas?.created_at ? new Date(factura.ventas.created_at) : new Date();

    const FECAEDetRequest: Record<string, unknown> = {
      Concepto: 1,
      DocTipo: docTipo,
      DocNro: docNro,
      CbteDesde: proximoNumero,
      CbteHasta: proximoNumero,
      CbteFch: fechaYYYYMMDD(fecha),
      ImpTotal: total,
      ImpTotConc: 0,
      ImpNeto: impNeto,
      ImpOpEx: 0,
      ImpIVA: impIVA,
      ImpTrib: 0,
      MonId: 'PES',
      MonCotiz: 1,
      CondicionIVAReceptorId: cbteTipo === 1 ? 1 : 5,
    };
    if (!esC) {
      FECAEDetRequest.Iva = { AlicIva: [{ Id: 5, BaseImp: impNeto, Importe: impIVA }] };
    }

    const caeRes = await afip('FECAESolicitar', {
      Auth,
      FeCAEReq: {
        FeCabReq: { CantReg: 1, PtoVta: PTO_VTA, CbteTipo: cbteTipo },
        FeDetReq: { FECAEDetRequest },
      },
    });
    const resultado = caeRes?.FECAESolicitarResult ?? caeRes;
    const errores = unoOArray(resultado?.Errors?.Err);
    if (errores) throw new Error(`ARCA rechazó la solicitud: [${errores.Code}] ${errores.Msg}`);
    const detalle = unoOArray(resultado?.FeDetResp?.FECAEDetResponse);
    if (!detalle) throw new Error('ARCA no devolvió un detalle de comprobante -- respuesta inesperada');
    if (detalle.Resultado !== 'A') {
      const obs = unoOArray(detalle.Observaciones?.Obs);
      throw new Error(obs ? `ARCA rechazó el comprobante: [${obs.Code}] ${obs.Msg}` : 'ARCA rechazó el comprobante sin detalle');
    }

    const cae = String(detalle.CAE);
    const caeVencimiento = String(detalle.CAEFchVto); // yyyy-mm-dd

    await anon
      .from('facturas_electronicas')
      .update({
        estado: 'emitida',
        cae,
        cae_vencimiento: caeVencimiento,
        numero: proximoNumero,
        cuit_emisor: cuit,
        punto_venta: PTO_VTA,
        error_mensaje: null,
      })
      .eq('id', facturaId);

    return new Response(
      JSON.stringify({ ok: true, cae, numero: proximoNumero, ptoVta: PTO_VTA, cbteTipo }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    // Se deja registrado el motivo del rechazo en la propia fila -- así no
    // hace falta ir a buscar logs para saber por qué no salió.
    try {
      await anon.from('facturas_electronicas').update({ estado: 'error', error_mensaje: mensaje }).eq('id', facturaId);
    } catch {
      // Si ni esto se pudo (ej. no llegó a autenticarse), igual se
      // devuelve el error real más abajo.
    }
    return new Response(mensaje, { status: 500, headers: CORS_HEADERS });
  }
});
