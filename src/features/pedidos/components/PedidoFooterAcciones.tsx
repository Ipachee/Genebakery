import { fmtMoney as fmt } from '../../../lib/format';
import { Button } from '../../../components/Button';
import type { Database } from '../../../lib/supabase/types';

type Pedido = Database['public']['Tables']['pedidos']['Row'];

export function PedidoFooterAcciones({
  pedido,
  subtotal,
  itemsCount,
  hayPendientesDeCocina,
  enviando,
  offline,
  onEnviarCocina,
  onMarcarEntregado,
  onCobrar,
  onTransferir,
  onCancelarPedido,
}: {
  pedido: Pedido | null | undefined;
  subtotal: number;
  itemsCount: number;
  hayPendientesDeCocina: boolean;
  enviando: boolean;
  offline: boolean;
  onEnviarCocina: () => void;
  onMarcarEntregado: () => void;
  onCobrar: () => void;
  onTransferir: () => void;
  onCancelarPedido: () => void;
}) {
  return (
    <>
      <div className="pedido-total-row">
        <span className="label">Total</span>
        <span>{fmt.format(subtotal)}</span>
      </div>
      {offline && (
        <p style={{ fontSize: 11, color: 'var(--red)', margin: 0 }}>
          📡 Sin conexión: podés seguir armando el pedido, pero enviar a cocina, cobrar y transferir necesitan
          internet.
        </p>
      )}
      <div className="pedido-actions">
        <Button block disabled={!pedido || !hayPendientesDeCocina || enviando || offline} onClick={onEnviarCocina}>
          🍳 Enviar a cocina
        </Button>
        {pedido?.estado === 'enviado_cocina' && !hayPendientesDeCocina && (
          <Button block disabled={offline} onClick={onMarcarEntregado}>
            ✅ Entregado
          </Button>
        )}
        <Button variant="success" block disabled={!pedido || itemsCount === 0 || offline} onClick={onCobrar}>
          💰 Cobrar
        </Button>
      </div>
      <div className="pedido-actions">
        <Button variant="secondary" size="sm" block disabled={!pedido || offline} onClick={onTransferir}>
          🔀 Transferir
        </Button>
        <Button variant="danger" size="sm" block disabled={!pedido} onClick={onCancelarPedido}>
          🗑 Cancelar pedido
        </Button>
      </div>
    </>
  );
}
