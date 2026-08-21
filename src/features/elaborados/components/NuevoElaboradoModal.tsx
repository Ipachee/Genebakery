import { useState } from 'react';
import { useElaboradoMutations, useProductosSinElaborado } from '../hooks';
import { FormModal } from '../../../components/FormModal';
import { Field, Select, TextInput } from '../../../components/Field';

export function NuevoElaboradoModal({ onClose }: { onClose: () => void }) {
  const { data: productosDisponibles } = useProductosSinElaborado();
  const { crear } = useElaboradoMutations();
  const [form, setForm] = useState({ nombre: '', productoId: '', porcionesPorUnidad: '', porcionesMin: '' });

  function submit() {
    if (!form.nombre.trim() || !form.productoId || !form.porcionesPorUnidad) return;
    crear.mutate({
      nombre: form.nombre.trim(),
      productoId: Number(form.productoId),
      porcionesPorUnidad: Number(form.porcionesPorUnidad),
      porcionesMin: Number(form.porcionesMin) || 0,
    });
    onClose();
  }

  return (
    <FormModal
      title="🍰 Nuevo elaborado"
      onClose={onClose}
      onSubmit={submit}
      submitLabel="+ Agregar elaborado"
      submitDisabled={!form.nombre.trim() || !form.productoId || !form.porcionesPorUnidad}
    >
      <Field label="Nombre">
        <TextInput
          autoFocus
          placeholder="Ej: Torta de chocolate"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
        />
      </Field>
      <Field label="Producto del menú vinculado">
        <Select value={form.productoId} onChange={(e) => setForm({ ...form, productoId: e.target.value })}>
          <option value="">Elegí un producto…</option>
          {productosDisponibles?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </Select>
      </Field>
      <div style={{ display: 'flex', gap: 8 }}>
        <Field label="Porciones por unidad" style={{ flex: 1 }}>
          <TextInput
            type="number"
            min={1}
            value={form.porcionesPorUnidad}
            onChange={(e) => setForm({ ...form, porcionesPorUnidad: e.target.value })}
          />
        </Field>
        <Field label="Porciones mínimas" style={{ flex: 1 }}>
          <TextInput type="number" min={0} value={form.porcionesMin} onChange={(e) => setForm({ ...form, porcionesMin: e.target.value })} />
        </Field>
      </div>
    </FormModal>
  );
}
