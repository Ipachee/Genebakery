import { useMemo, useState } from 'react';
import { useInsumoMutations, useInsumos } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable } from '../../../components/DataTable';
import { Button } from '../../../components/Button';
import { Select, TextInput } from '../../../components/Field';
import { Badge } from '../../../components/Badge';
import { EmptyState } from '../../../components/EmptyState';
import { fmtMoneyDecimal as fmt } from '../../../lib/format';

const ORDEN_OPCIONES = {
  nombre: 'Nombre (A-Z)',
  stock_asc: 'Stock (menor a mayor)',
  stock_desc: 'Stock (mayor a menor)',
  bajo: 'Stock bajo primero',
} as const;

export function InsumosView() {
  const { data: insumos, isLoading } = useInsumos();
  const { crear, borrar } = useInsumoMutations();
  const [form, setForm] = useState({ nombre: '', unidad: 'kg', stock: '', costoUnit: '', stockMin: '' });
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<keyof typeof ORDEN_OPCIONES>('nombre');

  function submit() {
    if (!form.nombre || !form.unidad) return;
    crear.mutate({
      nombre: form.nombre,
      unidad: form.unidad,
      stock: Number(form.stock) || 0,
      costoUnit: Number(form.costoUnit) || 0,
      stockMin: Number(form.stockMin) || 0,
    });
    setForm({ nombre: '', unidad: 'kg', stock: '', costoUnit: '', stockMin: '' });
  }

  const insumosFiltrados = useMemo(() => {
    const filtrados = (insumos ?? []).filter((i) => i.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()));
    const bajo = (i: (typeof filtrados)[number]) => Number(i.stock) <= Number(i.stock_min);
    switch (orden) {
      case 'stock_asc':
        return [...filtrados].sort((a, b) => Number(a.stock) - Number(b.stock));
      case 'stock_desc':
        return [...filtrados].sort((a, b) => Number(b.stock) - Number(a.stock));
      case 'bajo':
        return [...filtrados].sort((a, b) => Number(bajo(b)) - Number(bajo(a)));
      default:
        return [...filtrados].sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
  }, [insumos, busqueda, orden]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader title="Insumos" subtitle="Stock y costo por promedio ponderado. Se recalcula solo con cada compra." />

      <div className="toolbar-form">
        <TextInput placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={{ minWidth: 160 }} />
        <TextInput placeholder="Unidad (kg, L, unid)" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} style={{ width: 140 }} />
        <TextInput placeholder="Stock inicial" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} style={{ width: 110 }} />
        <TextInput placeholder="Costo unitario" type="number" value={form.costoUnit} onChange={(e) => setForm({ ...form, costoUnit: e.target.value })} style={{ width: 120 }} />
        <TextInput placeholder="Stock mínimo" type="number" value={form.stockMin} onChange={(e) => setForm({ ...form, stockMin: e.target.value })} style={{ width: 110 }} />
        <Button variant="primary" onClick={submit}>
          + Agregar
        </Button>
      </div>

      {insumos?.length ? (
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <TextInput
            placeholder="🔍 Buscar insumo por nombre…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ maxWidth: 260 }}
          />
          <Select value={orden} onChange={(e) => setOrden(e.target.value as keyof typeof ORDEN_OPCIONES)} style={{ minWidth: 190 }}>
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
      ) : !insumos?.length ? (
        <EmptyState>Todavía no cargaste insumos.</EmptyState>
      ) : !insumosFiltrados.length ? (
        <EmptyState>No hay insumos que coincidan con la búsqueda.</EmptyState>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Unidad</th>
              <th>Stock</th>
              <th>Costo unit.</th>
              <th>Mínimo</th>
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
                    <Button variant="danger" size="sm" onClick={() => borrar.mutate(i.id)}>
                      🗑
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}
