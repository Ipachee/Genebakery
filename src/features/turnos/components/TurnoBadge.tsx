import { useTurnoActual } from '../useTurnoActual';

const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export function TurnoBadge() {
  const { turno, facturado, loading, cerrarTurno, reabrirTurno } = useTurnoActual();

  if (loading) return <span style={{ opacity: 0.7 }}>Abriendo turno…</span>;
  if (!turno) return null;

  const cerrado = turno.estado === 'cerrado';

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span>
        Turno {turno.etiqueta} · {fmt.format(facturado)}
        {cerrado && ' · cerrado'}
      </span>
      <button
        onClick={cerrado ? reabrirTurno : cerrarTurno}
        style={{
          background: cerrado ? 'var(--green)' : 'transparent',
          border: '1px solid rgba(255,255,255,0.4)',
          color: '#fff',
          borderRadius: 4,
          padding: '5px 9px',
          fontSize: 12,
        }}
      >
        {cerrado ? '↺ Reabrir turno' : '🔒 Cerrar turno'}
      </button>
    </span>
  );
}
