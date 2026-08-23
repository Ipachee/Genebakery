import { getTicketConfig } from '../../../lib/ticketConfig';
import { fmtMoney as fmt } from '../../../lib/format';
import type { ItemConProducto } from '../../pedidos/hooks';
import type { Database } from '../../../lib/supabase/types';

type PerfilNegocio = Database['public']['Tables']['perfil_negocio']['Row'] | null;

const LABEL_TIPO: Record<string, string> = { factura_a: 'A', factura_b: 'B', factura_c: 'C' };
const CBTE_TIPO: Record<string, number> = { factura_a: 1, factura_b: 6, factura_c: 11 };

export function FacturaTicket({
  tipoComprobante,
  puntoVenta,
  numero,
  cae,
  caeVencimiento,
  clienteNombre,
  items,
  total,
  metodoPago,
  perfil,
  fecha,
  qrDataUrl,
}: {
  tipoComprobante: string;
  puntoVenta: number;
  numero: number;
  cae: string;
  caeVencimiento: string;
  clienteNombre: string | null;
  items: ItemConProducto[];
  total: number;
  metodoPago: string;
  perfil: PerfilNegocio;
  fecha: Date;
  /** Generado async (la librería de QR devuelve una promesa) -- el padre
   * lo arma ANTES de mostrar este componente para imprimir, así no hay
   * que esperar nada acá adentro ni arriesgarse a imprimir sin el QR. */
  qrDataUrl: string;
}) {
  const cfg = getTicketConfig();
  const anchoPx = cfg.ancho === 58 ? 220 : 300;
  const fontFamily = cfg.fuente === 'mono' ? 'ui-monospace, Consolas, monospace' : 'Arial, sans-serif';
  const raya = <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '4px 0' }} />;

  return (
    <div className="ticket-print" style={{ width: anchoPx, fontFamily, fontSize: cfg.tamano, color: '#000', padding: '4px 6px' }}>
      <style>{`@page { size: ${cfg.ancho}mm auto; margin: 2mm; }`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: cfg.tamano + 6, letterSpacing: '0.03em' }}>{cfg.nombreLocal.toUpperCase()}</div>
        {perfil?.cuit && <div style={{ fontSize: cfg.tamano - 2 }}>CUIT {perfil.cuit}</div>}
        {perfil?.direccion && <div style={{ fontSize: cfg.tamano - 2 }}>{perfil.direccion}</div>}
        {perfil?.condicion_iva && <div style={{ fontSize: cfg.tamano - 2 }}>{perfil.condicion_iva}</div>}
        <div
          style={{
            display: 'inline-block',
            border: '1px solid #000',
            borderRadius: 4,
            padding: '1px 8px',
            fontWeight: 700,
            fontSize: cfg.tamano + 2,
            marginTop: 4,
          }}
        >
          FACTURA {LABEL_TIPO[tipoComprobante] ?? '?'}
        </div>
        <div style={{ fontSize: cfg.tamano, fontWeight: 700, marginTop: 2 }}>
          {String(puntoVenta).padStart(5, '0')}-{String(numero).padStart(8, '0')}
        </div>
      </div>
      {raya}

      <div style={{ fontSize: cfg.tamano }}>
        {clienteNombre && <div>Cliente: {clienteNombre}</div>}
        <div>Fecha: {fecha.toLocaleDateString('es-AR')}</div>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: cfg.tamano + 6 }}>
        <span>Total</span>
        <span>{fmt.format(total)}</span>
      </div>
      <div style={{ fontSize: cfg.tamano }}>{metodoPago}</div>
      {raya}

      <div style={{ fontSize: cfg.tamano - 2 }}>
        <div>CAE: {cae}</div>
        <div>Vto. CAE: {new Date(`${caeVencimiento}T00:00:00`).toLocaleDateString('es-AR')}</div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 6 }}>
        <img src={qrDataUrl} alt="QR de verificación en ARCA" width={120} height={120} />
      </div>
      <div style={{ textAlign: 'center', fontSize: cfg.tamano - 1, marginTop: 4 }}>{cfg.pie}</div>
    </div>
  );
}

export { CBTE_TIPO };
