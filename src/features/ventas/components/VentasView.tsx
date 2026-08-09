import { useVentaMutations, useVentas } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable } from '../../../components/DataTable';
import { Button } from '../../../components/Button';
import { Select } from '../../../components/Field';
import { EmptyState } from '../../../components/EmptyState';

const METODOS = ['Efectivo', 'Tarjeta', 'Transferencia'];
const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export function VentasView() {
  const { data: ventas, isLoading } = useVentas();
  const { actualizarMetodoPago, borrar } = useVentaMutations();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader title="Ventas" subtitle="Últimas 100 ventas. El método de pago se puede corregir después de cobrar." />

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !ventas?.length ? (
        <EmptyState>Todavía no hay ventas registradas.</EmptyState>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Mesa</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Método de pago</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ventas.map((v) => (
              <tr key={v.id}>
                <td>{new Date(v.created_at).toLocaleString('es-AR')}</td>
                <td>{v.mesas?.label ?? (v.mesa_id ? `#${v.mesa_id}` : 'Take away')}</td>
                <td>{v.clientes ? `${v.clientes.nombre} ${v.clientes.apellido}` : '—'}</td>
                <td>{fmt.format(Number(v.total))}</td>
                <td>
                  <Select
                    value={v.metodo_pago}
                    onChange={(e) => actualizarMetodoPago.mutate({ id: v.id, metodoPago: e.target.value })}
                    style={{ padding: '5px 8px', fontSize: 12.5 }}
                  >
                    {METODOS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </Select>
                </td>
                <td>
                  <Button variant="danger" size="sm" onClick={() => borrar.mutate(v.id)}>
                    🗑
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
