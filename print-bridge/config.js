// Configuración del bridge de impresión. Lo único que hace falta tocar
// normalmente es PRINTER_NAME -- tiene que ser EXACTO al nombre que le
// puso Windows a la impresora (Configuración > Impresoras y escáneres).
module.exports = {
  // Mismas credenciales públicas que ya usa la página web (protegidas por
  // las reglas de acceso de la base, no son un secreto -- son las mismas
  // que cualquiera puede ver en el código del sitio).
  SUPABASE_URL: 'https://qqvjvwlxyjkvuasjcibf.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_oGIsrfHkjk7Ih7FY-cR8Sg_wdhyMOmp',

  // Este programa necesita "iniciar sesión" igual que cualquier persona
  // para poder leer los pedidos -- sin esto, las reglas de seguridad de
  // la base devuelven 0 filas siempre (no un error, así que fallaría en
  // silencio, sin imprimir nunca nada y sin avisar por qué). Se usa la
  // cuenta de admin con el mismo PIN que ya usan las 4 cuentas del local.
  LOGIN_EMAIL: 'admin@comandacafe.local',
  LOGIN_PASSWORD: '450422',

  // Nombre del RECURSO COMPARTIDO de la impresora en Windows (no
  // necesariamente el mismo que el nombre que se ve en "Impresoras y
  // escáneres" -- ver el README para cómo compartirla y qué nombre
  // ponerle). Por default se deja igual al nombre de la impresora.
  PRINTER_SHARE_NAME: 'CONTROL',

  // Cada cuántos milisegundos revisa si hay comandas nuevas.
  INTERVALO_MS: 8000,

  // Caracteres por línea -- 42 para 80mm con letra chica de fábrica es lo
  // habitual en impresoras ESC/POS de este ancho. Si el texto sale
  // cortado o con mucho margen vacío al costado, este es el primer número
  // para ajustar.
  ANCHO_CARACTERES: 42,
};
