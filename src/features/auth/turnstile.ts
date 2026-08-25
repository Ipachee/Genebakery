// Cloudflare Turnstile -- issue #6 del roadmap: el PIN de 4 dígitos es la
// contraseña real de Supabase Auth, y el rate-limit por default de
// Supabase es por IP (no por cuenta), débil para un espacio de solo
// 10.000 combinaciones. Turnstile agrega una verificación server-side
// (Supabase valida el token contra Cloudflare antes de aceptar el login).
//
// El widget se crea en un contenedor oculto (display:none) -- funciona
// sin mostrar nada SIEMPRE QUE el sitekey esté configurado en modo
// "Invisible" en el dashboard de Cloudflare Turnstile (no es un parámetro
// que se elija acá al renderizar, es una propiedad del sitekey en sí). Si
// el sitekey quedó en modo "Managed" (adaptativo), en el caso normal
// también resuelve sin mostrar nada, pero Cloudflare podría decidir pedir
// una interacción visible para tráfico que le resulte sospechoso -- como
// el contenedor está oculto, esa interacción no se vería y el login
// quedaría trabado. Ver docs/Auth.md.
//
// Patrón "one-shot": se crea un widget nuevo, se pide un token, y se
// destruye -- así no hay que manejar expiración (el token dura 5 min y es
// de un solo uso) ni estado global, solo se pide uno justo antes de cada
// intento de login.

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

export function turnstileHabilitado() {
  return !!SITE_KEY;
}

export function obtenerTokenTurnstile(timeoutMs = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!SITE_KEY) {
      reject(new Error('Falta VITE_TURNSTILE_SITE_KEY'));
      return;
    }
    if (!window.turnstile) {
      reject(new Error('Turnstile no cargó todavía'));
      return;
    }

    const contenedor = document.createElement('div');
    contenedor.style.display = 'none';
    document.body.appendChild(contenedor);

    let terminado = false;
    const limpiar = (widgetId?: string) => {
      if (terminado) return;
      terminado = true;
      if (widgetId) window.turnstile?.remove(widgetId);
      contenedor.remove();
    };

    const timeoutId = setTimeout(() => {
      limpiar(widgetId);
      reject(new Error('Turnstile tardó demasiado'));
    }, timeoutMs);

    const widgetId = window.turnstile.render(contenedor, {
      sitekey: SITE_KEY,
      callback: (token: string) => {
        clearTimeout(timeoutId);
        resolve(token);
        limpiar(widgetId);
      },
      'error-callback': () => {
        clearTimeout(timeoutId);
        reject(new Error('Turnstile falló'));
        limpiar(widgetId);
      },
    });
  });
}
