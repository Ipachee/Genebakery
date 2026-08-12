import { useEffect, useState } from 'react';
import { onlineManager } from '@tanstack/react-query';

// Usa el onlineManager de React Query en vez de navigator.onLine directo
// para que el estado que se muestra en pantalla sea EXACTAMENTE el mismo
// que usan las queries/mutaciones para decidir si pausarse o no -- si
// estuvieran desincronizados, el banner podría decir "sin conexión"
// mientras las queries ya se están reintentando, o viceversa.
export function useOnlineStatus() {
  const [online, setOnline] = useState(() => onlineManager.isOnline());

  useEffect(() => onlineManager.subscribe(setOnline), []);

  return online;
}
