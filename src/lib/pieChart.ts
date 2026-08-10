const COLORES = ['#c1663b', '#2f8f7f', '#d99a3d', '#3f6b8a', '#4a7c59', '#8d8375'];

/**
 * Dibuja un gráfico de torta simple en un canvas fuera de pantalla y devuelve
 * un data URL PNG, listo para insertar en el PDF con jsPDF.addImage. Sin
 * leyenda dentro de la imagen -- el PDF ya dibuja su propia leyenda en un
 * cuadro al lado (la leyenda acá adentro se cortaba con etiquetas largas).
 */
export function generarGraficoTorta(datos: { label: string; valor: number }[]): string {
  const size = 260;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  const total = datos.reduce((s, d) => s + d.valor, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;

  let anguloActual = -Math.PI / 2;
  datos.forEach((d, i) => {
    const porcion = d.valor / total;
    const anguloFin = anguloActual + porcion * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, anguloActual, anguloFin);
    ctx.closePath();
    ctx.fillStyle = COLORES[i % COLORES.length];
    ctx.fill();
    anguloActual = anguloFin;
  });

  return canvas.toDataURL('image/png');
}
