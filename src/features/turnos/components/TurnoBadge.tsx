import { useState } from 'react';
import { useTurnoActual } from '../useTurnoActual';
import { CierreTurnoModal } from './CierreTurnoModal';

const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export function TurnoBadge() {
  const { turno, facturado, loading, reabrirTurno } = useTurnoActual();
  const [mostrarCierre, setMostrarCierre] = useState(false);

  if (loading) return <span style={{ opacity: 0.7, fontSize: 12.5 }}>Abriendo turno…</span>;
  if (!turno) return null;

  const cerrado = turno.estado === 'cerrado';

  return (
    <div className="shell-turno">
      <div className="shell-turno-info">
        <span className="shell-turno-label">
          Turno {turno.etiqueta} {cerrado && '· cerrado'}
        </span>
        <span className="shell-turno-total">{fmt.format(facturado)}</span>
      </div>
      <button
        className="shell-signout"
        onClick={cerrado ? reabrirTurno : () => setMostrarCierre(true)}
        style={{ background: cerrado ? 'var(--green)' : undefined, borderColor: cerrado ? 'var(--green)' : undefined }}
      >
        {cerrado ? '↺ Reabrir' : '🔒 Cerrar'}
      </button>

      {mostrarCierre && <CierreTurnoModal turno={turno} onClose={() => setMostrarCierre(false)} />}
    </div>
  );
}
