import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'comandacafe-theme';

function leer(): Theme {
  const guardado = localStorage.getItem(KEY);
  return guardado === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(leer);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(KEY, theme);
  }, [theme]);

  return { theme, toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')) };
}
