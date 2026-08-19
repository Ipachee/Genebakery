import { useState } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { useFacturaMutations, useFacturasDeProveedor, useProveedorMutations, useProveedores } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable } from '../../../components/DataTable';
import { Button } from '../../../components/Button';
import { TextInput } from '../../../components/Field';
import { EmptyState } from '../../../components/EmptyState';
import { fmtMoney as fmt } from '../../../lib/format';
import type { Database } from '../../../lib/supabase/types';

type Proveedor = Database['public']['Tables']['proveedores']['Row'];

export function ProveedoresView() {
  const { session } = useAuth();
  const { data: proveedores, isLoading } = useProveedores();
  const { crear, actualizar, borrar } = useProveedorMutations();
  const [form, setForm] = useState({ nombre: '', cuit: '', telefono: '', email: '' });
  const [busqueda, setBusqueda] = useState('');
  const [proveedorId, setProveedorId] = useState<number | null>(null);

  function submit() {
    if (!form.nombre.trim()) return;
    crear.mutate(form);
    setForm({ nombre: '', cuit: '', telefono: '', email: '' });
  }

  const filtrados = (proveedores ?? []).filter((p) => p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()));
  const proveedorSeleccionado = proveedores?.find((p) => p.id === proveedorId) ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader title="Proveedores" subtitle="Cargá tus proveedores y sus facturas de compra, y buscá el historial de cada uno." />

      <div className="toolbar-form">
        <TextInput placeholder="Nombre del proveedor" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={{ width: 180 }} />
        <TextInput placeholder="CUIT" value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })} style={{ width: 130 }} />
        <TextInput placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} style={{ width: 130 }} />
        <TextInput placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ width: 180 }} />
        <Button variant="primary" onClick={submit}>
          + Agregar proveedor
        </Button>
      </div>

      <TextInput
        placeholder="🔍 Buscar proveedor por nombre…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={{ maxWidth: 320 }}
      />

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
                onToggleFacturas={() => setProveedorId(p.id === proveedorId ? null : p.id)}
                onGuardar={(v) => actualizar.mutate(v)}
                onBorrar={() => {
                  if (p.id === proveedorId) setProveedorId(null);
                  borrar.mutate(p.id);
                }}
              />
            ))}
          </tbody>
        </DataTable>
      )}

      {proveedorSeleccionado && session && (
        <FacturasDeProveedor proveedorId={proveedorSeleccionado.id} nombre={proveedorSeleccionado.nombre} mozoId={session.user.id} />
      )}
    </div>
  );
}

function FilaProveedor({
  proveedor,
  seleccionado,
  onToggleFacturas,
  onGuardar,
  onBorrar,
}: {
  proveedor: Proveedor;
  seleccionado: boolean;
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
        <Button size="sm" variant="secondary" onClick={empezarEdicion}>
          ✏️ Editar
        </Button>
        <Button variant="danger" size="sm" onClick={onBorrar}>
          🗑
        </Button>
      </td>
    </tr>
  );
}

function FacturasDeProveedor({ proveedorId, nombre, mozoId }: { proveedorId: number; nombre: string; mozoId: string }) {
  const { data: facturas, isLoading } = useFacturasDeProveedor(proveedorId);
  const { crear, borrar } = useFacturaMutations(proveedorId);
  const [form, setForm] = useState({ fecha: new Date().toISOString().slice(0, 10), monto: '', numeroFactura: '' });

  const total = (facturas ?? []).reduce((s, f) => s + Number(f.monto), 0);

  function submit() {
    const monto = Number(form.monto);
    if (!form.fecha || !monto) return;
    crear.mutate({ proveedorId, fecha: form.fecha, monto, numeroFactura: form.numeroFactura, cargadoPor: mozoId });
    setForm({ fecha: new Date().toISOString().slice(0, 10), monto: '', numeroFactura: '' });
  }

  return (
    <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div className="field-label">Facturas de {nombre}</div>

      <div className="toolbar-form">
        <TextInput type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} style={{ width: 150 }} />
        <TextInput type="number" min={0} placeholder="Monto" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} style={{ width: 130 }} />
        <TextInput placeholder="N° de factura (opcional)" value={form.numeroFactura} onChange={(e) => setForm({ ...form, numeroFactura: e.target.value })} style={{ width: 160 }} />
        <Button variant="primary" onClick={submit}>
          + Cargar factura
        </Button>
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {facturas.map((f) => (
                <tr key={f.id}>
                  <td>{new Date(f.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</td>
                  <td>{f.numero_factura || '—'}</td>
                  <td>{fmt.format(Number(f.monto))}</td>
                  <td>
                    <Button variant="danger" size="sm" onClick={() => borrar.mutate(f.id)}>
                      🗑
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 13.5, fontWeight: 700 }}>
            Total: {fmt.format(total)}
          </div>
        </>
      )}
    </div>
  );
}
