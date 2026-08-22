import { useMemo, useState } from 'react';
import { usePuedeEditar } from '../../permisos/hooks';
import { usePagosEmpleados, usePagosEmpleadosMutations } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable } from '../../../components/DataTable';
import { Button } from '../../../components/Button';
import { TextInput } from '../../../components/Field';
import { EmptyState } from '../../../components/EmptyState';
import { useConfirm } from '../../../components/ConfirmDialog';
import { fmtMoney as fmt } from '../../../lib/format';
import { NuevoPagoModal } from './NuevoPagoModal';
import type { Database } from '../../../lib/supabase/types';

type Pago = Database['public']['Tables']['pagos_empleados']['Row'] & {
  empleados: { nombre: string; apellido: string } | null;
};

export function CobranzasView() {
  const puedeEditar = usePuedeEditar('cobranzas');
  const { data: pagos, isLoading } = usePagosEmpleados();
  const { borrar } = usePagosEmpleadosMutations();
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Pago | null>(null);
  const { confirm, dialog } = useConfirm();

  const pagosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return (pagos ?? []) as Pago[];
    return ((pagos ?? []) as Pago[]).filter((p) => {
      const nombre = p.empleados ? `${p.empleados.nombre} ${p.empleados.apellido}` : '';
      return nombre.toLowerCase().includes(q) || (p.concepto ?? '').toLowerCase().includes(q);
    });
  }, [pagos, busqueda]);

  const total = pagosFiltrados.reduce((s, p) => s + Number(p.monto), 0);

  async function handleBorrar(p: Pago) {
    const nombre = p.empleados ? `${p.empleados.nombre} ${p.empleados.apellido}` : 'este empleado';
    if (await confirm(`¿Borrar el pago de ${fmt.format(Number(p.monto))} a ${nombre}?`)) borrar.mutate(p.id);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader title="Cobranzas" subtitle="Pagos a empleados -- sueldos, adelantos, lo que haga falta registrar." />

      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <TextInput
          placeholder="🔍 Buscar por empleado o concepto…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ maxWidth: 260, flex: 1 }}
        />
        {puedeEditar && (
          <Button variant="primary" onClick={() => setModalAbierto(true)}>
            + Registrar pago
          </Button>
        )}
      </div>

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !pagos?.length ? (
        <EmptyState>Todavía no hay pagos registrados.</EmptyState>
      ) : !pagosFiltrados.length ? (
        <EmptyState>No hay pagos que coincidan con la búsqueda.</EmptyState>
      ) : (
        <>
          <DataTable>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Empleado</th>
                <th>Concepto</th>
                <th>Método</th>
                <th>Monto</th>
                {puedeEditar && <th></th>}
              </tr>
            </thead>
            <tbody>
              {pagosFiltrados.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</td>
                  <td>{p.empleados ? `${p.empleados.nombre} ${p.empleados.apellido}` : '—'}</td>
                  <td>{p.concepto || '—'}</td>
                  <td>{p.metodo_pago || '—'}</td>
                  <td>{fmt.format(Number(p.monto))}</td>
                  {puedeEditar && (
                    <td style={{ display: 'flex', gap: 6 }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Editar pago a ${p.empleados?.nombre ?? ''}`}
                        onClick={() => setEditando(p)}
                      >
                        ✏️
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        aria-label={`Borrar pago a ${p.empleados?.nombre ?? ''}`}
                        onClick={() => handleBorrar(p)}
                      >
                        🗑
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </DataTable>
          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 13.5, fontWeight: 700 }}>Total: {fmt.format(total)}</div>
        </>
      )}

      {modalAbierto && <NuevoPagoModal onClose={() => setModalAbierto(false)} />}
      {editando && <NuevoPagoModal pago={editando} onClose={() => setEditando(null)} />}
      {dialog}
    </div>
  );
}
