import { useMemo, useState } from 'react';
import { useClienteMutations, useClientes } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable } from '../../../components/DataTable';
import { Button } from '../../../components/Button';
import { Select, TextInput } from '../../../components/Field';
import { EmptyState } from '../../../components/EmptyState';

const ORDEN_OPCIONES = {
  nombre: 'Nombre (A-Z)',
  visitas: 'Más visitas',
  gastado: 'Más gastado',
} as const;

export function ClientesView() {
  const { data: clientes, isLoading } = useClientes();
  const { crear, borrar } = useClienteMutations();
  const [form, setForm] = useState({ nombre: '', apellido: '', dni: '', cuit: '', direccion: '', condicionFiscal: '', email: '', descuentoPct: '' });
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<keyof typeof ORDEN_OPCIONES>('nombre');

  function submit() {
    if (!form.nombre || !form.apellido) return;
    crear.mutate({ ...form, descuentoPct: Number(form.descuentoPct) || 0 });
    setForm({ nombre: '', apellido: '', dni: '', cuit: '', direccion: '', condicionFiscal: '', email: '', descuentoPct: '' });
  }

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtrados = (clientes ?? []).filter((c) => {
      if (!q) return true;
      return `${c.nombre} ${c.apellido}`.toLowerCase().includes(q) || (c.dni ?? '').includes(q) || (c.cuit ?? '').includes(q);
    });
    switch (orden) {
      case 'visitas':
        return [...filtrados].sort((a, b) => Number(b.visitas) - Number(a.visitas));
      case 'gastado':
        return [...filtrados].sort((a, b) => Number(b.total_gastado) - Number(a.total_gastado));
      default:
        return [...filtrados].sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
  }, [clientes, busqueda, orden]);

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

      {clientes?.length ? (
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <TextInput
            placeholder="🔍 Buscar por nombre o DNI/CUIT…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ maxWidth: 260 }}
          />
          <Select value={orden} onChange={(e) => setOrden(e.target.value as keyof typeof ORDEN_OPCIONES)} style={{ minWidth: 170 }}>
            {Object.entries(ORDEN_OPCIONES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

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
