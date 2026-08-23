import { useState } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { usePuedeEditar } from '../../permisos/hooks';
import { useFacturaMutations, useFacturasDeProveedor, useProveedorMutations, useProveedores } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable } from '../../../components/DataTable';
import { Button } from '../../../components/Button';
import { TextInput } from '../../../components/Field';
import { EmptyState } from '../../../components/EmptyState';
import { useConfirm } from '../../../components/ConfirmDialog';
import { fmtMoney as fmt } from '../../../lib/format';
import { NuevoProveedorModal } from './NuevoProveedorModal';
import { NuevaFacturaModal } from './NuevaFacturaModal';
import type { Database } from '../../../lib/supabase/types';

type Proveedor = Database['public']['Tables']['proveedores']['Row'];

export function ProveedoresView() {
  const puedeEditar = usePuedeEditar('proveedores');
  const { session } = useAuth();
  const { data: proveedores, isLoading } = useProveedores();
  const { actualizar, borrar } = useProveedorMutations();
  const [busqueda, setBusqueda] = useState('');
  const [proveedorId, setProveedorId] = useState<number | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const { confirm, dialog } = useConfirm();

  const filtrados = (proveedores ?? []).filter((p) => p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()));
  const proveedorSeleccionado = proveedores?.find((p) => p.id === proveedorId) ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader title="Proveedores" subtitle="Cargá tus proveedores y sus facturas de compra, y buscá el historial de cada uno." />

      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <TextInput
          placeholder="🔍 Buscar proveedor por nombre…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ maxWidth: 320, flex: 1 }}
        />
        {puedeEditar && (
          <Button variant="primary" onClick={() => setModalAbierto(true)}>
            + Nuevo proveedor
          </Button>
        )}
      </div>

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !filtrados.length ? (
        <EmptyState>{busqueda ? 'No hay proveedores que coincidan con la búsqueda.' : 'Todavía no cargaste proveedores.'}</EmptyState>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>CUIT</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p) => (
              <FilaProveedor
                key={p.id}
                proveedor={p}
                seleccionado={p.id === proveedorId}
                puedeEditar={puedeEditar}
                onToggleFacturas={() => setProveedorId(p.id === proveedorId ? null : p.id)}
                onGuardar={(v) => actualizar.mutate(v)}
                onBorrar={async () => {
                  if (!(await confirm(`¿Borrar el proveedor "${p.nombre}"?`))) return;
                  if (p.id === proveedorId) setProveedorId(null);
                  borrar.mutate(p.id);
                }}
              />
            ))}
          </tbody>
        </DataTable>
      )}

      {proveedorSeleccionado && session && (
        <FacturasDeProveedor
          proveedorId={proveedorSeleccionado.id}
          nombre={proveedorSeleccionado.nombre}
          mozoId={session.user.id}
          puedeEditar={puedeEditar}
        />
      )}

      {modalAbierto && <NuevoProveedorModal onClose={() => setModalAbierto(false)} />}
      {dialog}
    </div>
  );
}

function FilaProveedor({
  proveedor,
  seleccionado,
  puedeEditar,
  onToggleFacturas,
  onGuardar,
  onBorrar,
}: {
  proveedor: Proveedor;
  seleccionado: boolean;
  puedeEditar: boolean;
  onToggleFacturas: () => void;
  onGuardar: (v: { id: number; nombre: string; cuit: string; telefono: string; email: string }) => void;
  onBorrar: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    nombre: proveedor.nombre,
    cuit: proveedor.cuit ?? '',
    telefono: proveedor.telefono ?? '',
    email: proveedor.email ?? '',
  });

  function empezarEdicion() {
    setForm({ nombre: proveedor.nombre, cuit: proveedor.cuit ?? '', telefono: proveedor.telefono ?? '', email: proveedor.email ?? '' });
    setEditando(true);
  }

  function guardar() {
    if (!form.nombre.trim()) return;
    onGuardar({ id: proveedor.id, ...form });
    setEditando(false);
  }

  if (editando) {
    return (
      <tr style={{ background: 'var(--surface-sunken)' }}>
        <td>
          <TextInput value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={{ width: '100%' }} autoFocus />
        </td>
        <td>
          <TextInput value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })} style={{ width: '100%' }} />
        </td>
        <td>
          <TextInput value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} style={{ width: '100%' }} />
        </td>
        <td>
          <TextInput value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ width: '100%' }} />
        </td>
        <td style={{ display: 'flex', gap: 6 }}>
          <Button variant="success" size="sm" onClick={guardar}>
            💾 Guardar
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setEditando(false)}>
            ✕ Cancelar
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr style={seleccionado ? { background: 'var(--surface-sunken)' } : undefined}>
      <td>{proveedor.nombre}</td>
      <td>{proveedor.cuit || '—'}</td>
      <td>{proveedor.telefono || '—'}</td>
      <td>{proveedor.email || '—'}</td>
      <td style={{ display: 'flex', gap: 6 }}>
        <Button size="sm" variant={seleccionado ? 'primary' : 'secondary'} onClick={onToggleFacturas}>
          📄 Facturas
        </Button>
        {puedeEditar && (
          <>
            <Button size="sm" variant="secondary" onClick={empezarEdicion}>
              ✏️ Editar
            </Button>
            <Button variant="danger" size="sm" aria-label={`Borrar proveedor ${proveedor.nombre}`} onClick={onBorrar}>
              🗑
            </Button>
          </>
        )}
      </td>
    </tr>
  );
}

type Factura = NonNullable<ReturnType<typeof useFacturasDeProveedor>['data']>[number];

function FacturasDeProveedor({
  proveedorId,
  nombre,
  mozoId,
  puedeEditar,
}: {
  proveedorId: number;
  nombre: string;
  mozoId: string;
  puedeEditar: boolean;
}) {
  const { data: facturas, isLoading } = useFacturasDeProveedor(proveedorId);
  const { borrar } = useFacturaMutations(proveedorId);
  const { confirm, dialog } = useConfirm();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Factura | null>(null);

  const total = (facturas ?? []).reduce((s, f) => s + Number(f.monto), 0);

  return (
    <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div className="field-label">Facturas de {nombre}</div>
        {puedeEditar && (
          <Button variant="primary" size="sm" onClick={() => setModalAbierto(true)}>
            + Cargar factura
          </Button>
        )}
      </div>

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !facturas?.length ? (
        <EmptyState>Todavía no hay facturas cargadas para este proveedor.</EmptyState>
      ) : (
        <>
          <DataTable>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>N° factura</th>
                <th>Monto</th>
                {puedeEditar && <th></th>}
              </tr>
            </thead>
            <tbody>
              {facturas.map((f) => (
                <tr key={f.id}>
                  <td>{new Date(f.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</td>
                  <td>{f.numero_factura || '—'}</td>
                  <td>{fmt.format(Number(f.monto))}</td>
                  {puedeEditar && (
                    <td style={{ display: 'flex', gap: 6 }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Editar factura ${f.numero_factura || f.id}`}
                        onClick={() => setEditando(f)}
                      >
                        ✏️
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        aria-label={`Borrar factura ${f.numero_factura || f.id}`}
                        onClick={async () => {
                          if (await confirm(`¿Borrar esta factura de ${fmt.format(Number(f.monto))}?`)) borrar.mutate(f.id);
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 13.5, fontWeight: 700 }}>
            Total: {fmt.format(total)}
          </div>
        </>
      )}

      {modalAbierto && (
        <NuevaFacturaModal proveedorId={proveedorId} nombreProveedor={nombre} mozoId={mozoId} onClose={() => setModalAbierto(false)} />
      )}
      {editando && (
        <NuevaFacturaModal
          proveedorId={proveedorId}
          nombreProveedor={nombre}
          mozoId={mozoId}
          factura={editando}
          onClose={() => setEditando(null)}
        />
      )}
      {dialog}
    </div>
  );
}
