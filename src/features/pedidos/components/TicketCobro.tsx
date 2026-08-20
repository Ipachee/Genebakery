import { getTicketConfig } from '../../../lib/ticketConfig';
import { fmtMoney as fmt } from '../../../lib/format';
import type { ItemConProducto } from '../hooks';
import type { Database } from '../../../lib/supabase/types';

type PerfilNegocio = Database['public']['Tables']['perfil_negocio']['Row'] | null;

// Nota: sin QR a propósito. En una factura AFIP de verdad el QR es
// obligatorio y apunta a la verificación fiscal real -- poner uno acá que
// no lleve a ningún lado sería un QR trucho. Se suma cuando se conecte la
// facturación electrónica real.
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
  const marron = '#3b2418';
  const terracota = '#a34e28';

  return (
    <div
      className="ticket-print"
      style={{
        width: anchoPx,
        fontFamily,
        fontSize: cfg.tamano,
        color: marron,
        padding: '10px 10px 14px',
        border: `1px solid ${marron}`,
        borderRadius: 8,
      }}
    >
      {/* size: <ancho>mm auto -- sin esto la impresora térmica usa el
          largo de rollo por default del driver y tira papel en blanco
          después del contenido real (mismo bug que en TicketImprimible). */}
      <style>{`@page { size: ${cfg.ancho}mm auto; margin: 2mm; }`}</style>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#f7ecd9',
            border: `1px solid ${terracota}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            margin: '0 auto 6px',
          }}
        >
          ☕
        </div>
        <div style={{ fontWeight: 700, fontSize: cfg.tamano + 5, letterSpacing: '0.03em', color: terracota }}>
          {cfg.nombreLocal.toUpperCase()}
        </div>
        {perfil?.cuit && <div style={{ fontSize: cfg.tamano - 3, marginTop: 2 }}>CUIT {perfil.cuit}</div>}
        {perfil?.direccion && <div style={{ fontSize: cfg.tamano - 3 }}>{perfil.direccion}</div>}
        <div style={{ fontSize: cfg.tamano - 1, fontWeight: 700, marginTop: 8 }}>COMPROBANTE</div>
        <div style={{ fontSize: cfg.tamano, fontWeight: 700 }}>N.° {String(pedidoId).padStart(8, '0')}</div>
      </div>

      <div style={{ margin: '10px 0', fontSize: cfg.tamano - 1 }}>
        <div>
          <strong>Mesa:</strong> {mesaLabel}
        </div>
        {clienteNombre && (
          <div>
            <strong>Cliente:</strong> {clienteNombre}
          </div>
        )}
      </div>
      <hr style={{ border: 'none', borderTop: `1px solid ${marron}` }} />

      <table style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0', fontSize: cfg.tamano - 1 }}>
        <thead>
          <tr style={{ color: terracota, textAlign: 'left' }}>
            <th style={{ padding: '2px 0', fontWeight: 700 }}>CANT</th>
            <th style={{ padding: '2px 0', fontWeight: 700 }}>DETALLE</th>
            <th style={{ padding: '2px 0', fontWeight: 700, textAlign: 'right' }}>PRECIO</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} style={{ verticalAlign: 'top' }}>
              <td style={{ padding: '3px 4px 3px 0' }}>{it.cantidad}</td>
              <td style={{ padding: '3px 4px' }}>
                <div>{it.productos?.nombre ?? `Producto #${it.producto_id}`}</div>
                <div style={{ fontSize: cfg.tamano - 3, color: '#7a6f60' }}>
                  PUnit. {fmt.format(Number(it.precio_unitario))}
                </div>
              </td>
              <td style={{ padding: '3px 0', textAlign: 'right' }}>
                {fmt.format(Number(it.precio_unitario) * Number(it.cantidad))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr style={{ border: 'none', borderTop: `1px solid ${marron}` }} />

      {descuento > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: cfg.tamano - 1, margin: '6px 0 0' }}>
          <span>Subtotal</span>
          <span>{fmt.format(subtotal)}</span>
        </div>
      )}
      {descuento > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: cfg.tamano - 1, margin: '2px 0' }}>
          <span>Descuento</span>
          <span>−{fmt.format(descuento)}</span>
        </div>
      )}

      <div style={{ textAlign: 'center', margin: '10px 0 4px' }}>
        <div style={{ fontSize: cfg.tamano - 1 }}>Total</div>
        <div style={{ fontSize: cfg.tamano + 10, fontWeight: 700 }}>{fmt.format(total)}</div>
      </div>
      <div style={{ textAlign: 'center', fontSize: cfg.tamano - 1 }}>{metodoPago}</div>

      <hr style={{ border: 'none', borderTop: `1px solid ${marron}`, marginTop: 10 }} />
      <div style={{ fontSize: cfg.tamano - 3, marginTop: 6 }}>
        <div>
          Creado: {ahora.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          {' · '}
          {ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
        </div>
        {atendidoPor && <div>Le atendió: {atendidoPor}</div>}
      </div>

      <div style={{ textAlign: 'center', marginTop: 10, fontSize: cfg.tamano - 1, fontStyle: 'italic' }}>{cfg.pie}</div>
    </div>
  );
}
