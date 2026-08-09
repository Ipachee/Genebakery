import { useMovimientos } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { EmptyState } from '../../../components/EmptyState';

const TIPO_LABEL: Record<string, string> = {
  compra: 'Compra',
  venta: 'Venta',
  produccion: 'Producción',
  ajuste: 'Ajuste',
};

const TIPO_TONE: Record<string, 'good' | 'accent' | 'info' | 'neutral'> = {
  compra: 'good',
  venta: 'accent',
  produccion: 'info',
  ajuste: 'neutral',
};

export function MovimientosView() {
  const { data: movimientos, isLoading } = useMovimientos();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader title="Movimientos" subtitle="Auditoría de stock — no editable. Últimos 100 movimientos." />

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !movimientos?.length ? (
        <EmptyState>Todavía no hay movimientos.</EmptyState>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Ítem</th>
              <th>Cantidad</th>
              <th>Stock resultante</th>
              <th>Ref</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.fecha).toLocaleString('es-AR')}</td>
                <td>
                  <Badge tone={TIPO_TONE[m.tipo] ?? 'neutral'}>{TIPO_LABEL[m.tipo] ?? m.tipo}</Badge>
                </td>
                <td>{m.insumos?.nombre ?? m.elaborados?.nombre ?? '—'}</td>
                <td style={{ color: Number(m.cantidad) < 0 ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>
                  {Number(m.cantidad) > 0 ? '+' : ''}
                  {m.cantidad}
                </td>
                <td>{m.stock_resultante}</td>
                <td style={{ color: 'var(--text-dim)' }}>{m.ref}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}
