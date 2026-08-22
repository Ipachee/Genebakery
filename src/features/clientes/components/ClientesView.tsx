import { useMemo, useState } from 'react';
import { useClienteMutations, useClientes } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable, ThOrdenable, useOrdenTabla } from '../../../components/DataTable';
import { Button } from '../../../components/Button';
import { TextInput } from '../../../components/Field';
import { EmptyState } from '../../../components/EmptyState';
import { useConfirm } from '../../../components/ConfirmDialog';
import { NuevoClienteModal } from './NuevoClienteModal';
import type { Database } from '../../../lib/supabase/types';

type Cliente = Database['public']['Tables']['clientes']['Row'];
type ColumnaOrden = 'nombre' | 'dni' | 'fiscal' | 'descuento' | 'visitas' | 'gastado';

export function ClientesView() {
  const { data: clientes, isLoading } = useClientes();
  const { borrar } = useClienteMutations();
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const { orden, alClickear } = useOrdenTabla<ColumnaOrden>('nombre');
  const { confirm, dialog } = useConfirm();

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtrados = (clientes ?? []).filter((c) => {
      if (!q) return true;
      return `${c.nombre} ${c.apellido}`.toLowerCase().includes(q) || (c.dni ?? '').includes(q) || (c.cuit ?? '').includes(q);
    });
    const dir = orden.dir === 'asc' ? 1 : -1;
    return [...filtrados].sort((a, b) => {
      switch (orden.col) {
        case 'dni':
          return dir * (a.dni || a.cuit || '').localeCompare(b.dni || b.cuit || '');
        case 'fiscal':
          return dir * (a.condicion_fiscal ?? '').localeCompare(b.condicion_fiscal ?? '');
        case 'descuento':
          return dir * (Number(a.descuento_pct) - Number(b.descuento_pct));
        case 'visitas':
          return dir * (Number(a.visitas) - Number(b.visitas));
        case 'gastado':
          return dir * (Number(a.total_gastado) - Number(b.total_gastado));
        default:
          return dir * a.nombre.localeCompare(b.nombre);
      }
    });
  }, [clientes, busqueda, orden]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader title="Clientes" subtitle="Habituales y facturación. El % de descuento se aplica solo al elegirlos en el cobro." />

      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <TextInput
          placeholder="🔍 Buscar por nombre o DNI/CUIT…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ maxWidth: 260, flex: 1 }}
        />
        <Button variant="primary" onClick={() => setModalAbierto(true)}>
          + Nuevo cliente
        </Button>
      </div>

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !clientes?.length ? (
        <EmptyState>Todavía no cargaste clientes.</EmptyState>
      ) : !clientesFiltrados.length ? (
        <EmptyState>No hay clientes que coincidan con la búsqueda.</EmptyState>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <ThOrdenable col="nombre" orden={orden} onOrdenar={alClickear}>
                Nombre
              </ThOrdenable>
              <ThOrdenable col="dni" orden={orden} onOrdenar={alClickear}>
                DNI/CUIT
              </ThOrdenable>
              <ThOrdenable col="fiscal" orden={orden} onOrdenar={alClickear}>
                Cond. fiscal
              </ThOrdenable>
              <ThOrdenable col="descuento" orden={orden} onOrdenar={alClickear}>
                Desc.
              </ThOrdenable>
              <ThOrdenable col="visitas" orden={orden} onOrdenar={alClickear}>
                Visitas
              </ThOrdenable>
              <ThOrdenable col="gastado" orden={orden} onOrdenar={alClickear}>
                Total gastado
              </ThOrdenable>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.nombre} {c.apellido}
                </td>
                <td>{c.dni || c.cuit || '—'}</td>
                <td>{c.condicion_fiscal || '—'}</td>
                <td>{c.descuento_pct}%</td>
                <td>{c.visitas}</td>
                <td>${Number(c.total_gastado).toLocaleString('es-AR')}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <Button variant="secondary" size="sm" aria-label={`Editar ${c.nombre} ${c.apellido}`} onClick={() => setEditando(c)}>
                    ✏️
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    aria-label={`Borrar ${c.nombre} ${c.apellido}`}
                    onClick={async () => {
                      if (await confirm(`¿Borrar a ${c.nombre} ${c.apellido}?`)) borrar.mutate(c.id);
                    }}
                  >
                    🗑
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}

      {modalAbierto && <NuevoClienteModal onClose={() => setModalAbierto(false)} />}
      {editando && <NuevoClienteModal cliente={editando} onClose={() => setEditando(null)} />}
      {dialog}
    </div>
  );
}
