import { useState } from 'react';
import { useClienteMutations } from '../hooks';
import { FormModal } from '../../../components/FormModal';
import { Field, TextInput } from '../../../components/Field';

export function NuevoClienteModal({ onClose }: { onClose: () => void }) {
  const { crear } = useClienteMutations();
  const [form, setForm] = useState({ nombre: '', apellido: '', dni: '', cuit: '', direccion: '', condicionFiscal: '', email: '', descuentoPct: '' });

  function submit() {
    if (!form.nombre.trim() || !form.apellido.trim()) return;
    crear.mutate({ ...form, descuentoPct: Number(form.descuentoPct) || 0 });
    onClose();
  }

  return (
    <FormModal
      title="🧑 Nuevo cliente"
      onClose={onClose}
      onSubmit={submit}
      submitLabel="+ Agregar cliente"
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
        <Field label="CUIT" style={{ flex: 1 }}>
          <TextInput value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })} />
        </Field>
      </div>
      <Field label="Condición fiscal">
        <TextInput placeholder="Ej: Consumidor Final, Responsable Inscripto" value={form.condicionFiscal} onChange={(e) => setForm({ ...form, condicionFiscal: e.target.value })} />
      </Field>
      <Field label="Dirección">
        <TextInput value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
      </Field>
      <div style={{ display: 'flex', gap: 8 }}>
        <Field label="Email" style={{ flex: 2 }}>
          <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="% descuento" style={{ flex: 1 }}>
          <TextInput type="number" min={0} max={100} value={form.descuentoPct} onChange={(e) => setForm({ ...form, descuentoPct: e.target.value })} />
        </Field>
      </div>
    </FormModal>
  );
}
