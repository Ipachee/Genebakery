import { getTicketConfig } from '../../../lib/ticketConfig';
import { fmtMoney as fmt } from '../../../lib/format';
import type { ItemConProducto } from '../../pedidos/hooks';
import type { Database } from '../../../lib/supabase/types';

type PerfilNegocio = Database['public']['Tables']['perfil_negocio']['Row'] | null;

const LABEL_TIPO: Record<string, string> = { factura_a: 'A', factura_b: 'B', factura_c: 'C' };
const CBTE_TIPO: Record<string, number> = { factura_a: 1, factura_b: 6, factura_c: 11 };
// La condición de IVA del comprador se infiere del tipo de comprobante
// elegido (no es un dato que se cargue por cliente hoy): Factura A es
// exclusiva para Responsable Inscripto, B/C cubren el resto.
const COND_IVA_COMPRADOR: Record<string, string> = {
  factura_a: 'Responsable Inscripto',
  factura_b: 'Consumidor Final',
  factura_c: 'Consumidor Final',
};

export function FacturaTicket({
  tipoComprobante,
  puntoVenta,
  numero,
  cae,
  caeVencimiento,
  clienteNombre,
  clienteCuitDni,
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
  clienteCuitDni: string | null;
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
  const raya = <hr style={{ border: 'none', borderTop: '1.5px dashed #000', margin: '10px 0' }} />;
  const letra = LABEL_TIPO[tipoComprobante] ?? '?';

  return (
    <div className="ticket-print" style={{ width: anchoPx, fontFamily, fontSize: cfg.tamano, color: '#000', padding: '22px 18px 26px' }}>
      <style>{`@page { size: ${cfg.ancho}mm auto; margin: 2mm; }`}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, justifyContent: 'center' }}>
        <div
          style={{
            border: '2px solid #000',
            width: 34,
            height: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          {letra}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: cfg.tamano + 6, letterSpacing: '0.06em' }}>{cfg.nombreLocal.toUpperCase()}</div>
          {perfil?.cuit && <div style={{ fontSize: cfg.tamano - 2 }}>CUIT {perfil.cuit}</div>}
          {perfil?.condicion_iva && <div style={{ fontSize: cfg.tamano - 2 }}>{perfil.condicion_iva}</div>}
        </div>
      </div>
      <div style={{ width: '100%', height: 1.5, background: '#000', margin: '10px 0 8px' }} />

      <div style={{ fontSize: cfg.tamano, display: 'flex', justifyContent: 'space-between' }}>
        <span>Punto de venta {String(puntoVenta).padStart(4, '0')}</span>
        <span>N.° {String(numero).padStart(8, '0')}</span>
      </div>
      <div style={{ fontSize: cfg.tamano }}>
        {fecha.toLocaleDateString('es-AR')} {fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
      </div>
      {raya}

      <div style={{ fontSize: cfg.tamano, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {clienteNombre && <div>Cliente: {clienteNombre}</div>}
        {clienteCuitDni && <div>CUIT/DNI: {clienteCuitDni}</div>}
        <div>Cond. IVA: {COND_IVA_COMPRADOR[tipoComprobante] ?? 'Consumidor Final'}</div>
        <div>Cond. venta: Contado</div>
      </div>
      {raya}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: cfg.tamano }}>
        <div style={{ display: 'grid', gridTemplateColumns: '14% 46% 20% 20%', fontWeight: 700 }}>
          <span>Cant.</span>
          <span>Descripción</span>
          <span style={{ textAlign: 'right' }}>SubTot.</span>
          <span style={{ textAlign: 'right' }}>Total</span>
        </div>
        {items.map((it) => (
          <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '14% 46% 20% 20%' }}>
            <span>{it.cantidad}</span>
            <span>{it.productos?.nombre ?? `Producto #${it.producto_id}`}</span>
            <span style={{ textAlign: 'right' }}>{fmt.format(Number(it.precio_unitario))}</span>
            <span style={{ textAlign: 'right' }}>{fmt.format(Number(it.precio_unitario) * Number(it.cantidad))}</span>
          </div>
        ))}
      </div>
      {raya}
      <div style={{ height: 10 }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: cfg.tamano + 6, marginTop: 6 }}>
        <span>Total</span>
        <span>{fmt.format(total)}</span>
      </div>
      <div style={{ fontSize: cfg.tamano }}>{metodoPago}</div>
      {raya}

      <div style={{ fontSize: cfg.tamano - 2 }}>
        <div>CAE: {cae}</div>
        <div>Vto. CAE: {new Date(`${caeVencimiento}T00:00:00`).toLocaleDateString('es-AR')}</div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <img src={qrDataUrl} alt="QR de verificación en ARCA" width={120} height={120} />
      </div>
      <div style={{ textAlign: 'center', fontSize: cfg.tamano - 1, marginTop: 8 }}>{cfg.pie}</div>
    </div>
  );
}

export { CBTE_TIPO };
