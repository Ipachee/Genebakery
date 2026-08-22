import { useState } from 'react';
import { useClienteMutations } from '../hooks';
import { FormModal } from '../../../components/FormModal';
import { Field, TextInput } from '../../../components/Field';
import type { Database } from '../../../lib/supabase/types';

type Cliente = Database['public']['Tables']['clientes']['Row'];

// Mismo modal para cargar y editar -- si viene `cliente`, arranca con esos
// valores y guarda con actualizar() en vez de crear().
export function NuevoClienteModal({ cliente, onClose }: { cliente?: Cliente; onClose: () => void }) {
  const editando = !!cliente;
  const { crear, actualizar } = useClienteMutations();
  const [form, setForm] = useState({
    nombre: cliente?.nombre ?? '',
    apellido: cliente?.apellido ?? '',
    dni: cliente?.dni ?? '',
    cuit: cliente?.cuit ?? '',
    direccion: cliente?.direccion ?? '',
    condicionFiscal: cliente?.condicion_fiscal ?? '',
    email: cliente?.email ?? '',
    descuentoPct: cliente ? String(cliente.descuento_pct) : '',
  });

  const guardando = editando ? actualizar.isPending : crear.isPending;
  const mutacionActiva = editando ? actualizar : crear;
  const valido = form.nombre.trim() !== '' && form.apellido.trim() !== '';

  function submit() {
    if (!valido) return;
    if (editando) {
      actualizar.mutate({ id: cliente.id, ...form, descuentoPct: Number(form.descuentoPct) || 0 });
    } else {
      crear.mutate({ ...form, descuentoPct: Number(form.descuentoPct) || 0 });
    }
    onClose();
  }

  return (
    <FormModal
      title={editando ? '✏️ Editar cliente' : '🧑 Nuevo cliente'}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={guardando ? 'Guardando…' : editando ? 'Guardar cambios' : '+ Agregar cliente'}
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
        <Field label="CUIT" style={{ flex: 1 }}>
          <TextInput value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })} />
        </Field>
      </div>
      <Field label="Condición fiscal">
        <TextInput
          placeholder="Ej: Consumidor Final, Responsable Inscripto"
          value={form.condicionFiscal}
          onChange={(e) => setForm({ ...form, condicionFiscal: e.target.value })}
        />
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
