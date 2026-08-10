import { useEffect, useState } from 'react';

export function Cronometro({ desde }: { desde: string }) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const segundos = Math.max(0, Math.floor((ahora - new Date(desde).getTime()) / 1000));
  const mm = String(Math.floor(segundos / 60)).padStart(2, '0');
  const ss = String(segundos % 60).padStart(2, '0');
  return (
    <span className="badge badge-accent" style={{ fontVariantNumeric: 'tabular-nums' }}>
      ⏱ {mm}:{ss}
    </span>
  );
}
