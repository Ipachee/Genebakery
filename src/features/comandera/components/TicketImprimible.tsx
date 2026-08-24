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
  const rayaSuave = { border: 'none', borderTop: '1.5px dashed #3b2418', opacity: 0.5 };

  return (
    <div className="ticket-print" style={{ width: anchoPx, background: '#fdfcf9', color: '#000', paddingBottom: 22 }}>
      {/* size: <ancho>mm auto -- el "auto" es lo que le dice al driver de
          la impresora que termine la página donde termina el contenido,
          en vez de tirar el largo de rollo que tenga de default (eso era
          lo que salía en blanco). */}
      <style>{`@page { size: ${cfg.ancho}mm auto; margin: 2mm; }`}</style>

      <div style={{ background: '#1c1c1c', color: '#fff', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontWeight: 800, fontSize: cfg.tamano + 8, letterSpacing: '0.05em' }}>COCINA/BARRA</span>
      </div>

      <div style={{ padding: '12px 16px 0', fontFamily, lineHeight: 1.15 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: cfg.tamano - 2, color: '#3b2418' }}>
          <span>{ahora.toLocaleDateString('es-AR')}</span>
          <span>{ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div style={{ fontWeight: 700, fontSize: cfg.tamano + 3, marginTop: 4, color: '#3b2418' }}>Mesa: {mesaLabel}</div>
        <hr style={{ ...rayaSuave, margin: '10px 0' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((it) => (
            <div key={it.id}>
              <div style={{ fontWeight: 800, fontSize: cfg.tamano + 8, color: '#000' }}>
                {it.cantidad}x {it.productos?.nombre ?? `Producto #${it.producto_id}`}
              </div>
              {it.nota && (
                <div style={{ paddingLeft: 20, fontSize: cfg.tamano + 2, fontStyle: 'italic', color: '#4a3a2e' }}>↳ {it.nota}</div>
              )}
            </div>
          ))}
        </div>
        <hr style={{ ...rayaSuave, margin: '14px 0 0' }} />
      </div>
    </div>
  );
}
