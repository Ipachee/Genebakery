import { useState } from 'react';
import { useEmpleadoMutations } from '../hooks';
import { FormModal } from '../../../components/FormModal';
import { Field, TextInput } from '../../../components/Field';

export function NuevoEmpleadoModal({ onClose }: { onClose: () => void }) {
  const { crear } = useEmpleadoMutations();
  const [form, setForm] = useState({ nombre: '', apellido: '', dni: '', puesto: '', ingreso: '', descuentoPct: '' });

  function submit() {
    if (!form.nombre.trim() || !form.apellido.trim()) return;
    crear.mutate({ ...form, descuentoPct: Number(form.descuentoPct) || 0 });
    onClose();
  }

  return (
    <FormModal
      title="👤 Nuevo empleado"
      onClose={onClose}
      onSubmit={submit}
      submitLabel="+ Agregar empleado"
      submitDisabled={!form.nombre.trim() || !form.apellido.trim()}
    >
      <div style={{ display: 'flex', gap: 8 }}>
        <Field label="Nombre" style={{ flex: 1 }}>
          <TextInput autoFocus value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </Field>
        <Field label="Apellido" style={{ flex: 1 }}>
          <TextInput value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Field label="DNI" style={{ flex: 1 }}>
          <TextInput value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} />
        </Field>
        <Field label="Puesto" style={{ flex: 1 }}>
          <TextInput value={form.puesto} onChange={(e) => setForm({ ...form, puesto: e.target.value })} />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Field label="Ingreso" style={{ flex: 1 }}>
          <TextInput type="date" value={form.ingreso} onChange={(e) => setForm({ ...form, ingreso: e.target.value })} />
        </Field>
        <Field label="% descuento" style={{ flex: 1 }}>
          <TextInput type="number" min={0} max={100} value={form.descuentoPct} onChange={(e) => setForm({ ...form, descuentoPct: e.target.value })} />
        </Field>
      </div>
    </FormModal>
  );
}
