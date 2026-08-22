import { useState } from 'react';
import { useEmpleadoMutations } from '../hooks';
import { FormModal } from '../../../components/FormModal';
import { Field, TextInput } from '../../../components/Field';
import type { Database } from '../../../lib/supabase/types';

type Empleado = Database['public']['Tables']['empleados']['Row'];

// Mismo modal para cargar y editar -- si viene `empleado`, arranca con
// esos valores y guarda con actualizar() en vez de crear().
export function NuevoEmpleadoModal({ empleado, onClose }: { empleado?: Empleado; onClose: () => void }) {
  const editando = !!empleado;
  const { crear, actualizar } = useEmpleadoMutations();
  const [form, setForm] = useState({
    nombre: empleado?.nombre ?? '',
    apellido: empleado?.apellido ?? '',
    dni: empleado?.dni ?? '',
    puesto: empleado?.puesto ?? '',
    ingreso: empleado?.ingreso ?? '',
    descuentoPct: empleado ? String(empleado.descuento_pct) : '',
  });

  const guardando = editando ? actualizar.isPending : crear.isPending;
  const mutacionActiva = editando ? actualizar : crear;
  const valido = form.nombre.trim() !== '' && form.apellido.trim() !== '';

  function submit() {
    if (!valido) return;
    if (editando) {
      actualizar.mutate({ id: empleado.id, ...form, descuentoPct: Number(form.descuentoPct) || 0 });
    } else {
      crear.mutate({ ...form, descuentoPct: Number(form.descuentoPct) || 0 });
    }
    onClose();
  }

  return (
    <FormModal
      title={editando ? '✏️ Editar empleado' : '👤 Nuevo empleado'}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={guardando ? 'Guardando…' : editando ? 'Guardar cambios' : '+ Agregar empleado'}
      submitDisabled={!valido || guardando}
      error={mutacionActiva.isError ? mutacionActiva.error?.message : null}
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
