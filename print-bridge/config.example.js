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
  LOGIN_PASSWORD: 'PONÉ_ACÁ_EL_PIN_REAL',

  // Cómo llegarle a la impresora -- 'red' si tiene su propio puerto
  // Ethernet y está conectada directo al router (recomendado si el
  // modelo lo tiene: no depende de compartir nada en Windows, y
  // cualquier compu de la red le puede mandar tickets sin instalar nada
  // más ahí), o 'usb-compartida' si va por USB a esta misma compu (ver
  // README para cómo compartirla en Windows).
  PRINTER_MODE: 'usb-compartida', // 'usb-compartida' | 'red'

  // Solo si PRINTER_MODE es 'red': IP de la impresora en la red local
  // (se ve en el menú/autotest de la impresora) y el puerto de impresión
  // ESC/POS -- 9100 es el estándar, casi nunca hace falta cambiarlo.
  PRINTER_IP: '',
  PRINTER_PORT: 9100,

  // Solo si PRINTER_MODE es 'usb-compartida': nombre del RECURSO
  // COMPARTIDO de la impresora en Windows (no necesariamente el mismo
  // que el nombre que se ve en "Impresoras y escáneres" -- ver el README
  // para cómo compartirla y qué nombre ponerle).
  PRINTER_SHARE_NAME: 'PONÉ_ACÁ_EL_NOMBRE_COMPARTIDO',

  // Cada cuántos milisegundos revisa si hay algo nuevo para imprimir
  // (comandas, cobros, facturas). Bajalo si un día de mucho movimiento se
  // siente lento -- 3 segundos ya es bastante seguido sin exigir tanto a
  // la base.
  INTERVALO_MS: 3000,

  // Caracteres por línea -- 42 para 80mm con letra chica de fábrica es lo
  // habitual en impresoras ESC/POS de este ancho. Si el texto sale
  // cortado o con mucho margen vacío al costado, este es el primer número
  // para ajustar.
  ANCHO_CARACTERES: 42,

  // Encabezado y pie del ticket de cobro/factura -- este programa no
  // puede leer la config de "Ajustes → Tipografía del ticket" de la web
  // (esa vive en el navegador, no en la base), así que se repite acá.
  // Si cambiás el nombre del local ahí, cambialo también en esta línea.
  NOMBRE_LOCAL: 'ComandaCafé',
  PIE_TICKET: '¡Gracias por tu visita!',
};
