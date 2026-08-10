import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePedidosComandera } from '../hooks';
import { marcarEntregado } from '../../pedidos/api';
import { TicketImprimible } from './TicketImprimible';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { EmptyState } from '../../../components/EmptyState';
import type { PedidoConItems } from '../../pedidos/hooks';

function useCronometro(desde: string | null) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!desde) return '—';
  const s = Math.max(0, Math.floor((ahora - new Date(desde).getTime()) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function ComanderaView() {
  const { data: pedidos, isLoading } = usePedidosComandera();
  const qc = useQueryClient();
  const [imprimiendo, setImprimiendo] = useState<{ pedido: PedidoConItems; mesaLabel: string } | null>(null);

  const marcar = useMutation({
    mutationFn: (pedidoId: number) => marcarEntregado(pedidoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comandera'] });
      qc.invalidateQueries({ queryKey: ['mesas-ocupadas'] });
      qc.invalidateQueries({ queryKey: ['pedido-mesa'] });
    },
  });

  useEffect(() => {
    if (!imprimiendo) return;
    const id = requestAnimationFrame(() => window.print());
    const limpiar = () => setImprimiendo(null);
    window.addEventListener('afterprint', limpiar);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('afterprint', limpiar);
    };
  }, [imprimiendo]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader
        title="Comandera — pedidos enviados a cocina/barra"
        subtitle="Estas comandas son solo para cocina/barra (sin precios, sin cobro). El cobro se hace desde la mesa con el botón Cobrar, que recién ahí descuenta los insumos y libera la mesa."
      />

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !pedidos?.length ? (
        <EmptyState>Todavía no se enviaron pedidos.</EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {(pedidos as unknown as (PedidoConItems & { mesas: { label: string | null } | null })[]).map((p) => (
            <PedidoComandera
              key={p.id}
              pedido={p}
              mesaLabel={p.mesas?.label ?? String(p.mesa_id)}
              onMarcarEntregado={() => marcar.mutate(p.id)}
              onImprimir={() => setImprimiendo({ pedido: p, mesaLabel: p.mesas?.label ?? String(p.mesa_id) })}
            />
          ))}
        </div>
      )}

      {imprimiendo && <TicketImprimible pedido={imprimiendo.pedido} mesaLabel={imprimiendo.mesaLabel} />}
    </div>
  );
}

function PedidoComandera({
  pedido,
  mesaLabel,
  onMarcarEntregado,
  onImprimir,
}: {
  pedido: PedidoConItems;
  mesaLabel: string;
  onMarcarEntregado: () => void;
  onImprimir: () => void;
}) {
  const tiempo = useCronometro(pedido.enviado_at);
  const entregado = pedido.estado === 'entregado';

  return (
    <div className="card card-pad" style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ minWidth: 90 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Mesa {mesaLabel}</div>
        <Badge tone={entregado ? 'good' : 'info'}>{entregado ? 'Entregado' : 'Enviado'}</Badge>
        <div style={{ marginTop: 6, fontVariantNumeric: 'tabular-nums', fontSize: 12.5, color: 'var(--text-dim)' }}>⏱ {tiempo}</div>
      </div>
      <div style={{ flex: 1, minWidth: 200, fontSize: 13.5 }}>
        {pedido.pedido_items.map((it) => (
          <div key={it.id} style={{ marginBottom: 3 }}>
            <strong>{it.cantidad}x</strong> {it.productos?.nombre ?? `#${it.producto_id}`}
            {it.nota && <span style={{ color: 'var(--text-dim)' }}> · {it.nota}</span>}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Button size="sm" onClick={onImprimir}>
          🖨️ Imprimir
        </Button>
        {!entregado && (
          <Button size="sm" variant="secondary" onClick={onMarcarEntregado}>
            ✅ Entregado
          </Button>
        )}
      </div>
    </div>
  );
}
