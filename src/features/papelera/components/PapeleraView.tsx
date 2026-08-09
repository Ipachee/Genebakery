import { usePapelera, usePapeleraMutations } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable } from '../../../components/DataTable';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { EmptyState } from '../../../components/EmptyState';

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader title="Papelera" subtitle="Todo lo borrado en el sistema, unificado. Restaurar es un click." />

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !papelera?.length ? (
        <EmptyState>La papelera está vacía.</EmptyState>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Resumen</th>
              <th>Borrado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {papelera.map((p) => (
              <tr key={`${p.tipo}-${p.id}`}>
                <td>
                  <Badge tone="neutral">{TIPO_LABEL[p.tipo ?? ''] ?? p.tipo}</Badge>
                </td>
                <td>{p.resumen}</td>
                <td style={{ color: 'var(--text-dim)' }}>{p.deleted_at ? new Date(p.deleted_at).toLocaleString('es-AR') : '—'}</td>
                <td>
                  <Button variant="secondary" size="sm" onClick={() => p.tipo && p.id && restaurar.mutate({ tipo: p.tipo, id: p.id })}>
                    ↺ Restaurar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}
