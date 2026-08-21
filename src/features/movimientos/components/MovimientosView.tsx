import { useMemo, useState } from 'react';
import { useMovimientos } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable, ThOrdenable, useOrdenTabla } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { Select, TextInput } from '../../../components/Field';
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

type ColumnaOrden = 'fecha' | 'item' | 'cantidad' | 'stock';

export function MovimientosView() {
  const { data: movimientos, isLoading } = useMovimientos();
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('todos');
  const { orden, alClickear } = useOrdenTabla<ColumnaOrden>('fecha', 'desc');

  const movimientosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtrados = (movimientos ?? []).filter((m) => {
      if (tipo !== 'todos' && m.tipo !== tipo) return false;
      if (!q) return true;
      const item = (m.insumos?.nombre ?? m.elaborados?.nombre ?? '').toLowerCase();
      return item.includes(q) || (m.ref ?? '').toLowerCase().includes(q);
    });
    const dir = orden.dir === 'asc' ? 1 : -1;
    return [...filtrados].sort((a, b) => {
      switch (orden.col) {
        case 'item':
          return dir * (a.insumos?.nombre ?? a.elaborados?.nombre ?? '').localeCompare(b.insumos?.nombre ?? b.elaborados?.nombre ?? '');
        case 'cantidad':
          return dir * (Number(a.cantidad) - Number(b.cantidad));
        case 'stock':
          return dir * (Number(a.stock_resultante) - Number(b.stock_resultante));
        default:
          return dir * (new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      }
    });
  }, [movimientos, busqueda, tipo, orden]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader title="Movimientos" subtitle="Auditoría de stock — no editable. Últimos 100 movimientos." />

      {movimientos?.length ? (
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <TextInput
            placeholder="🔍 Buscar por ítem o ref…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ maxWidth: 260 }}
          />
          <Select value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ minWidth: 150 }}>
            <option value="todos">Todos los tipos</option>
            {Object.entries(TIPO_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !movimientos?.length ? (
        <EmptyState>Todavía no hay movimientos.</EmptyState>
      ) : !movimientosFiltrados.length ? (
        <EmptyState>No hay movimientos que coincidan con la búsqueda.</EmptyState>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <ThOrdenable col="fecha" orden={orden} onOrdenar={alClickear}>
                Fecha
              </ThOrdenable>
              <th>Tipo</th>
              <ThOrdenable col="item" orden={orden} onOrdenar={alClickear}>
                Ítem
              </ThOrdenable>
              <ThOrdenable col="cantidad" orden={orden} onOrdenar={alClickear}>
                Cantidad
              </ThOrdenable>
              <ThOrdenable col="stock" orden={orden} onOrdenar={alClickear}>
                Stock resultante
              </ThOrdenable>
              <th>Ref</th>
            </tr>
          </thead>
          <tbody>
            {movimientosFiltrados.map((m) => (
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
