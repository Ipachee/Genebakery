import { useConfiguracionTurnos, useActualizarActivoTurno } from '../hooks';
import { etiquetasActivasHoy, isodowDeHoy } from '../turnosActivosHoy';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/EmptyState';

const DIAS = [
  { isodow: 1, nombre: 'Lunes' },
  { isodow: 2, nombre: 'Martes' },
  { isodow: 3, nombre: 'Miércoles' },
  { isodow: 4, nombre: 'Jueves' },
  { isodow: 5, nombre: 'Viernes' },
  { isodow: 6, nombre: 'Sábado' },
  { isodow: 7, nombre: 'Domingo' },
] as const;

const ETIQUETAS = ['Mañana', 'Tarde', 'Noche'] as const;

export function HorariosTurnoView() {
  const { data: config, isLoading } = useConfiguracionTurnos();
  const actualizar = useActualizarActivoTurno();
  const hoy = isodowDeHoy();

  if (isLoading || !config) return <EmptyState>Cargando…</EmptyState>;

  const activosHoy = etiquetasActivasHoy(config);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader
        title="Horarios de turno"
      />

      <div className="card card-pad" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', padding: '0 8px 10px' }}>Día</th>
              {ETIQUETAS.map((et) => (
                <th key={et} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', padding: '0 8px 10px' }}>
                  {et}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DIAS.map((dia) => (
              <tr key={dia.isodow} style={dia.isodow === hoy ? { background: 'var(--surface-sunken)' } : undefined}>
                <td style={{ padding: 8, fontSize: 13.5, fontWeight: 600, borderTop: '1px solid var(--border)' }}>{dia.nombre}</td>
                {ETIQUETAS.map((etiqueta) => {
                  const fila = config.find((f) => f.dia_isodow === dia.isodow && f.etiqueta === etiqueta);
                  if (!fila) return <td key={etiqueta} style={{ borderTop: '1px solid var(--border)' }} />;
                  return (
                    <td key={etiqueta} style={{ padding: 8, textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                      <Button
                        size="sm"
                        variant={fila.activo ? 'primary' : 'secondary'}
                        disabled={actualizar.isPending}
                        onClick={() => actualizar.mutate({ id: fila.id, activo: !fila.activo })}
                      >
                        {fila.activo ? 'Activo' : 'Off'}
                      </Button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: 0 }}>
        Hoy ({DIAS.find((d) => d.isodow === hoy)?.nombre}) el login muestra: <strong>{activosHoy.join(' · ') || 'ningún turno'}</strong>
      </p>
    </div>
  );
}
