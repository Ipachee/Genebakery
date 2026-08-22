import { useState } from 'react';
import { useFacturaMutations } from '../hooks';
import { FormModal } from '../../../components/FormModal';
import { Field, TextInput } from '../../../components/Field';
import type { Database } from '../../../lib/supabase/types';

type Factura = Database['public']['Tables']['facturas_proveedor']['Row'];

// Mismo modal para cargar y editar -- si viene `factura`, arranca con esos
// valores y guarda con actualizar() en vez de crear().
export function NuevaFacturaModal({
  proveedorId,
  nombreProveedor,
  mozoId,
  factura,
  onClose,
}: {
  proveedorId: number;
  nombreProveedor: string;
  mozoId: string;
  factura?: Factura;
  onClose: () => void;
}) {
  const editando = !!factura;
  const { crear, actualizar } = useFacturaMutations(proveedorId);
  const [form, setForm] = useState({
    fecha: factura?.fecha ?? new Date().toISOString().slice(0, 10),
    monto: factura ? String(factura.monto) : '',
    numeroFactura: factura?.numero_factura ?? '',
  });
  const monto = Number(form.monto);
  const valido = !!form.fecha && monto > 0;
  const guardando = editando ? actualizar.isPending : crear.isPending;
  const mutacionActiva = editando ? actualizar : crear;

  function submit() {
    if (!valido) return;
    if (editando) {
      actualizar.mutate({ id: factura.id, fecha: form.fecha, monto, numeroFactura: form.numeroFactura });
    } else {
      crear.mutate({ proveedorId, fecha: form.fecha, monto, numeroFactura: form.numeroFactura, cargadoPor: mozoId });
    }
    onClose();
  }

  return (
    <FormModal
      title={editando ? `✏️ Editar factura de ${nombreProveedor}` : `🧾 Cargar factura de ${nombreProveedor}`}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={guardando ? 'Guardando…' : editando ? 'Guardar cambios' : '+ Cargar factura'}
      submitDisabled={!valido || guardando}
      error={mutacionActiva.isError ? mutacionActiva.error?.message : null}
    >
      <div style={{ display: 'flex', gap: 8 }}>
        <Field label="Fecha" style={{ flex: 1 }}>
          <TextInput type="date" autoFocus value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
        </Field>
        <Field label="Monto" style={{ flex: 1 }}>
          <TextInput type="number" min={0} value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} />
        </Field>
      </div>
      <Field label="N° de factura (opcional)">
        <TextInput value={form.numeroFactura} onChange={(e) => setForm({ ...form, numeroFactura: e.target.value })} />
      </Field>
    </FormModal>
  );
}
