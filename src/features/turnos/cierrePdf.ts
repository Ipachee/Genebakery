import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generarGraficoTorta } from '../../lib/pieChart';
import { fmtMoney as fmt } from '../../lib/format';
import type { Database } from '../../lib/supabase/types';

type Turno = Database['public']['Tables']['turnos']['Row'];
type PerfilNegocio = Database['public']['Tables']['perfil_negocio']['Row'] | null;
type Venta = Database['public']['Tables']['ventas']['Row'] & {
  mesas: { label: string | null } | null;
  clientes: { nombre: string; apellido: string } | null;
};
type Insumo = Database['public']['Tables']['insumos']['Row'];

type RGB = [number, number, number];

// Misma paleta que la app (src/styles/tokens.css), pasada a RGB porque jsPDF
// no entiende variables CSS.
const COLOR = {
  terracota: [193, 102, 59] as RGB,
  terracotaDark: [163, 78, 40] as RGB,
  brownDark: [59, 36, 24] as RGB,
  cream: [247, 236, 217] as RGB,
  creamDeep: [239, 223, 194] as RGB,
  amber: [217, 154, 61] as RGB,
  redSoft: [251, 232, 229] as RGB,
  red: [192, 57, 43] as RGB,
  gray: [141, 131, 117] as RGB,
  white: [255, 255, 255] as RGB,
};
const COLORES_METODO = ['#c1663b', '#2f8f7f', '#d99a3d', '#3f6b8a', '#4a7c59', '#8d8375'];

function hexRgb(hex: string): RGB {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const MARGIN = 14;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;

function ensureSpace(doc: jsPDF, y: number, necesario: number): number {
  if (y + necesario <= PAGE_H - 16) return y;
  doc.addPage();
  return 20;
}

function seccionHeader(doc: jsPDF, texto: string, y: number, color: RGB = COLOR.terracotaDark): number {
  doc.setFillColor(...color);
  doc.roundedRect(MARGIN, y, CONTENT_W, 7.5, 1.5, 1.5, 'F');
  doc.setTextColor(...COLOR.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(texto, MARGIN + 4, y + 5.3);
  doc.setTextColor(...COLOR.brownDark);
  return y + 7.5 + 5;
}

function statCard(doc: jsPDF, x: number, y: number, w: number, valor: string, label: string) {
  const h = 20;
  doc.setFillColor(...COLOR.creamDeep);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setFillColor(...COLOR.terracota);
  doc.rect(x, y, 1.6, h, 'F');
  doc.setTextColor(...COLOR.terracotaDark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(valor, x + 6, y + 10.5, { maxWidth: w - 10 });
  doc.setTextColor(...COLOR.gray);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(label, x + 6, y + 16.5);
  doc.setTextColor(...COLOR.brownDark);
}

function chipsRow(doc: jsPDF, items: string[], yInicial: number, fill: RGB, texto: RGB): number {
  let x = MARGIN;
  let y = yInicial;
  const maxX = MARGIN + CONTENT_W;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  for (const item of items) {
    const w = doc.getTextWidth(item) + 7;
    if (x + w > maxX) {
      x = MARGIN;
      y += 9;
    }
    doc.setFillColor(...fill);
    doc.roundedRect(x, y, w, 6.2, 1.5, 1.5, 'F');
    doc.setTextColor(...texto);
    doc.text(item, x + 3.5, y + 4.3);
    x += w + 3;
  }
  doc.setTextColor(...COLOR.brownDark);
  return y + 10;
}

export function generarPdfCierre(params: {
  turno: Turno;
  perfil: PerfilNegocio;
  ventas: Venta[];
  facturado: number;
  mesasPendientes: { mesa_id: number | null; estado: string; mesas: { label: string | null } | null }[];
  insumosBajo: Insumo[];
  efectivoContado: number | null;
}): Blob {
  const { turno, perfil, ventas, facturado, mesasPendientes, insumosBajo, efectivoContado } = params;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const nombreNegocio = perfil?.nombre_fiscal || 'ComandaCafé';

  // --- Membrete: banda de color con el nombre del negocio ---
  doc.setFillColor(...COLOR.terracota);
  doc.rect(0, 0, PAGE_W, 30, 'F');
  doc.setFillColor(...COLOR.terracotaDark);
  doc.rect(0, 28.5, PAGE_W, 1.5, 'F');
  doc.setTextColor(...COLOR.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(nombreNegocio, MARGIN, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Cierre de turno — ${turno.etiqueta} · ${new Date().toLocaleDateString('es-AR')}`, MARGIN, 21);
  const datosNegocio = [perfil?.cuit && `CUIT ${perfil.cuit}`, perfil?.direccion, perfil?.telefono, perfil?.email]
    .filter(Boolean)
    .join('   ·   ');
  if (datosNegocio) {
    doc.setFontSize(8);
    doc.text(datosNegocio, MARGIN, 26.5);
  }
  doc.setTextColor(...COLOR.brownDark);

  let y = 40;

  // --- Cuadros de resumen ---
  const gap = 6;
  const cardW = (CONTENT_W - gap * 2) / 3;
  statCard(doc, MARGIN, y, cardW, String(ventas.length), 'Mesas cobradas');
  statCard(doc, MARGIN + cardW + gap, y, cardW, fmt.format(facturado), 'Total facturado');
  statCard(doc, MARGIN + (cardW + gap) * 2, y, cardW, String(mesasPendientes.length), 'Mesas pendientes');
  y += 20 + 10;

  // --- Gráfico de torta por método de pago + lista en cuadro ---
  const porMetodo = new Map<string, number>();
  for (const v of ventas) porMetodo.set(v.metodo_pago, (porMetodo.get(v.metodo_pago) ?? 0) + Number(v.total));
  if (porMetodo.size > 0) {
    y = ensureSpace(doc, y, 80);
    y = seccionHeader(doc, 'Ventas por método de pago', y, COLOR.amber);
    const dataUrl = generarGraficoTorta([...porMetodo.entries()].map(([label, valor]) => ({ label, valor })));
    doc.addImage(dataUrl, 'PNG', MARGIN, y, 60, 60);

    const listaX = MARGIN + 68;
    const listaW = CONTENT_W - 68;
    doc.setFillColor(...COLOR.cream);
    doc.roundedRect(listaX, y, listaW, 60, 2, 2, 'F');
    let ly = y + 10;
    const totalMetodos = [...porMetodo.values()].reduce((s, v) => s + v, 0) || 1;
    [...porMetodo.entries()].forEach(([metodo, total], i) => {
      const rgb = hexRgb(COLORES_METODO[i % COLORES_METODO.length]);
      const pct = Math.round((total / totalMetodos) * 100);
      doc.setFillColor(...rgb);
      doc.roundedRect(listaX + 5, ly - 3.4, 4, 4, 1, 1, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLOR.brownDark);
      doc.text(`${metodo} (${pct}%)`, listaX + 12, ly);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLOR.terracotaDark);
      doc.text(fmt.format(total), listaX + listaW - 5, ly, { align: 'right' });
      ly += 10;
    });
    doc.setTextColor(...COLOR.brownDark);
    y += 60 + 10;
  }

  // --- Arqueo de caja (solo si se registró fondo inicial o conteo final) ---
  if (turno.efectivo_apertura != null || efectivoContado != null) {
    const efectivoCobrado = porMetodo.get('Efectivo') ?? 0;
    const efectivoApertura = Number(turno.efectivo_apertura ?? 0);
    const efectivoEsperado = efectivoApertura + efectivoCobrado;
    const filas: [string, string, boolean][] = [
      ['Fondo inicial', fmt.format(efectivoApertura), false],
      ['+ Efectivo cobrado', fmt.format(efectivoCobrado), false],
      ['= Debería haber', fmt.format(efectivoEsperado), true],
    ];
    if (efectivoContado != null) {
      const diferencia = efectivoContado - efectivoEsperado;
      filas.push(['Contado', fmt.format(efectivoContado), false]);
      filas.push([
        diferencia === 0 ? 'Coincide' : diferencia > 0 ? 'Sobran' : 'Faltan',
        fmt.format(Math.abs(diferencia)),
        true,
      ]);
    }
    const alto = 6 + filas.length * 7;
    y = ensureSpace(doc, y, alto + 12);
    y = seccionHeader(doc, 'Arqueo de caja', y, COLOR.amber);
    doc.setFillColor(...COLOR.cream);
    doc.roundedRect(MARGIN, y, CONTENT_W, alto, 2, 2, 'F');
    let fy = y + 8;
    filas.forEach(([label, valor, destacado], i) => {
      const esUltima = i === filas.length - 1 && efectivoContado != null;
      doc.setFont('helvetica', destacado ? 'bold' : 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLOR.brownDark);
      doc.text(label, MARGIN + 5, fy);
      doc.setTextColor(...(esUltima ? (efectivoContado! - efectivoEsperado < 0 ? COLOR.red : COLOR.terracotaDark) : COLOR.brownDark));
      doc.text(valor, MARGIN + CONTENT_W - 5, fy, { align: 'right' });
      fy += 7;
    });
    doc.setTextColor(...COLOR.brownDark);
    y += alto + 10;
  }

  // --- Detalle de ventas ---
  y = ensureSpace(doc, y, 30);
  y = seccionHeader(doc, 'Detalle de ventas del turno', y);
  if (ventas.length === 0) {
    doc.setFillColor(...COLOR.cream);
    doc.roundedRect(MARGIN, y, CONTENT_W, 12, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLOR.gray);
    doc.text('Todavía no se cobró ninguna mesa en este turno.', MARGIN + 5, y + 7.5);
    doc.setTextColor(...COLOR.brownDark);
    y += 12 + 8;
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
      theme: 'striped',
      styles: { fontSize: 9, textColor: COLOR.brownDark, lineColor: COLOR.creamDeep },
      headStyles: { fillColor: COLOR.terracota, textColor: COLOR.white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: COLOR.cream },
      margin: { left: MARGIN, right: MARGIN },
    });
    // @ts-expect-error jspdf-autotable adjunta lastAutoTable al doc en runtime
    y = doc.lastAutoTable.finalY + 10;
  }

  // --- Mesas pendientes ---
  if (mesasPendientes.length > 0) {
    y = ensureSpace(doc, y, 24);
    y = seccionHeader(doc, 'Mesas pendientes', y, COLOR.amber);
    y = chipsRow(
      doc,
      mesasPendientes.map((p) => `Mesa ${p.mesas?.label ?? p.mesa_id}`),
      y,
      COLOR.creamDeep,
      COLOR.terracotaDark
    );
    y += 4;
  }

  // --- Insumos con stock bajo ---
  if (insumosBajo.length > 0) {
    y = ensureSpace(doc, y, 24);
    y = seccionHeader(doc, 'Insumos con stock bajo', y, COLOR.red);
    y = chipsRow(
      doc,
      insumosBajo.map((i) => `${i.nombre} — ${i.stock} ${i.unidad}`),
      y,
      COLOR.redSoft,
      COLOR.red
    );
    y += 4;
  }

  // --- Pie de página ---
  y = ensureSpace(doc, y, 10);
  doc.setDrawColor(...COLOR.creamDeep);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR.gray);
  doc.text(`Generado automáticamente por ComandaCafé el ${new Date().toLocaleString('es-AR')}`, MARGIN, y + 5);

  return doc.output('blob');
}
