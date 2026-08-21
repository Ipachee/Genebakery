import { useState } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { useCrearFacturaPendiente } from '../../facturacion/hooks';
import { FormModal } from '../../../components/FormModal';
import { Field, Select, TextInput } from '../../../components/Field';

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function GenerarFacturaModal({
  ventaId,
  clienteId,
  mailInicial,
  onClose,
}: {
  ventaId: number;
  clienteId: number | null;
  mailInicial: string;
  onClose: () => void;
}) {
  const { session } = useAuth();
  const crear = useCrearFacturaPendiente();
  const [tipo, setTipo] = useState<'factura_b' | 'factura_a' | 'factura_c'>('factura_b');
  const [mail, setMail] = useState(mailInicial);
  const mailValido = EMAIL_VALIDO.test(mail.trim());

  async function submit() {
    if (!session || !mailValido) return;
    await crear.mutateAsync({ ventaId, clienteId, tipoComprobante: tipo, mailEnvio: mail.trim(), usuarioId: session.user.id });
    onClose();
  }

  return (
    <FormModal
      title="🧾 Generar factura"
      onClose={onClose}
      onSubmit={submit}
      submitLabel={crear.isPending ? 'Guardando…' : 'Pedir factura'}
      submitDisabled={!mailValido || crear.isPending}
      error={crear.isError ? crear.error?.message : null}
    >
      <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: 0 }}>
        Todavía no está conectada la emisión automática a ARCA (falta cargar las credenciales de AfipSDK en Ajustes →
        Facturación electrónica). Esto deja el pedido registrado con el mail de envío, listo para cuando se conecte
        -- no se pierde nada mientras tanto.
      </p>
      <Field label="Tipo de comprobante">
        <Select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
          <option value="factura_b">Factura B (consumidor final)</option>
          <option value="factura_a">Factura A (responsable inscripto)</option>
          <option value="factura_c">Factura C (monotributo)</option>
        </Select>
      </Field>
      <Field label="Mail para enviar la factura">
        <TextInput type="email" autoFocus value={mail} onChange={(e) => setMail(e.target.value)} placeholder="cliente@mail.com" />
      </Field>
      {mail.trim() && !mailValido && (
        <p style={{ fontSize: 11.5, color: 'var(--red)', margin: 0 }}>Ingresá un email válido (con @ y dominio).</p>
      )}
    </FormModal>
  );
}
