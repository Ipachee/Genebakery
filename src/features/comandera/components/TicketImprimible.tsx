import { getTicketConfig } from '../../../lib/ticketConfig';
import type { ItemConProducto } from '../../pedidos/hooks';

export function TicketImprimible({
  items,
  mesaLabel,
  horaIso,
}: {
  items: ItemConProducto[];
  mesaLabel: string;
  horaIso: string | null;
}) {
  const cfg = getTicketConfig();
  const anchoPx = cfg.ancho === 58 ? 210 : 280;
  const fontFamily = cfg.fuente === 'mono' ? 'ui-monospace, Consolas, monospace' : 'Arial, sans-serif';
  const ahora = horaIso ? new Date(horaIso) : new Date();
  const raya = '-'.repeat(cfg.ancho === 58 ? 30 : 40);

  return (
    <div
      className="ticket-print"
      style={{
        width: anchoPx,
        fontFamily,
        fontSize: cfg.tamano,
        color: '#000',
        padding: '2px 4px',
      }}
    >
      {/* size: <ancho>mm auto -- el "auto" es lo que le dice al driver de
          la impresora que termine la página donde termina el contenido,
          en vez de tirar el largo de rollo que tenga de default (eso era
          lo que salía en blanco). */}
      <style>{`@page { size: ${cfg.ancho}mm auto; margin: 2mm; }`}</style>
      <div style={{ fontWeight: 700 }}>COCINA/BARRA</div>
      <div>
        Fecha: {ahora.toLocaleDateString('es-AR')}
      </div>
      <div>
        Hora: {ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div>Mesa: {mesaLabel}</div>
      <div>{raya}</div>
      {items.map((it) => (
        <div key={it.id}>
          <div>
            {it.cantidad}x {it.productos?.nombre ?? `Producto #${it.producto_id}`}
          </div>
          {it.nota && <div style={{ paddingLeft: 10, fontStyle: 'italic' }}>· {it.nota}</div>}
        </div>
      ))}
      <div>{raya}</div>
    </div>
  );
}
