import { useState } from 'react';
import { useInsumoMutations, useInsumos } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable } from '../../../components/DataTable';
import { Button } from '../../../components/Button';
import { TextInput } from '../../../components/Field';
import { Badge } from '../../../components/Badge';
import { EmptyState } from '../../../components/EmptyState';

const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });

export function InsumosView() {
  const { data: insumos, isLoading } = useInsumos();
  const { crear, borrar } = useInsumoMutations();
  const [form, setForm] = useState({ nombre: '', unidad: 'kg', stock: '', costoUnit: '', stockMin: '' });

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

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !insumos?.length ? (
        <EmptyState>Todavía no cargaste insumos.</EmptyState>
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
            {insumos.map((i) => {
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
