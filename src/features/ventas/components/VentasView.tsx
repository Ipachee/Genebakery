import { useMemo, useState } from 'react';
import { useVentaMutations, useVentas } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable } from '../../../components/DataTable';
import { Button } from '../../../components/Button';
import { Select, TextInput } from '../../../components/Field';
import { EmptyState } from '../../../components/EmptyState';
import { fmtMoney as fmt } from '../../../lib/format';
import { METODOS_PAGO } from '../../../lib/pedidoConstantes';

export function VentasView() {
  const { data: ventas, isLoading } = useVentas();
  const { actualizarMetodoPago, borrar } = useVentaMutations();
  const [busqueda, setBusqueda] = useState('');
  const [metodoPago, setMetodoPago] = useState('todos');
  const [orden, setOrden] = useState<'reciente' | 'antiguo'>('reciente');

  const ventasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtradas = (ventas ?? []).filter((v) => {
      if (metodoPago !== 'todos' && v.metodo_pago !== metodoPago) return false;
      if (!q) return true;
      const mesa = (v.mesas?.label ?? '').toLowerCase();
      const cliente = v.clientes ? `${v.clientes.nombre} ${v.clientes.apellido}`.toLowerCase() : '';
      return mesa.includes(q) || cliente.includes(q);
    });
    return [...filtradas].sort((a, b) => {
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return orden === 'reciente' ? diff : -diff;
    });
  }, [ventas, busqueda, metodoPago, orden]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader title="Ventas" subtitle="Últimas 100 ventas. El método de pago se puede corregir después de cobrar." />

      {ventas?.length ? (
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <TextInput
            placeholder="🔍 Buscar por mesa o cliente…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ maxWidth: 260 }}
          />
          <Select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} style={{ minWidth: 170 }}>
            <option value="todos">Todos los métodos</option>
            {METODOS_PAGO.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
          <Select value={orden} onChange={(e) => setOrden(e.target.value as 'reciente' | 'antiguo')} style={{ minWidth: 170 }}>
            <option value="reciente">Más recientes primero</option>
            <option value="antiguo">Más antiguos primero</option>
          </Select>
        </div>
      ) : null}

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !ventas?.length ? (
        <EmptyState>Todavía no hay ventas registradas.</EmptyState>
      ) : !ventasFiltradas.length ? (
        <EmptyState>No hay ventas que coincidan con la búsqueda.</EmptyState>
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
            {ventasFiltradas.map((v) => (
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
                    {METODOS_PAGO.map((m) => (
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
