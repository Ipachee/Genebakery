import { useMemo, useState } from 'react';
import { usePuedeEditar } from '../../permisos/hooks';
import { useGastos } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable, ThOrdenable, useOrdenTabla } from '../../../components/DataTable';
import { Button } from '../../../components/Button';
import { TextInput } from '../../../components/Field';
import { EmptyState } from '../../../components/EmptyState';
import { fmtMoney as fmt } from '../../../lib/format';
import { RegistrarGastoModal } from './RegistrarGastoModal';

type ColumnaOrden = 'fecha' | 'insumo' | 'cantidad' | 'costo' | 'proveedor';

export function GastosView() {
  const puedeEditar = usePuedeEditar('gastos');
  const { data: gastos, isLoading } = useGastos();
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const { orden, alClickear } = useOrdenTabla<ColumnaOrden>('fecha', 'desc');

  const gastosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtrados = (gastos ?? []).filter((g) => {
      if (!q) return true;
      return (
        (g.insumos?.nombre ?? '').toLowerCase().includes(q) ||
        (g.concepto ?? '').toLowerCase().includes(q) ||
        (g.proveedor ?? '').toLowerCase().includes(q)
      );
    });
    const dir = orden.dir === 'asc' ? 1 : -1;
    return [...filtrados].sort((a, b) => {
      switch (orden.col) {
        case 'insumo':
          return dir * (a.insumos?.nombre ?? a.concepto ?? '').localeCompare(b.insumos?.nombre ?? b.concepto ?? '');
        case 'cantidad':
          return dir * (Number(a.cantidad) - Number(b.cantidad));
        case 'costo':
          return dir * (Number(a.costo_total) - Number(b.costo_total));
        case 'proveedor':
          return dir * (a.proveedor ?? '').localeCompare(b.proveedor ?? '');
        default:
          return dir * (new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      }
    });
  }, [gastos, busqueda, orden]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader title="Gastos" />

      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <TextInput
          placeholder="🔍 Buscar por insumo, concepto o proveedor…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ maxWidth: 260, flex: 1 }}
        />
        {puedeEditar && (
          <Button variant="primary" onClick={() => setModalAbierto(true)}>
            + Registrar gasto
          </Button>
        )}
      </div>

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
              <ThOrdenable col="fecha" orden={orden} onOrdenar={alClickear}>
                Fecha
              </ThOrdenable>
              <ThOrdenable col="insumo" orden={orden} onOrdenar={alClickear}>
                Insumo / concepto
              </ThOrdenable>
              <ThOrdenable col="cantidad" orden={orden} onOrdenar={alClickear}>
                Cantidad
              </ThOrdenable>
              <ThOrdenable col="costo" orden={orden} onOrdenar={alClickear}>
                Costo total
              </ThOrdenable>
              <ThOrdenable col="proveedor" orden={orden} onOrdenar={alClickear}>
                Proveedor
              </ThOrdenable>
            </tr>
          </thead>
          <tbody>
            {gastosFiltrados.map((g) => (
              <tr key={g.id}>
                <td>{g.fecha}</td>
                <td>
                  {g.tipo === 'servicio' ? (
                    <>
                      💡 {g.concepto}
                    </>
                  ) : (
                    g.insumos?.nombre
                  )}
                </td>
                <td>{g.cantidad ?? '—'}</td>
                <td>{fmt.format(Number(g.costo_total))}</td>
                <td>{g.proveedor ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}

      {modalAbierto && <RegistrarGastoModal onClose={() => setModalAbierto(false)} />}
    </div>
  );
}
