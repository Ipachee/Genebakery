import { useMemo, useState } from 'react';
import { useInsumoMutations, useInsumos } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable, ThOrdenable, useOrdenTabla } from '../../../components/DataTable';
import { Button } from '../../../components/Button';
import { TextInput } from '../../../components/Field';
import { Badge } from '../../../components/Badge';
import { EmptyState } from '../../../components/EmptyState';
import { useConfirm } from '../../../components/ConfirmDialog';
import { fmtMoneyDecimal as fmt } from '../../../lib/format';
import { NuevoInsumoModal } from './NuevoInsumoModal';

type ColumnaOrden = 'nombre' | 'stock' | 'costo' | 'minimo';

export function InsumosView() {
  const { data: insumos, isLoading } = useInsumos();
  const { borrar } = useInsumoMutations();
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const { orden, alClickear } = useOrdenTabla<ColumnaOrden>('nombre');
  const { confirm, dialog } = useConfirm();

  const insumosFiltrados = useMemo(() => {
    const filtrados = (insumos ?? []).filter((i) => i.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()));
    const dir = orden.dir === 'asc' ? 1 : -1;
    return [...filtrados].sort((a, b) => {
      switch (orden.col) {
        case 'stock':
          return dir * (Number(a.stock) - Number(b.stock));
        case 'costo':
          return dir * (Number(a.costo_unit) - Number(b.costo_unit));
        case 'minimo':
          return dir * (Number(a.stock_min) - Number(b.stock_min));
        default:
          return dir * a.nombre.localeCompare(b.nombre);
      }
    });
  }, [insumos, busqueda, orden]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader title="Insumos" subtitle="Stock y costo por promedio ponderado. Se recalcula solo con cada compra." />

      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <TextInput
          placeholder="🔍 Buscar insumo por nombre…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ maxWidth: 260, flex: 1 }}
        />
        <Button variant="primary" onClick={() => setModalAbierto(true)}>
          + Nuevo insumo
        </Button>
      </div>

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !insumos?.length ? (
        <EmptyState>Todavía no cargaste insumos.</EmptyState>
      ) : !insumosFiltrados.length ? (
        <EmptyState>No hay insumos que coincidan con la búsqueda.</EmptyState>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <ThOrdenable col="nombre" orden={orden} onOrdenar={alClickear}>
                Nombre
              </ThOrdenable>
              <th>Unidad</th>
              <ThOrdenable col="stock" orden={orden} onOrdenar={alClickear}>
                Stock
              </ThOrdenable>
              <ThOrdenable col="costo" orden={orden} onOrdenar={alClickear}>
                Costo unit.
              </ThOrdenable>
              <ThOrdenable col="minimo" orden={orden} onOrdenar={alClickear}>
                Mínimo
              </ThOrdenable>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {insumosFiltrados.map((i) => {
              const bajo = Number(i.stock) <= Number(i.stock_min);
              return (
                <tr key={i.id} className={bajo ? 'row-warn' : undefined}>
                  <td>{i.nombre}</td>
                  <td>{i.unidad}</td>
                  <td>
                    {i.stock} {bajo && <Badge tone="warn">bajo</Badge>}
                  </td>
                  <td>{fmt.format(Number(i.costo_unit))}</td>
                  <td>{i.stock_min}</td>
                  <td>
                    <Button
                      variant="danger"
                      size="sm"
                      aria-label={`Borrar ${i.nombre}`}
                      onClick={async () => {
                        if (await confirm(`¿Borrar el insumo "${i.nombre}"?`)) borrar.mutate(i.id);
                      }}
                    >
                      🗑
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      )}

      {modalAbierto && <NuevoInsumoModal onClose={() => setModalAbierto(false)} />}
      {dialog}
    </div>
  );
}
