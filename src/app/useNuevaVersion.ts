import { useEffect, useState } from 'react';

function scriptModuloActual(): string | null {
  return document.querySelector('script[type="module"]')?.getAttribute('src') ?? null;
}

// Como es una SPA, si se deja la pestaña abierta durante un deploy nuevo el
// navegador sigue corriendo el JS viejo hasta que alguien la recarga a
// mano -- pasó varias veces durante las pruebas y generó confusión (bugs
// que ya estaban arreglados "seguían pasando"). Este hook compara el
// script de la página servida ahora mismo contra el que quedó cargado, y
// avisa si cambió.
export function useNuevaVersion() {
  const [hayNueva, setHayNueva] = useState(false);

  useEffect(() => {
    const actual = scriptModuloActual();
    if (!actual) return;

    async function chequear() {
      try {
        const res = await fetch('/', { cache: 'no-store' });
        const html = await res.text();
        const match = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/);
        const nuevo = match?.[1];
        if (nuevo && nuevo !== actual) setHayNueva(true);
      } catch {
        // sin conexión o error de red -- no molesta, reintenta en el próximo ciclo
      }
    }

    const id = setInterval(chequear, 120000);
    window.addEventListener('focus', chequear);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', chequear);
    };
  }, []);

  return hayNueva;
}
