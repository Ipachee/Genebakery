import QRCode from 'qrcode';

// Armado según la especificación del QR obligatorio de ARCA (RG 4892):
// https://www.afip.gob.ar/fe/qr/documentos/QRespecificaciones.pdf
// -- un JSON con estos campos, en base64, colgado de esa URL fija.
export function urlQrFactura(v: {
  fecha: string; // YYYY-MM-DD
  cuit: string;
  ptoVta: number;
  tipoCmp: number;
  nroCmp: number;
  importe: number;
  tipoDocRec: number;
  nroDocRec: number;
  cae: string;
}): string {
  const payload = {
    ver: 1,
    fecha: v.fecha,
    cuit: Number(v.cuit),
    ptoVta: v.ptoVta,
    tipoCmp: v.tipoCmp,
    nroCmp: v.nroCmp,
    importe: v.importe,
    moneda: 'PES',
    ctz: 1,
    tipoDocRec: v.tipoDocRec,
    nroDocRec: v.nroDocRec,
    tipoCodAut: 'E',
    codAut: Number(v.cae),
  };
  const base64 = btoa(JSON.stringify(payload));
  return `https://www.afip.gob.ar/fe/qr/?p=${base64}`;
}

export function generarQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { margin: 1, width: 180 });
}
