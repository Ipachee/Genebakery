import { useState } from 'react';
import { useRegistrarAperturaCaja } from '../hooks';
import { Button } from '../../../components/Button';
import { TextInput } from '../../../components/Field';
import type { Database } from '../../../lib/supabase/types';

type Turno = Database['public']['Tables']['turnos']['Row'];

export function AperturaCajaModal({ turno, onClose }: { turno: Turno; onClose: () => void }) {
  const [monto, setMonto] = useState('');
  const registrar = useRegistrarAperturaCaja(turno.id);

  async function confirmar() {
    await registrar.mutateAsync(Number(monto) || 0);
    onClose();
  }

  return (
    <div className="pedido-overlay" onClick={onClose}>
      <div className="pedido-modal" style={{ width: 380 }} onClick={(e) => e.stopPropagation()}>
        <div className="pedido-modal-header">
          <h3>💵 Fondo de caja</h3>
          <button className="pedido-close" aria-label="Cerrar" onClick={onClose}>
            ✕
          </button>
        </div>
        <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>
            ¿Cuánto efectivo hay en la caja para arrancar el turno {turno.etiqueta}?
          </p>
          <TextInput
            type="number"
            min={0}
            placeholder="$ 0"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            autoFocus
          />
          {registrar.isError && (
            <p style={{ color: 'var(--red)', fontSize: 12, margin: 0 }}>{registrar.error?.message}</p>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button block onClick={confirmar} disabled={registrar.isPending}>
              {registrar.isPending ? 'Guardando…' : 'Registrar'}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Omitir
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
