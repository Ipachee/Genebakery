import type { ItemConProducto } from './hooks';

// Los items ya enviados a cocina se agrupan por producto+nota para mostrar
// una sola fila con la cantidad sumada (aunque vengan de rondas distintas) --
// mostrar "Agua mineral" repetida 3 veces por 3 rondas distintas era
// confuso. `lineas` guarda las filas reales (id + cantidad) detrás del
// agrupado, porque una transferencia parcial (ej. 1 de 2 budines) necesita
// saber de cuál fila concreta sacar la unidad.
export type GrupoEnviado = {
  key: string;
  nombre: string;
  cantidad: number;
  entregado: boolean;
  lineas: { id: number; cantidad: number }[];
};

export function agruparEnviados(items: ItemConProducto[]): GrupoEnviado[] {
  const grupos = new Map<string, GrupoEnviado>();
  for (const it of items) {
    if (!it.enviado_cocina) continue;
    const key = `${it.producto_id}-${it.nota ?? ''}`;
    const prev = grupos.get(key);
    if (prev) {
      prev.cantidad += Number(it.cantidad);
      prev.entregado = prev.entregado && it.entregado;
      prev.lineas.push({ id: it.id, cantidad: Number(it.cantidad) });
    } else {
      grupos.set(key, {
        key,
        nombre: it.productos?.nombre ?? `Producto #${it.producto_id}`,
        cantidad: Number(it.cantidad),
        entregado: it.entregado,
        lineas: [{ id: it.id, cantidad: Number(it.cantidad) }],
      });
    }
  }
  return [...grupos.values()];
}

// Si una fila tiene más cantidad de la elegida, hay que decidir de cuáles
// líneas (rondas) sacar las unidades -- se toma en orden hasta completar lo
// pedido; transferirItems del lado del servidor parte la última línea
// tocada si hace falta.
export function partirLineas(lineas: { id: number; cantidad: number }[], cantidad: number) {
  const resultado: { itemId: number; cantidad: number }[] = [];
  let restante = cantidad;
  for (const linea of lineas) {
    if (restante <= 0) break;
    const tomar = Math.min(restante, linea.cantidad);
    resultado.push({ itemId: linea.id, cantidad: tomar });
    restante -= tomar;
  }
  return resultado;
}
