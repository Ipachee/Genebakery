import { getTicketConfig } from '../../../lib/ticketConfig';
import { fmtMoney as fmt } from '../../../lib/format';
import type { ItemConProducto } from '../hooks';
import type { Database } from '../../../lib/supabase/types';

type PerfilNegocio = Database['public']['Tables']['perfil_negocio']['Row'] | null;

// Nota: sin QR a propósito. En una factura AFIP de verdad el QR es
// obligatorio y apunta a la verificación fiscal real -- poner uno acá que
// no lleve a ningún lado sería un QR trucho. Se suma cuando se conecte la
// facturación electrónica real.
//
// Todo en negro puro (#000) a propósito: una impresora térmica imprime en
// blanco y negro nada más, y los colores más claros (el marrón/terracota
// que tenía antes) no llegan a marcar en el papel -- el ticket salía
// prácticamente en blanco.
export function TicketCobro({
  pedidoId,
  mesaLabel,
  atendidoPor,
  clienteNombre,
  items,
  subtotal,
  descuento,
  total,
  metodoPago,
  perfil,
}: {
  pedidoId: number;
  mesaLabel: string;
  atendidoPor: string | null;
  clienteNombre: string | null;
  items: ItemConProducto[];
  subtotal: number;
  descuento: number;
  total: number;
  metodoPago: string;
  perfil: PerfilNegocio;
}) {
  const cfg = getTicketConfig();
  const anchoPx = cfg.ancho === 58 ? 220 : 300;
  const fontFamily = cfg.fuente === 'mono' ? 'ui-monospace, Consolas, monospace' : 'Arial, sans-serif';
  const ahora = new Date();
  const raya = <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '4px 0' }} />;

  return (
    <div
      className="ticket-print"
      style={{
        width: anchoPx,
        fontFamily,
        fontSize: cfg.tamano,
        color: '#000',
        padding: '4px 6px',
      }}
    >
      {/* size: <ancho>mm auto -- sin esto la impresora térmica usa el
          largo de rollo por default del driver y tira papel en blanco
          después del contenido real (mismo bug que en TicketImprimible). */}
      <style>{`@page { size: ${cfg.ancho}mm auto; margin: 2mm; }`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: cfg.tamano + 6, letterSpacing: '0.03em' }}>
          {cfg.nombreLocal.toUpperCase()}
        </div>
        {perfil?.cuit && <div style={{ fontSize: cfg.tamano - 2 }}>CUIT {perfil.cuit}</div>}
        {perfil?.direccion && <div style={{ fontSize: cfg.tamano - 2 }}>{perfil.direccion}</div>}
        <div style={{ fontSize: cfg.tamano, fontWeight: 700, marginTop: 4 }}>
          COMPROBANTE N.° {String(pedidoId).padStart(8, '0')}
        </div>
      </div>

      <div style={{ fontSize: cfg.tamano }}>
        <div>Mesa: {mesaLabel}</div>
        {clienteNombre && <div>Cliente: {clienteNombre}</div>}
      </div>
      {raya}

      {items.map((it) => (
        <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: cfg.tamano }}>
          <span>
            {it.cantidad}x {it.productos?.nombre ?? `Producto #${it.producto_id}`}
          </span>
          <span>{fmt.format(Number(it.precio_unitario) * Number(it.cantidad))}</span>
        </div>
      ))}
      {raya}

      {descuento > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: cfg.tamano }}>
          <span>Subtotal</span>
          <span>{fmt.format(subtotal)}</span>
        </div>
      )}
      {descuento > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: cfg.tamano }}>
          <span>Descuento</span>
          <span>−{fmt.format(descuento)}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: cfg.tamano + 6, marginTop: 4 }}>
        <span>Total</span>
        <span>{fmt.format(total)}</span>
      </div>
      <div style={{ fontSize: cfg.tamano }}>{metodoPago}</div>
      {raya}

      <div style={{ fontSize: cfg.tamano - 2 }}>
        {ahora.toLocaleDateString('es-AR')} {ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
        {atendidoPor && ` · ${atendidoPor}`}
      </div>
      <div style={{ textAlign: 'center', fontSize: cfg.tamano - 1, marginTop: 4 }}>{cfg.pie}</div>
    </div>
  );
}
