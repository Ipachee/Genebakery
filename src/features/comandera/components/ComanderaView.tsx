import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePedidosComandera, type TicketComandera } from '../hooks';
import { desmarcarRondaEntregada, marcarRondaEntregada } from '../api';
import { TicketImprimible } from './TicketImprimible';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { EmptyState } from '../../../components/EmptyState';

// Umbrales para el color de urgencia del ticket: normal hasta los 8min,
// ámbar de 8 a 15min, rojo pasados los 15min -- se cuenta desde que se
// mandó a cocina, no desde que se creó el pedido.
const SEGUNDOS_AMBAR = 8 * 60;
const SEGUNDOS_ROJO = 15 * 60;

function useCronometro(desde: string | null) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!desde) return { texto: '—', segundos: 0 };
  const s = Math.max(0, Math.floor((ahora - new Date(desde).getTime()) / 1000));
  const texto = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return { texto, segundos: s };
}

export function ComanderaView() {
  const { data: tickets, isLoading } = usePedidosComandera();
  const qc = useQueryClient();
  const [imprimiendo, setImprimiendo] = useState<TicketComandera | null>(null);
  // null = todavía no se cargaron comandas por primera vez. Los tickets que
  // ya estaban ahí en esa primera carga se dan por "vistos" sin imprimirlos
  // solos (si se recarga esta pantalla a mitad del día, no hace falta
  // reimprimir todo lo que ya está en curso) -- de ahí en más, cualquier
  // ticket nuevo que aparezca en un refetch se imprime automático, sin que
  // nadie tenga que tocar el botón. Se guarda en memoria (no localStorage) a
  // propósito: si esta pantalla se recarga, es preferible arrancar de cero
  // (como mucho reimprime algo que ya salió) a arrastrar un registro viejo
  // para siempre.
  const impresosRef = useRef<Set<string> | null>(null);
  const colaRef = useRef<TicketComandera[]>([]);

  const invalidarTodo = () => {
    qc.invalidateQueries({ queryKey: ['comandera'] });
    qc.invalidateQueries({ queryKey: ['mesas-ocupadas'] });
    qc.invalidateQueries({ queryKey: ['pedido-mesa'] });
  };
  const marcar = useMutation({
    mutationFn: (t: { pedidoId: number; ronda: number }) => marcarRondaEntregada(t.pedidoId, t.ronda),
    onSuccess: invalidarTodo,
  });
  const desmarcar = useMutation({
    mutationFn: (t: { pedidoId: number; ronda: number }) => desmarcarRondaEntregada(t.pedidoId, t.ronda),
    onSuccess: invalidarTodo,
  });

  useEffect(() => {
    if (!tickets) return;
    if (impresosRef.current === null) {
      impresosRef.current = new Set(tickets.map((t) => t.key));
      return;
    }
    const nuevos = tickets.filter((t) => !impresosRef.current!.has(t.key));
    if (nuevos.length === 0) return;
    for (const t of nuevos) impresosRef.current.add(t.key);
    colaRef.current.push(...nuevos);
    setImprimiendo((actual) => actual ?? colaRef.current.shift() ?? null);
  }, [tickets]);

  useEffect(() => {
    if (!imprimiendo) return;
    const id = requestAnimationFrame(() => window.print());
    const siguiente = () => setImprimiendo(colaRef.current.shift() ?? null);
    window.addEventListener('afterprint', siguiente);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('afterprint', siguiente);
    };
  }, [imprimiendo]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader
        title="Comandera — pedidos enviados a cocina/barra"
      />

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !tickets?.length ? (
        <EmptyState>Todavía no se enviaron pedidos.</EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {tickets.map((t) => (
            <TicketComanda
              key={t.key}
              ticket={t}
              onMarcarEntregado={() => marcar.mutate({ pedidoId: t.pedidoId, ronda: t.ronda })}
              onDesmarcarEntregado={() => desmarcar.mutate({ pedidoId: t.pedidoId, ronda: t.ronda })}
              onImprimir={() => setImprimiendo(t)}
            />
          ))}
        </div>
      )}

      {imprimiendo && (
        <TicketImprimible items={imprimiendo.items} mesaLabel={imprimiendo.mesaLabel} horaIso={imprimiendo.enviadoAt} />
      )}
    </div>
  );
}

function TicketComanda({
  ticket,
  onMarcarEntregado,
  onDesmarcarEntregado,
  onImprimir,
}: {
  ticket: TicketComandera;
  onMarcarEntregado: () => void;
  onDesmarcarEntregado: () => void;
  onImprimir: () => void;
}) {
  const { texto: tiempo, segundos } = useCronometro(ticket.enviadoAt);
  // La urgencia por tiempo solo tiene sentido mientras el ticket sigue
  // esperando -- uno ya entregado no necesita llamar la atención aunque
  // haya tardado.
  const urgencia = ticket.entregado ? 'normal' : segundos >= SEGUNDOS_ROJO ? 'rojo' : segundos >= SEGUNDOS_AMBAR ? 'ambar' : 'normal';
  const colorBorde = urgencia === 'rojo' ? 'var(--red)' : urgencia === 'ambar' ? 'var(--amber)' : 'var(--border)';
  const colorFondo = urgencia === 'rojo' ? 'var(--red-soft)' : urgencia === 'ambar' ? 'var(--amber-soft)' : undefined;

  return (
    <div
      className="card card-pad"
      style={{
        display: 'flex',
        gap: 'var(--space-4)',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        borderColor: colorBorde,
        borderWidth: urgencia === 'normal' ? undefined : 2,
        background: colorFondo,
      }}
    >
      <div style={{ minWidth: 90 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Mesa {ticket.mesaLabel}</div>
        {ticket.ronda > 1 && (
          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Ronda {ticket.ronda}</div>
        )}
        <Badge tone={ticket.entregado ? 'good' : 'info'}>{ticket.entregado ? 'Entregado' : 'Enviado'}</Badge>
        <div
          style={{
            marginTop: 6,
            fontVariantNumeric: 'tabular-nums',
            fontSize: 12.5,
            fontWeight: urgencia === 'normal' ? undefined : 700,
            color: urgencia === 'rojo' ? 'var(--red)' : urgencia === 'ambar' ? 'var(--amber)' : 'var(--text-dim)',
          }}
        >
          ⏱ {tiempo}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 200, fontSize: 13.5 }}>
        {ticket.items.map((it) => (
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
        {!ticket.entregado ? (
          <Button size="sm" variant="secondary" onClick={onMarcarEntregado}>
            ✅ Entregado
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={onDesmarcarEntregado}>
            ↩ Deshacer
          </Button>
        )}
      </div>
    </div>
  );
}
