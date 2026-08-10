import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generarGraficoTorta } from '../../lib/pieChart';
import type { Database } from '../../lib/supabase/types';

type Turno = Database['public']['Tables']['turnos']['Row'];
type PerfilNegocio = Database['public']['Tables']['perfil_negocio']['Row'] | null;
type Venta = Database['public']['Tables']['ventas']['Row'] & {
  mesas: { label: string | null } | null;
  clientes: { nombre: string; apellido: string } | null;
};
type Insumo = Database['public']['Tables']['insumos']['Row'];

const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export function generarPdfCierre(params: {
  turno: Turno;
  perfil: PerfilNegocio;
  ventas: Venta[];
  facturado: number;
  mesasPendientes: { mesa_id: number | null; estado: string; mesas: { label: string | null } | null }[];
  insumosBajo: Insumo[];
}): Blob {
  const { turno, perfil, ventas, facturado, mesasPendientes, insumosBajo } = params;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 18;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(perfil?.nombre_fiscal || 'ComandaCafé', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  y += 6;
  const datosNegocio = [perfil?.cuit && `CUIT ${perfil.cuit}`, perfil?.direccion, perfil?.telefono, perfil?.email]
    .filter(Boolean)
    .join(' · ');
  if (datosNegocio) {
    doc.text(datosNegocio, 14, y);
    y += 6;
  }

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  y += 4;
  doc.text(`Cierre de turno — ${turno.etiqueta}`, 14, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y += 6;
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 14, y);
  y += 10;

  doc.setFontSize(11);
  doc.text(`Mesas cobradas: ${ventas.length}`, 14, y);
  doc.text(`Total facturado: ${fmt.format(facturado)}`, 90, y);
  y += 7;
  doc.text(`Mesas pendientes: ${mesasPendientes.length}`, 14, y);
  y += 10;

  // Gráfico de torta por método de pago
  const porMetodo = new Map<string, number>();
  for (const v of ventas) porMetodo.set(v.metodo_pago, (porMetodo.get(v.metodo_pago) ?? 0) + Number(v.total));
  if (porMetodo.size > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Ventas por método de pago', 14, y);
    doc.setFont('helvetica', 'normal');
    y += 4;
    const dataUrl = generarGraficoTorta([...porMetodo.entries()].map(([label, valor]) => ({ label, valor })));
    doc.addImage(dataUrl, 'PNG', 14, y, 76, 76);
    y += 82;
  }

  // Detalle de ventas
  doc.setFont('helvetica', 'bold');
  doc.text('Detalle de ventas del turno', 14, y);
  y += 4;
  if (ventas.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Todavía no se cobró ninguna mesa en este turno.', 14, y + 4);
    y += 10;
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Mesa', 'Hora', 'Cliente', 'Total', 'Pago']],
      body: ventas.map((v) => [
        v.mesas?.label ?? String(v.mesa_id ?? 'Take away'),
        new Date(v.created_at).toLocaleTimeString('es-AR'),
        v.clientes ? `${v.clientes.nombre} ${v.clientes.apellido}` : '—',
        fmt.format(Number(v.total)),
        v.metodo_pago,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [193, 102, 59] },
      margin: { left: 14, right: 14 },
    });
    // @ts-expect-error jspdf-autotable adjunta lastAutoTable al doc en runtime
    y = doc.lastAutoTable.finalY + 10;
  }

  if (mesasPendientes.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Mesas pendientes', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    y += 6;
    doc.text(mesasPendientes.map((p) => `Mesa ${p.mesas?.label ?? p.mesa_id}`).join(' · '), 14, y);
    y += 10;
  }

  if (insumosBajo.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Insumos con stock bajo', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    y += 6;
    for (const i of insumosBajo) {
      doc.text(`- ${i.nombre}: ${i.stock} ${i.unidad} (mínimo ${i.stock_min})`, 14, y);
      y += 5;
    }
  }

  return doc.output('blob');
}
