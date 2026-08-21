import { useState } from 'react';
import { useFacturaMutations } from '../hooks';
import { FormModal } from '../../../components/FormModal';
import { Field, TextInput } from '../../../components/Field';

export function NuevaFacturaModal({
  proveedorId,
  nombreProveedor,
  mozoId,
  onClose,
}: {
  proveedorId: number;
  nombreProveedor: string;
  mozoId: string;
  onClose: () => void;
}) {
  const { crear } = useFacturaMutations(proveedorId);
  const [form, setForm] = useState({ fecha: new Date().toISOString().slice(0, 10), monto: '', numeroFactura: '' });
  const monto = Number(form.monto);
  const valido = !!form.fecha && monto > 0;

  function submit() {
    if (!valido) return;
    crear.mutate({ proveedorId, fecha: form.fecha, monto, numeroFactura: form.numeroFactura, cargadoPor: mozoId });
    onClose();
  }

  return (
    <FormModal
      title={`🧾 Cargar factura de ${nombreProveedor}`}
      onClose={onClose}
      onSubmit={submit}
      submitLabel="+ Cargar factura"
      submitDisabled={!valido}
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
