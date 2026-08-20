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
  // hr en vez de repetir el caracter "-" a mano: con letra mucho más
  // grande, un número fijo de guiones se hace mucho más ancho que el
  // papel real. El hr siempre estira al 100% del ancho, sin importar el
  // tamaño de letra.
  const raya = <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '3px 0' }} />;

  return (
    <div
      className="ticket-print"
      style={{
        width: anchoPx,
        fontFamily,
        fontSize: cfg.tamano,
        lineHeight: 1.15,
        color: '#000',
        padding: '2px 4px',
      }}
    >
      {/* size: <ancho>mm auto -- el "auto" es lo que le dice al driver de
          la impresora que termine la página donde termina el contenido,
          en vez de tirar el largo de rollo que tenga de default (eso era
          lo que salía en blanco). */}
      <style>{`@page { size: ${cfg.ancho}mm auto; margin: 2mm; }`}</style>
      <div style={{ fontWeight: 700, fontSize: cfg.tamano + 10 }}>COCINA/BARRA</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: cfg.tamano + 3, marginTop: 2 }}>
        <span>{ahora.toLocaleDateString('es-AR')}</span>
        <span>{ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div style={{ fontSize: cfg.tamano + 3 }}>Mesa: {mesaLabel}</div>
      {raya}
      {items.map((it, i) => (
        <div key={it.id} style={{ marginTop: i > 0 ? 4 : 0 }}>
          <div style={{ fontWeight: 700, fontSize: cfg.tamano + 8 }}>
            {it.cantidad}x {it.productos?.nombre ?? `Producto #${it.producto_id}`}
          </div>
          {it.nota && (
            <div style={{ paddingLeft: 22, fontSize: cfg.tamano + 2, fontStyle: 'italic' }}>* {it.nota}</div>
          )}
        </div>
      ))}
      {raya}
    </div>
  );
}
