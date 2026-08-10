import { fmtMoney as fmt } from '../../../lib/format';
import { METODOS_PAGO } from '../../../lib/pedidoConstantes';
import { Button } from '../../../components/Button';
import { Select } from '../../../components/Field';
import type { Database } from '../../../lib/supabase/types';

type Cliente = Database['public']['Tables']['clientes']['Row'];

export function PedidoFooterCobro({
  clientes,
  clienteId,
  onClienteId,
  subtotal,
  descuento,
  total,
  onCobrar,
  onCancelar,
}: {
  clientes: Cliente[] | undefined;
  clienteId: number | '';
  onClienteId: (id: number | '') => void;
  subtotal: number;
  descuento: number;
  total: number;
  onCobrar: (metodo: string) => void;
  onCancelar: () => void;
}) {
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
      <span className="field-label">Método de pago</span>
      <div className="pedido-actions">
        {METODOS_PAGO.map((m) => (
          <Button key={m} size="sm" block onClick={() => onCobrar(m)}>
            {m}
          </Button>
        ))}
      </div>
      <Button variant="ghost" size="sm" onClick={onCancelar}>
        cancelar
      </Button>
    </div>
  );
}
