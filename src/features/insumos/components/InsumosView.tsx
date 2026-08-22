import { useMemo, useState } from 'react';
import { useInsumoMutations, useInsumos } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable, ThOrdenable, useOrdenTabla } from '../../../components/DataTable';
import { Button } from '../../../components/Button';
import { Select, TextInput } from '../../../components/Field';
import { Badge } from '../../../components/Badge';
import { EmptyState } from '../../../components/EmptyState';
import { useConfirm } from '../../../components/ConfirmDialog';
import { fmtMoneyDecimal as fmt } from '../../../lib/format';
import { NuevoInsumoModal } from './NuevoInsumoModal';
import type { Database } from '../../../lib/supabase/types';

type Insumo = Database['public']['Tables']['insumos']['Row'];
type ColumnaOrden = 'nombre' | 'stock' | 'costo' | 'minimo';

export function InsumosView() {
  const { data: insumos, isLoading } = useInsumos();
  const { borrar } = useInsumoMutations();
  const [busqueda, setBusqueda] = useState('');
  const [unidad, setUnidad] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Insumo | null>(null);
  const { orden, alClickear } = useOrdenTabla<ColumnaOrden>('nombre');
  const { confirm, dialog } = useConfirm();

  const unidadesDisponibles = useMemo(
    () => Array.from(new Set((insumos ?? []).map((i) => i.unidad))).sort((a, b) => a.localeCompare(b)),
    [insumos]
  );

  const insumosFiltrados = useMemo(() => {
    const filtrados = (insumos ?? []).filter(
      (i) => i.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()) && (!unidad || i.unidad === unidad)
    );
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
  }, [insumos, busqueda, unidad, orden]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader title="Insumos" subtitle="Stock y costo por promedio ponderado. Se recalcula solo con cada compra." />

      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', flex: 1 }}>
          <TextInput
            placeholder="🔍 Buscar insumo por nombre…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ maxWidth: 260, flex: 1 }}
          />
          <Select value={unidad} onChange={(e) => setUnidad(e.target.value)} style={{ maxWidth: 160 }}>
            <option value="">Todas las unidades</option>
            {unidadesDisponibles.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </div>
        <Button variant="primary" onClick={() => setModalAbierto(true)}>
          + Nuevo insumo
        </Button>
      </div>

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !insumos?.length ? (
        <EmptyState>Todavía no cargaste insumos.</EmptyState>
      ) : !insumosFiltrados.length ? (
        <EmptyState>No hay insumos que coincidan con la búsqueda o el filtro.</EmptyState>
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
                  <td style={{ display: 'flex', gap: 6 }}>
                    <Button variant="secondary" size="sm" aria-label={`Editar ${i.nombre}`} onClick={() => setEditando(i)}>
                      ✏️
                    </Button>
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
      {editando && <NuevoInsumoModal insumo={editando} onClose={() => setEditando(null)} />}
      {dialog}
    </div>
  );
}
