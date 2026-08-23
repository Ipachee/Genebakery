import { useState } from 'react';
import { useRegistrarAperturaCaja } from '../hooks';
import { Button } from '../../../components/Button';
import { Field, TextInput } from '../../../components/Field';
import { fmtMoney } from '../../../lib/format';
import type { Database } from '../../../lib/supabase/types';

type Turno = Database['public']['Tables']['turnos']['Row'];

// PIN fijo a propósito, no es un control de acceso real (cualquiera con
// turno abierto ya puede ver/editar esto) -- es solo una fricción para
// no tocar el monto sin querer con un toque de más.
const PIN_CONFIRMACION = '450422';

export function ArqueoCajaModal({ turno, onClose }: { turno: Turno; onClose: () => void }) {
  const [monto, setMonto] = useState(String(turno.efectivo_apertura ?? ''));
  const [pin, setPin] = useState('');
  const [errorPin, setErrorPin] = useState(false);
  const registrar = useRegistrarAperturaCaja(turno.id);

  const cambio = Number(monto) !== Number(turno.efectivo_apertura ?? 0);

  async function confirmar() {
    if (!cambio) {
      onClose();
      return;
    }
    if (pin !== PIN_CONFIRMACION) {
      setErrorPin(true);
      return;
    }
    await registrar.mutateAsync(Number(monto) || 0);
    onClose();
  }

  return (
    <div className="pedido-overlay" onClick={onClose}>
      <div className="pedido-modal" style={{ width: 380 }} onClick={(e) => e.stopPropagation()}>
        <div className="pedido-modal-header">
          <h3>💵 Caja inicial</h3>
          <button className="pedido-close" aria-label="Cerrar" onClick={onClose}>
            ✕
          </button>
        </div>
        <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>
            Efectivo con el que arrancó el turno {turno.etiqueta}. Se compara contra lo contado al cerrar.
          </p>
          {turno.efectivo_apertura != null && (
            <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: 0 }}>
              Cargado ahora: <strong>{fmtMoney.format(Number(turno.efectivo_apertura))}</strong>
            </p>
          )}
          <Field label="Monto">
            <TextInput type="number" min={0} placeholder="$ 0" value={monto} onChange={(e) => setMonto(e.target.value)} autoFocus />
          </Field>

          {cambio && (
            <Field label="Contraseña para confirmar el cambio">
              <TextInput
                type="password"
                placeholder="••••••"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setErrorPin(false);
                }}
              />
            </Field>
          )}
          {errorPin && <p style={{ color: 'var(--red)', fontSize: 12, margin: 0 }}>Contraseña incorrecta.</p>}
          {registrar.isError && <p style={{ color: 'var(--red)', fontSize: 12, margin: 0 }}>{registrar.error?.message}</p>}

          <div style={{ display: 'flex', gap: 8 }}>
            <Button block onClick={confirmar} disabled={registrar.isPending || (cambio && !pin)}>
              {registrar.isPending ? 'Guardando…' : cambio ? 'Confirmar cambio' : 'Guardar'}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
