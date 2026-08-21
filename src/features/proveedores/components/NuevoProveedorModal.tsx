import { useState } from 'react';
import { useProveedorMutations } from '../hooks';
import { FormModal } from '../../../components/FormModal';
import { Field, TextInput } from '../../../components/Field';

export function NuevoProveedorModal({ onClose }: { onClose: () => void }) {
  const { crear } = useProveedorMutations();
  const [form, setForm] = useState({ nombre: '', cuit: '', telefono: '', email: '' });

  function submit() {
    if (!form.nombre.trim()) return;
    crear.mutate(form);
    onClose();
  }

  return (
    <FormModal
      title="🚚 Nuevo proveedor"
      onClose={onClose}
      onSubmit={submit}
      submitLabel="+ Agregar proveedor"
      submitDisabled={!form.nombre.trim()}
    >
      <Field label="Nombre del proveedor">
        <TextInput autoFocus value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
      </Field>
      <Field label="CUIT">
        <TextInput value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })} />
      </Field>
      <div style={{ display: 'flex', gap: 8 }}>
        <Field label="Teléfono" style={{ flex: 1 }}>
          <TextInput value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
        </Field>
        <Field label="Email" style={{ flex: 1 }}>
          <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
      </div>
    </FormModal>
  );
}
