import { useState } from 'react';

// Estado que sobrevive a un recargado de página (localStorage) -- usado
// para cosas de navegación que no tiene sentido perder si el navegador
// descarta la pestaña de fondo y la recarga entera al volver a ella (pasa
// seguido en el celu con poca memoria), como en qué sección quedó
// parado o si el lateral estaba colapsado.
export function usePersistido<T>(key: string, inicial: T): [T, (v: T) => void] {
  const [valor, setValor] = useState<T>(() => {
    try {
      const guardado = localStorage.getItem(key);
      return guardado != null ? (JSON.parse(guardado) as T) : inicial;
    } catch {
      return inicial;
    }
  });
  const guardar = (v: T) => {
    setValor(v);
    localStorage.setItem(key, JSON.stringify(v));
  };
  return [valor, guardar];
}
