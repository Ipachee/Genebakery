import { useSalones, useMesas } from '../hooks';

export function SalonView() {
  const { data: salones, isLoading: loadingSalones, error: errorSalones } = useSalones();
  const { data: mesas, isLoading: loadingMesas, error: errorMesas } = useMesas();

  if (loadingSalones || loadingMesas) return <p>Cargando salón…</p>;
  if (errorSalones || errorMesas) {
    return (
      <p style={{ color: 'var(--red)' }}>
        No se pudo leer el salón desde Supabase todavía. Esto es normal si es la
        primera carga y no hay salones/mesas cargados en la base.
      </p>
    );
  }

  if (!salones?.length) {
    return (
      <p>
        Conectado a Supabase, sin datos todavía: la tabla <code>salones</code> está
        vacía. El próximo paso es migrar el editor de plano para poder cargarlos
        desde acá.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {salones.map((salon) => (
        <section key={salon.id}>
          <h3 style={{ margin: '0 0 8px' }}>{salon.nombre}</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {mesas
              ?.filter((m) => m.salon_id === salon.id)
              .map((mesa) => (
                <div
                  key={mesa.id}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: mesa.shape === 'round' ? '50%' : 4,
                    background: 'var(--surface)',
                    width: 56,
                    height: 56,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                  }}
                >
                  {mesa.label ?? mesa.id}
                </div>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
