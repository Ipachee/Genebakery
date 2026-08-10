import { getTicketConfig } from '../../../lib/ticketConfig';
import type { PedidoConItems } from '../../pedidos/hooks';

export function TicketImprimible({ pedido, mesaLabel }: { pedido: PedidoConItems; mesaLabel: string }) {
  const cfg = getTicketConfig();
  const anchoPx = cfg.ancho === 58 ? 210 : 280;
  const fontFamily = cfg.fuente === 'mono' ? 'ui-monospace, Consolas, monospace' : 'Arial, sans-serif';

  return (
    <div
      className="ticket-print"
      style={{
        width: anchoPx,
        fontFamily,
        fontSize: cfg.tamano,
        color: '#000',
        padding: '6px 4px',
      }}
    >
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: cfg.tamano + 3, marginBottom: 4 }}>{cfg.nombreLocal}</div>
      <div style={{ textAlign: 'center', marginBottom: 6 }}>COMANDA — COCINA/BARRA</div>
      <hr style={{ border: 'none', borderTop: '1px dashed #000' }} />
      <div style={{ margin: '6px 0' }}>
        <div>
          <strong>Mesa:</strong> {mesaLabel}
        </div>
        <div>
          <strong>Hora:</strong> {new Date(pedido.enviado_at ?? pedido.created_at).toLocaleTimeString('es-AR')}
        </div>
      </div>
      <hr style={{ border: 'none', borderTop: '1px dashed #000' }} />
      <div style={{ margin: '6px 0' }}>
        {pedido.pedido_items.map((it) => (
          <div key={it.id} style={{ marginBottom: 4 }}>
            <div>
              {it.cantidad}x {it.productos?.nombre ?? `Producto #${it.producto_id}`}
            </div>
            {it.nota && <div style={{ paddingLeft: 12, fontStyle: 'italic' }}>· {it.nota}</div>}
          </div>
        ))}
      </div>
      <hr style={{ border: 'none', borderTop: '1px dashed #000' }} />
      <div style={{ textAlign: 'center', marginTop: 6 }}>{cfg.pie}</div>
    </div>
  );
}
