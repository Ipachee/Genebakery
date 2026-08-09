import { usePapelera, usePapeleraMutations } from '../hooks';

const TIPO_LABEL: Record<string, string> = {
  insumo: 'Insumo',
  producto: 'Producto',
  mesa: 'Mesa',
  salon: 'Salón',
  cliente: 'Cliente',
  empleado: 'Empleado',
  elaborado: 'Elaborado',
  produccion: 'Producción',
  pedido: 'Pedido',
  venta: 'Venta',
  gasto: 'Gasto',
};

export function PapeleraView() {
  const { data: papelera, isLoading } = usePapelera();
  const { restaurar } = usePapeleraMutations();

  if (isLoading) return <p>Cargando…</p>;
  if (!papelera?.length) return <p style={{ color: 'var(--text-dim)' }}>La papelera está vacía.</p>;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
          <th style={th}>Tipo</th>
          <th style={th}>Resumen</th>
          <th style={th}>Borrado</th>
          <th style={th}></th>
        </tr>
      </thead>
      <tbody>
        {papelera.map((p) => (
          <tr key={`${p.tipo}-${p.id}`} style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={td}>{TIPO_LABEL[p.tipo ?? ''] ?? p.tipo}</td>
            <td style={td}>{p.resumen}</td>
            <td style={td}>{p.deleted_at ? new Date(p.deleted_at).toLocaleString('es-AR') : '—'}</td>
            <td style={td}>
              <button
                onClick={() => p.tipo && p.id && restaurar.mutate({ tipo: p.tipo, id: p.id })}
                style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12 }}
              >
                ↺ Restaurar
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const th: React.CSSProperties = { padding: '6px 8px', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)' };
const td: React.CSSProperties = { padding: '7px 8px' };
