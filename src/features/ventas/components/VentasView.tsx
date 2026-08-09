import { useVentaMutations, useVentas } from '../hooks';

const METODOS = ['Efectivo', 'Tarjeta', 'Transferencia'];
const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export function VentasView() {
  const { data: ventas, isLoading } = useVentas();
  const { actualizarMetodoPago, borrar } = useVentaMutations();

  if (isLoading) return <p>Cargando…</p>;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
          <th style={th}>Fecha</th>
          <th style={th}>Mesa</th>
          <th style={th}>Cliente</th>
          <th style={th}>Total</th>
          <th style={th}>Método de pago</th>
          <th style={th}></th>
        </tr>
      </thead>
      <tbody>
        {ventas?.map((v) => (
          <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={td}>{new Date(v.created_at).toLocaleString('es-AR')}</td>
            <td style={td}>{v.mesas?.label ?? (v.mesa_id ? `#${v.mesa_id}` : 'Take away')}</td>
            <td style={td}>{v.clientes ? `${v.clientes.nombre} ${v.clientes.apellido}` : '—'}</td>
            <td style={td}>{fmt.format(Number(v.total))}</td>
            <td style={td}>
              <select
                value={v.metodo_pago}
                onChange={(e) => actualizarMetodoPago.mutate({ id: v.id, metodoPago: e.target.value })}
                style={{ padding: 4, borderRadius: 4, border: '1px solid var(--border)', fontSize: 12 }}
              >
                {METODOS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </td>
            <td style={td}>
              <button onClick={() => borrar.mutate(v.id)} style={{ color: 'var(--red)', border: 'none', background: 'none' }}>
                🗑
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
