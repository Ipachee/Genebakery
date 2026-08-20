import { useMemo, useState } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { useGastoMutations, useGastos, useInsumos } from '../hooks';
import { useProveedores } from '../../proveedores/hooks';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable } from '../../../components/DataTable';
import { Button } from '../../../components/Button';
import { Select, TextInput } from '../../../components/Field';
import { EmptyState } from '../../../components/EmptyState';
import { fmtMoney as fmt } from '../../../lib/format';

export function GastosView() {
  const { session } = useAuth();
  const { data: gastos, isLoading } = useGastos();
  const { data: insumos } = useInsumos();
  const { data: proveedores } = useProveedores();
  const { registrar } = useGastoMutations();

  const [form, setForm] = useState({ insumoId: '', cantidad: '', costoTotal: '', proveedor: '' });
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<'reciente' | 'antiguo'>('reciente');

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

  const gastosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtrados = (gastos ?? []).filter((g) => {
      if (!q) return true;
      return (g.insumos?.nombre ?? '').toLowerCase().includes(q) || (g.proveedor ?? '').toLowerCase().includes(q);
    });
    return [...filtrados].sort((a, b) => {
      const diff = new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      return orden === 'reciente' ? diff : -diff;
    });
  }, [gastos, busqueda, orden]);

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
        <Select value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} style={{ minWidth: 160 }}>
          <option value="">Proveedor…</option>
          {proveedores?.map((p) => (
            <option key={p.id} value={p.nombre}>
              {p.nombre}
            </option>
          ))}
        </Select>
        <Button variant="primary" onClick={submit}>
          + Registrar gasto
        </Button>
      </div>
      {error && (
        <p style={{ color: 'var(--red)', fontSize: 13, background: 'var(--red-soft)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>{error}</p>
      )}

      {gastos?.length ? (
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <TextInput
            placeholder="🔍 Buscar por insumo o proveedor…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ maxWidth: 260 }}
          />
          <Select value={orden} onChange={(e) => setOrden(e.target.value as 'reciente' | 'antiguo')} style={{ minWidth: 170 }}>
            <option value="reciente">Más recientes primero</option>
            <option value="antiguo">Más antiguos primero</option>
          </Select>
        </div>
      ) : null}

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !gastos?.length ? (
        <EmptyState>Todavía no hay gastos registrados.</EmptyState>
      ) : !gastosFiltrados.length ? (
        <EmptyState>No hay gastos que coincidan con la búsqueda.</EmptyState>
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
            {gastosFiltrados.map((g) => (
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
