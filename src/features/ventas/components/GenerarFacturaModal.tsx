import { useState } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { useCrearFacturaPendiente, useEmitirFactura } from '../../facturacion/hooks';
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
  const emitir = useEmitirFactura();
  const [tipo, setTipo] = useState<'factura_b' | 'factura_a' | 'factura_c'>('factura_b');
  const [mail, setMail] = useState(mailInicial);
  const [resultado, setResultado] = useState<{ cae: string; numero: number } | null>(null);
  const mailValido = EMAIL_VALIDO.test(mail.trim());

  // Dos pasos, uno atrás del otro: primero queda el pedido anotado
  // (crearFacturaPendiente), después se le pide el CAE a ARCA
  // (emitirFactura) -- si el segundo paso falla, el pedido ya quedó
  // guardado con estado "error" y se puede reintentar después sin perder
  // los datos tipeados acá.
  async function submit() {
    if (!session || !mailValido) return;
    setResultado(null);
    const pendiente = await crear.mutateAsync({ ventaId, clienteId, tipoComprobante: tipo, mailEnvio: mail.trim(), usuarioId: session.user.id });
    const emitida = await emitir.mutateAsync(pendiente.id);
    setResultado({ cae: emitida.cae, numero: emitida.numero });
  }

  const enCurso = crear.isPending || emitir.isPending;

  return (
    <FormModal
      title="🧾 Generar factura"
      onClose={onClose}
      onSubmit={submit}
      submitLabel={crear.isPending ? 'Guardando…' : emitir.isPending ? 'Pidiéndole el CAE a ARCA…' : resultado ? '✓ Emitida' : 'Emitir factura'}
      submitDisabled={!mailValido || enCurso || !!resultado}
      error={crear.isError ? crear.error?.message : emitir.isError ? emitir.error?.message : null}
    >
      {resultado ? (
        <p style={{ fontSize: 13, color: 'var(--green)', margin: 0 }}>
          ✓ Factura emitida -- CAE {resultado.cae}, comprobante N° {resultado.numero}. Ya se puede reimprimir con el
          QR desde Ventas.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: 0 }}>
            Al confirmar se le pide el CAE a ARCA en el momento (real o de prueba, según el modo configurado en
            Ajustes → Facturación electrónica).
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
        </>
      )}
    </FormModal>
  );
}
