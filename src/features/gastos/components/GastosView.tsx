import { useState } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { useGastoMutations, useGastos, useInsumos } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable } from '../../../components/DataTable';
import { Button } from '../../../components/Button';
import { Select, TextInput } from '../../../components/Field';
import { EmptyState } from '../../../components/EmptyState';

const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export function GastosView() {
  const { session } = useAuth();
  const { data: gastos, isLoading } = useGastos();
  const { data: insumos } = useInsumos();
  const { registrar } = useGastoMutations();

  const [form, setForm] = useState({ insumoId: '', cantidad: '', costoTotal: '', proveedor: '' });
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!session || !form.insumoId || !form.cantidad || !form.costoTotal) return;
    setError(null);
    try {
      await registrar.mutateAsync({
        insumoId: Number(form.insumoId),
        cantidad: Number(form.cantidad),
        costoTotal: Number(form.costoTotal),
        proveedor: form.proveedor,
        usuarioId: session.user.id,
      });
      setForm({ insumoId: '', cantidad: '', costoTotal: '', proveedor: '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el gasto');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader title="Gastos" subtitle="Compras de insumos. Recalculan el costo promedio ponderado automáticamente." />

      <div className="toolbar-form">
        <Select value={form.insumoId} onChange={(e) => setForm({ ...form, insumoId: e.target.value })} style={{ minWidth: 200 }}>
          <option value="">Insumo comprado…</option>
          {insumos?.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nombre} ({i.unidad})
            </option>
          ))}
        </Select>
        <TextInput placeholder="Cantidad" type="number" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} style={{ width: 100 }} />
        <TextInput placeholder="Costo total $" type="number" value={form.costoTotal} onChange={(e) => setForm({ ...form, costoTotal: e.target.value })} style={{ width: 130 }} />
        <TextInput placeholder="Proveedor" value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} style={{ minWidth: 160 }} />
        <Button variant="primary" onClick={submit}>
          + Registrar gasto
        </Button>
      </div>
      {error && (
        <p style={{ color: 'var(--red)', fontSize: 13, background: 'var(--red-soft)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>{error}</p>
      )}

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !gastos?.length ? (
        <EmptyState>Todavía no hay gastos registrados.</EmptyState>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Insumo</th>
              <th>Cantidad</th>
              <th>Costo total</th>
              <th>Proveedor</th>
            </tr>
          </thead>
          <tbody>
            {gastos.map((g) => (
              <tr key={g.id}>
                <td>{g.fecha}</td>
                <td>{g.insumos?.nombre}</td>
                <td>{g.cantidad}</td>
                <td>{fmt.format(Number(g.costo_total))}</td>
                <td>{g.proveedor ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}
