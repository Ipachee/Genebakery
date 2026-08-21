import { useState } from 'react';
import { useInsumoMutations } from '../hooks';
import { FormModal } from '../../../components/FormModal';
import { Field, TextInput } from '../../../components/Field';

export function NuevoInsumoModal({ onClose }: { onClose: () => void }) {
  const { crear } = useInsumoMutations();
  const [form, setForm] = useState({ nombre: '', unidad: 'kg', stock: '', costoUnit: '', stockMin: '' });

  function submit() {
    if (!form.nombre.trim() || !form.unidad.trim()) return;
    crear.mutate({
      nombre: form.nombre.trim(),
      unidad: form.unidad.trim(),
      stock: Number(form.stock) || 0,
      costoUnit: Number(form.costoUnit) || 0,
      stockMin: Number(form.stockMin) || 0,
    });
    onClose();
  }

  return (
    <FormModal
      title="📦 Nuevo insumo"
      onClose={onClose}
      onSubmit={submit}
      submitLabel="+ Agregar insumo"
      submitDisabled={!form.nombre.trim() || !form.unidad.trim()}
    >
      <Field label="Nombre">
        <TextInput autoFocus value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
      </Field>
      <div style={{ display: 'flex', gap: 8 }}>
        <Field label="Unidad (kg, L, unid)" style={{ flex: 1 }}>
          <TextInput value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} />
        </Field>
        <Field label="Stock inicial" style={{ flex: 1 }}>
          <TextInput type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Field label="Costo unitario" style={{ flex: 1 }}>
          <TextInput type="number" min={0} value={form.costoUnit} onChange={(e) => setForm({ ...form, costoUnit: e.target.value })} />
        </Field>
        <Field label="Stock mínimo" style={{ flex: 1 }}>
          <TextInput type="number" min={0} value={form.stockMin} onChange={(e) => setForm({ ...form, stockMin: e.target.value })} />
        </Field>
      </div>
    </FormModal>
  );
}
