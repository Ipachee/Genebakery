import { useState } from 'react';
import { useClienteMutations, useClientes } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable } from '../../../components/DataTable';
import { Button } from '../../../components/Button';
import { TextInput } from '../../../components/Field';
import { EmptyState } from '../../../components/EmptyState';

export function ClientesView() {
  const { data: clientes, isLoading } = useClientes();
  const { crear, borrar } = useClienteMutations();
  const [form, setForm] = useState({ nombre: '', apellido: '', dni: '', cuit: '', direccion: '', condicionFiscal: '', email: '', descuentoPct: '' });

  function submit() {
    if (!form.nombre || !form.apellido) return;
    crear.mutate({ ...form, descuentoPct: Number(form.descuentoPct) || 0 });
    setForm({ nombre: '', apellido: '', dni: '', cuit: '', direccion: '', condicionFiscal: '', email: '', descuentoPct: '' });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader title="Clientes" subtitle="Habituales y facturación. El % de descuento se aplica solo al elegirlos en el cobro." />

      <div className="toolbar-form">
        <TextInput placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={{ width: 130 }} />
        <TextInput placeholder="Apellido" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} style={{ width: 130 }} />
        <TextInput placeholder="DNI" value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} style={{ width: 110 }} />
        <TextInput placeholder="CUIT" value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })} style={{ width: 130 }} />
        <TextInput placeholder="Condición fiscal" value={form.condicionFiscal} onChange={(e) => setForm({ ...form, condicionFiscal: e.target.value })} style={{ width: 150 }} />
        <TextInput placeholder="% descuento" type="number" value={form.descuentoPct} onChange={(e) => setForm({ ...form, descuentoPct: e.target.value })} style={{ width: 100 }} />
        <Button variant="primary" onClick={submit}>
          + Agregar
        </Button>
      </div>

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !clientes?.length ? (
        <EmptyState>Todavía no cargaste clientes.</EmptyState>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>DNI/CUIT</th>
              <th>Cond. fiscal</th>
              <th>Desc.</th>
              <th>Visitas</th>
              <th>Total gastado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.nombre} {c.apellido}
                </td>
                <td>{c.dni || c.cuit || '—'}</td>
                <td>{c.condicion_fiscal || '—'}</td>
                <td>{c.descuento_pct}%</td>
                <td>{c.visitas}</td>
                <td>${Number(c.total_gastado).toLocaleString('es-AR')}</td>
                <td>
                  <Button variant="danger" size="sm" onClick={() => borrar.mutate(c.id)}>
                    🗑
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}
