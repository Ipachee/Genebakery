// Manda el resumen de cierre de turno por mail con el PDF adjunto, via Resend.
// Corre server-side: el RESEND_API_KEY nunca llega al navegador.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Localhost queda habilitado a propósito -- el flujo de este proyecto
// siempre prueba en localhost antes de mandar nada a producción.
const ORIGENES_PERMITIDOS = ['https://comandacafe.vercel.app', 'http://localhost:5173'];
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && ORIGENES_PERMITIDOS.includes(origin) ? origin : ORIGENES_PERMITIDOS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

Deno.serve(async (req) => {
  const CORS_HEADERS = corsHeaders(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('No autorizado', { status: 401, headers: CORS_HEADERS });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return new Response('No autorizado', { status: 401, headers: CORS_HEADERS });

    const { data: profile } = await supabase.from('profiles').select('activo').eq('id', userData.user.id).single();
    if (!profile?.activo) {
      return new Response('Usuario inactivo', { status: 403, headers: CORS_HEADERS });
    }

    const { to, subject, pdfBase64, filename } = await req.json();
    if (!to || !pdfBase64) return new Response('Faltan datos (to, pdfBase64)', { status: 400, headers: CORS_HEADERS });
    if (!EMAIL_VALIDO.test(to)) return new Response('El mail de destino no es válido', { status: 400, headers: CORS_HEADERS });

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) return new Response('RESEND_API_KEY no configurada en el proyecto', { status: 500, headers: CORS_HEADERS });

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'ComandaCafé <onboarding@resend.dev>',
        to: [to],
        subject: subject ?? 'Cierre de turno',
        text: 'Se adjunta el resumen del cierre de turno en PDF.',
        attachments: [{ filename: filename ?? 'cierre-turno.pdf', content: pdfBase64 }],
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      return new Response(`Error enviando el mail: ${errText}`, { status: 502, headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(`Error: ${e instanceof Error ? e.message : String(e)}`, { status: 500, headers: CORS_HEADERS });
  }
});
