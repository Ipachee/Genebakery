import { useState } from 'react';
import { useEmpleadoMutations, useEmpleados } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable } from '../../../components/DataTable';
import { Button } from '../../../components/Button';
import { TextInput } from '../../../components/Field';
import { EmptyState } from '../../../components/EmptyState';

export function EmpleadosView() {
  const { data: empleados, isLoading } = useEmpleados();
  const { crear, borrar } = useEmpleadoMutations();
  const [form, setForm] = useState({ nombre: '', apellido: '', dni: '', puesto: '', ingreso: '', descuentoPct: '' });

  function submit() {
    if (!form.nombre || !form.apellido) return;
    crear.mutate({ ...form, descuentoPct: Number(form.descuentoPct) || 0 });
    setForm({ nombre: '', apellido: '', dni: '', puesto: '', ingreso: '', descuentoPct: '' });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader title="Empleados" subtitle="Equipo del local. El % de descuento aplica cuando consumen durante su turno." />

      <div className="toolbar-form">
        <TextInput placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={{ width: 130 }} />
        <TextInput placeholder="Apellido" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} style={{ width: 130 }} />
        <TextInput placeholder="DNI" value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} style={{ width: 110 }} />
        <TextInput placeholder="Puesto" value={form.puesto} onChange={(e) => setForm({ ...form, puesto: e.target.value })} style={{ width: 140 }} />
        <TextInput placeholder="Ingreso" type="date" value={form.ingreso} onChange={(e) => setForm({ ...form, ingreso: e.target.value })} style={{ width: 150 }} />
        <TextInput placeholder="% descuento" type="number" value={form.descuentoPct} onChange={(e) => setForm({ ...form, descuentoPct: e.target.value })} style={{ width: 100 }} />
        <Button variant="primary" onClick={submit}>
          + Agregar
        </Button>
      </div>

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !empleados?.length ? (
        <EmptyState>Todavía no cargaste empleados.</EmptyState>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>DNI</th>
              <th>Puesto</th>
              <th>Ingreso</th>
              <th>Desc.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {empleados.map((e) => (
              <tr key={e.id}>
                <td>
                  {e.nombre} {e.apellido}
                </td>
                <td>{e.dni || '—'}</td>
                <td>{e.puesto || '—'}</td>
                <td>{e.ingreso || '—'}</td>
                <td>{e.descuento_pct}%</td>
                <td>
                  <Button variant="danger" size="sm" onClick={() => borrar.mutate(e.id)}>
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
