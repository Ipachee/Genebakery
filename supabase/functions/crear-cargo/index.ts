// Crea un "cargo" nuevo (RRHH y lo que se vaya agregando) de punta a
// punta: usuario de auth + fila en profiles + fila en roles_personalizados.
// Corre server-side porque hace falta la service_role key para crear el
// usuario de auth -- eso nunca puede tocar el navegador.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ORIGENES_PERMITIDOS = ['https://comandacafe.vercel.app', 'https://comandacafedev.vercel.app', 'http://localhost:5173'];

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && ORIGENES_PERMITIDOS.includes(origin) ? origin : ORIGENES_PERMITIDOS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

// clave = slug del nombre que eligió quien crea el cargo -- se usa como
// profiles.rol / roles_personalizados.clave y como usuario de login
// (clave@comandacafe.local), así que tiene que quedar simple: sin tildes,
// espacios ni mayúsculas.
function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

Deno.serve(async (req) => {
  const CORS_HEADERS = corsHeaders(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('No autorizado', { status: 401, headers: CORS_HEADERS });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await anon.auth.getUser();
    if (userError || !userData.user) return new Response('No autorizado', { status: 401, headers: CORS_HEADERS });

    const { data: profile } = await anon.from('profiles').select('rol, activo').eq('id', userData.user.id).single();
    if (!profile?.activo || profile.rol !== 'admin') {
      return new Response('Solo admin puede crear cargos nuevos', { status: 403, headers: CORS_HEADERS });
    }

    const { nombre, password, icono } = await req.json();
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return new Response('Falta el nombre del cargo', { status: 400, headers: CORS_HEADERS });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return new Response('La contraseña tiene que tener al menos 6 caracteres', { status: 400, headers: CORS_HEADERS });
    }

    const clave = slugify(nombre);
    if (!clave) return new Response('Ese nombre no se puede usar, probá con letras o números', { status: 400, headers: CORS_HEADERS });
    if (clave === 'admin' || clave === 'mozo') {
      return new Response('Ese nombre ya está reservado, probá con otro', { status: 400, headers: CORS_HEADERS });
    }

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const email = `${clave}@comandacafe.local`;
    const { data: creado, error: errorCrear } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (errorCrear || !creado.user) {
      const msg = errorCrear?.message.includes('already been registered')
        ? 'Ya existe un cargo con ese nombre'
        : (errorCrear?.message ?? 'No se pudo crear el usuario');
      return new Response(msg, { status: 400, headers: CORS_HEADERS });
    }

    const { error: errorRol } = await admin
      .from('roles_personalizados')
      .insert({ clave, etiqueta: nombre.trim(), icono: icono || '🗂️' });
    if (errorRol) {
      await admin.auth.admin.deleteUser(creado.user.id);
      const msg = errorRol.message.includes('duplicate key') ? 'Ya existe un cargo con ese nombre' : errorRol.message;
      return new Response(msg, { status: 400, headers: CORS_HEADERS });
    }

    const { error: errorProfile } = await admin
      .from('profiles')
      .insert({ id: creado.user.id, nombre: nombre.trim(), apellido: '', rol: clave, activo: true });
    if (errorProfile) {
      await admin.from('roles_personalizados').delete().eq('clave', clave);
      await admin.auth.admin.deleteUser(creado.user.id);
      return new Response(errorProfile.message, { status: 400, headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ ok: true, clave }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(`Error: ${e instanceof Error ? e.message : String(e)}`, { status: 500, headers: CORS_HEADERS });
  }
});
