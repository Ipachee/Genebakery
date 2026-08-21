import { useState } from 'react';
import { fmtMoney as fmt } from '../../../lib/format';
import { METODOS_PAGO } from '../../../lib/pedidoConstantes';
import { Button } from '../../../components/Button';
import { Select, TextInput } from '../../../components/Field';
import type { Database } from '../../../lib/supabase/types';

type Cliente = Database['public']['Tables']['clientes']['Row'];
type Pago = { metodo: string; monto: string };

const TOLERANCIA = 1; // redondeo de centavos

export function PedidoFooterCobro({
  clientes,
  clienteId,
  onClienteId,
  subtotal,
  descuento,
  total,
  onCobrar,
  onCobrarMultiple,
  pendiente,
  error,
  onCancelar,
}: {
  clientes: Cliente[] | undefined;
  clienteId: number | '';
  onClienteId: (id: number | '') => void;
  subtotal: number;
  descuento: number;
  total: number;
  onCobrar: (metodo: string) => void;
  onCobrarMultiple: (pagos: { metodo: string; monto: number }[]) => void;
  pendiente: boolean;
  error: string | null;
  onCancelar: () => void;
}) {
  const [dividir, setDividir] = useState(false);
  const [pagos, setPagos] = useState<Pago[]>([
    { metodo: METODOS_PAGO[0], monto: '' },
    { metodo: METODOS_PAGO[1], monto: '' },
  ]);

  const sumaPagos = pagos.reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const diferencia = total - sumaPagos;
  const listo = Math.abs(diferencia) <= TOLERANCIA;

  function actualizarPago(i: number, campo: keyof Pago, valor: string) {
    setPagos((prev) => prev.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)));
  }

  function agregarLinea() {
    setPagos((prev) => [...prev, { metodo: METODOS_PAGO[0], monto: '' }]);
  }

  function quitarLinea(i: number) {
    setPagos((prev) => prev.filter((_, idx) => idx !== i));
  }

  function confirmarDividido() {
    if (!listo) return;
    onCobrarMultiple(pagos.filter((p) => Number(p.monto) > 0).map((p) => ({ metodo: p.metodo, monto: Number(p.monto) })));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Select value={clienteId} onChange={(e) => onClienteId(e.target.value ? Number(e.target.value) : '')} style={{ fontSize: 12.5 }}>
        <option value="">Sin cliente</option>
        {clientes?.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre} {c.apellido} {Number(c.descuento_pct) > 0 ? `(-${c.descuento_pct}%)` : ''}
          </option>
        ))}
      </Select>
      <div className="pedido-cobro-summary">
        Subtotal {fmt.format(subtotal)}
        {descuento > 0 && ` · Descuento −${fmt.format(descuento)}`}
      </div>
      <div className="pedido-total-row">
        <span className="label">Total</span>
        <span>{fmt.format(total)}</span>
      </div>

      {!dividir ? (
        <>
          <span className="field-label">Método de pago</span>
          <div className="pedido-actions">
            {METODOS_PAGO.map((m) => (
              <Button key={m} size="sm" block disabled={pendiente} onClick={() => onCobrar(m)}>
                {m}
              </Button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setDividir(true)}>
            ➗ Dividir en varias formas de pago
          </Button>
        </>
      ) : (
        <>
          <span className="field-label">Dividir el pago</span>
          {pagos.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Select value={p.metodo} onChange={(e) => actualizarPago(i, 'metodo', e.target.value)} style={{ fontSize: 12.5, flex: 1 }}>
                {METODOS_PAGO.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
              <TextInput
                type="number"
                min={0}
                value={p.monto}
                onChange={(e) => actualizarPago(i, 'monto', e.target.value)}
                placeholder="$"
                style={{ width: 100, fontSize: 12.5 }}
              />
              {pagos.length > 1 && (
                <button className="btn-danger btn-icon" aria-label="Quitar forma de pago" onClick={() => quitarLinea(i)}>
                  🗑
                </button>
              )}
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={agregarLinea}>
            + Agregar forma de pago
          </Button>
          <div style={{ fontSize: 12, color: listo ? 'var(--green)' : 'var(--text-dim)' }}>
            {listo
              ? '✓ Suma exacta.'
              : diferencia > 0
                ? `Falta asignar ${fmt.format(diferencia)}.`
                : `Se pasó por ${fmt.format(-diferencia)}.`}
          </div>
          <Button variant="success" disabled={!listo || pendiente} onClick={confirmarDividido}>
            💰 Confirmar cobro dividido
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDividir(false)}>
            ← un solo método
          </Button>
        </>
      )}

      {error && <p style={{ color: 'var(--red)', fontSize: 11.5, margin: 0 }}>{error}</p>}

      <Button variant="ghost" size="sm" onClick={onCancelar}>
        cancelar
      </Button>
    </div>
  );
}
