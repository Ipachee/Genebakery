import { useMovimientos } from '../hooks';

const TIPO_LABEL: Record<string, string> = {
  compra: 'Compra',
  venta: 'Venta',
  produccion: 'Producción',
  ajuste: 'Ajuste',
};

export function MovimientosView() {
  const { data: movimientos, isLoading } = useMovimientos();

  if (isLoading) return <p>Cargando…</p>;

  return (
    <div>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
        Auditoría de stock — no editable. Últimos 100 movimientos.
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
            <th style={th}>Fecha</th>
            <th style={th}>Tipo</th>
            <th style={th}>Ítem</th>
            <th style={th}>Cantidad</th>
            <th style={th}>Stock resultante</th>
            <th style={th}>Ref</th>
          </tr>
        </thead>
        <tbody>
          {movimientos?.map((m) => (
            <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={td}>{new Date(m.fecha).toLocaleString('es-AR')}</td>
              <td style={td}>{TIPO_LABEL[m.tipo] ?? m.tipo}</td>
              <td style={td}>{m.insumos?.nombre ?? m.elaborados?.nombre ?? '—'}</td>
              <td style={{ ...td, color: Number(m.cantidad) < 0 ? 'var(--red)' : 'var(--green)' }}>
                {Number(m.cantidad) > 0 ? '+' : ''}
                {m.cantidad}
              </td>
              <td style={td}>{m.stock_resultante}</td>
              <td style={td}>{m.ref}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = { padding: '6px 8px', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)' };
const td: React.CSSProperties = { padding: '7px 8px' };
