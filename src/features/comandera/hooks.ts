import { useQuery } from '@tanstack/react-query';
import { fetchPedidosComandera } from './api';
import type { ItemConProducto } from '../pedidos/hooks';

// Cada tanda mandada con "Enviar a cocina" queda numerada (pedido_items.ronda)
// -- acá se arma un ticket por ronda en vez de uno por pedido, para que la
// comandera no mezcle items ya entregados con los de una tanda nueva.
export type TicketComandera = {
  key: string;
  pedidoId: number;
  ronda: number;
  mesaLabel: string;
  enviadoAt: string | null;
  entregado: boolean;
  items: ItemConProducto[];
};

export function usePedidosComandera() {
  return useQuery({
    queryKey: ['comandera'],
    queryFn: fetchPedidosComandera,
    refetchInterval: 10000,
    select: (pedidos): TicketComandera[] => {
      const tickets: TicketComandera[] = [];
      for (const p of pedidos as unknown as {
        id: number;
        mesa_id: number | null;
        mesas: { label: string | null } | null;
        pedido_items: ItemConProducto[];
      }[]) {
        const porRonda = new Map<number, ItemConProducto[]>();
        for (const it of p.pedido_items) {
          if (it.ronda == null) continue;
          if (!porRonda.has(it.ronda)) porRonda.set(it.ronda, []);
          porRonda.get(it.ronda)!.push(it);
        }
        for (const [ronda, items] of porRonda) {
          tickets.push({
            key: `${p.id}-${ronda}`,
            pedidoId: p.id,
            ronda,
            mesaLabel: p.mesas?.label ?? String(p.mesa_id),
            enviadoAt: items[0]?.enviado_cocina_at ?? null,
            entregado: items.every((it) => it.entregado),
            items,
          });
        }
      }
      tickets.sort((a, b) => new Date(a.enviadoAt ?? 0).getTime() - new Date(b.enviadoAt ?? 0).getTime());
      return tickets;
    },
  });
}
