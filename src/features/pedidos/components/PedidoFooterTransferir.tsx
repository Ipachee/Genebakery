import { Button } from '../../../components/Button';
import { Select } from '../../../components/Field';
import type { Database } from '../../../lib/supabase/types';

type Mesa = Database['public']['Tables']['mesas']['Row'];

export function PedidoFooterTransferir({
  mesasDestinoOpciones,
  mesaDestino,
  onMesaDestino,
  totalUnidadesSeleccionadas,
  pendiente,
  error,
  onTransferir,
  onCancelar,
}: {
  mesasDestinoOpciones: Mesa[];
  mesaDestino: number | '';
  onMesaDestino: (id: number | '') => void;
  totalUnidadesSeleccionadas: number;
  pendiente: boolean;
  error: string | null;
  onTransferir: () => void;
  onCancelar: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: 0 }}>
        {totalUnidadesSeleccionadas > 0
          ? `Se transfieren ${totalUnidadesSeleccionadas} unidad(es).`
          : 'Sin elegir nada se transfiere la mesa entera.'}
      </p>
      <Select value={mesaDestino} onChange={(e) => onMesaDestino(e.target.value ? Number(e.target.value) : '')} style={{ fontSize: 12.5 }}>
        <option value="">Elegí la mesa destino…</option>
        {mesasDestinoOpciones.map((m) => (
          <option key={m.id} value={m.id}>
            Mesa {m.label ?? m.id}
          </option>
        ))}
      </Select>
      {error && <p style={{ color: 'var(--red)', fontSize: 11.5, margin: 0 }}>{error}</p>}
      <div className="pedido-actions">
        <Button block disabled={!mesaDestino || pendiente} onClick={onTransferir}>
          {totalUnidadesSeleccionadas > 0 ? `🔀 Transferir ${totalUnidadesSeleccionadas} unidad(es)` : '🔀 Transferir mesa completa'}
        </Button>
      </div>
      <Button variant="ghost" size="sm" onClick={onCancelar}>
        cancelar
      </Button>
    </div>
  );
}
