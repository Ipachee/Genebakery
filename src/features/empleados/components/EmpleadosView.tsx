import { useMemo, useState } from 'react';
import { usePuedeEditar } from '../../permisos/hooks';
import { useEmpleadoMutations, useEmpleados } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable, ThOrdenable, useOrdenTabla } from '../../../components/DataTable';
import { Button } from '../../../components/Button';
import { TextInput } from '../../../components/Field';
import { EmptyState } from '../../../components/EmptyState';
import { useConfirm } from '../../../components/ConfirmDialog';
import { NuevoEmpleadoModal } from './NuevoEmpleadoModal';
import type { Database } from '../../../lib/supabase/types';

type Empleado = Database['public']['Tables']['empleados']['Row'];
type ColumnaOrden = 'nombre' | 'dni' | 'puesto' | 'ingreso' | 'descuento';

export function EmpleadosView() {
  const puedeEditar = usePuedeEditar('empleados');
  const { data: empleados, isLoading } = useEmpleados();
  const { borrar } = useEmpleadoMutations();
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Empleado | null>(null);
  const { orden, alClickear } = useOrdenTabla<ColumnaOrden>('nombre');
  const { confirm, dialog } = useConfirm();

  const empleadosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtrados = (empleados ?? []).filter((e) => {
      if (!q) return true;
      return `${e.nombre} ${e.apellido}`.toLowerCase().includes(q) || (e.puesto ?? '').toLowerCase().includes(q);
    });
    const dir = orden.dir === 'asc' ? 1 : -1;
    return [...filtrados].sort((a, b) => {
      switch (orden.col) {
        case 'dni':
          return dir * (a.dni ?? '').localeCompare(b.dni ?? '');
        case 'puesto':
          return dir * (a.puesto ?? '').localeCompare(b.puesto ?? '');
        case 'ingreso':
          return dir * (a.ingreso ?? '').localeCompare(b.ingreso ?? '');
        case 'descuento':
          return dir * (Number(a.descuento_pct) - Number(b.descuento_pct));
        default:
          return dir * a.nombre.localeCompare(b.nombre);
      }
    });
  }, [empleados, busqueda, orden]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader title="Empleados" />

      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <TextInput
          placeholder="🔍 Buscar por nombre o puesto…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ maxWidth: 260, flex: 1 }}
        />
        {puedeEditar && (
          <Button variant="primary" onClick={() => setModalAbierto(true)}>
            + Nuevo empleado
          </Button>
        )}
      </div>

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !empleados?.length ? (
        <EmptyState>Todavía no cargaste empleados.</EmptyState>
      ) : !empleadosFiltrados.length ? (
        <EmptyState>No hay empleados que coincidan con la búsqueda.</EmptyState>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <ThOrdenable col="nombre" orden={orden} onOrdenar={alClickear}>
                Nombre
              </ThOrdenable>
              <ThOrdenable col="dni" orden={orden} onOrdenar={alClickear}>
                DNI
              </ThOrdenable>
              <ThOrdenable col="puesto" orden={orden} onOrdenar={alClickear}>
                Puesto
              </ThOrdenable>
              <ThOrdenable col="ingreso" orden={orden} onOrdenar={alClickear}>
                Ingreso
              </ThOrdenable>
              <ThOrdenable col="descuento" orden={orden} onOrdenar={alClickear}>
                Desc.
              </ThOrdenable>
              {puedeEditar && <th></th>}
            </tr>
          </thead>
          <tbody>
            {empleadosFiltrados.map((e) => (
              <tr key={e.id}>
                <td>
                  {e.nombre} {e.apellido}
                </td>
                <td>{e.dni || '—'}</td>
                <td>{e.puesto || '—'}</td>
                <td>{e.ingreso || '—'}</td>
                <td>{e.descuento_pct}%</td>
                {puedeEditar && (
                  <td style={{ display: 'flex', gap: 6 }}>
                    <Button variant="secondary" size="sm" aria-label={`Editar ${e.nombre} ${e.apellido}`} onClick={() => setEditando(e)}>
                      ✏️
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      aria-label={`Borrar ${e.nombre} ${e.apellido}`}
                      onClick={async () => {
                        if (await confirm(`¿Borrar a ${e.nombre} ${e.apellido}?`)) borrar.mutate(e.id);
                      }}
                    >
                      🗑
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}

      {modalAbierto && <NuevoEmpleadoModal onClose={() => setModalAbierto(false)} />}
      {editando && <NuevoEmpleadoModal empleado={editando} onClose={() => setEditando(null)} />}
      {dialog}
    </div>
  );
}
