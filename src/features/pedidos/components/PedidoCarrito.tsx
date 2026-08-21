import { useState } from 'react';
import { Badge } from '../../../components/Badge';
import { EmptyState } from '../../../components/EmptyState';
import { agruparEnviados, type GrupoEnviado } from '../transferencia';
import type { ItemConProducto, usePedidoMutations } from '../hooks';

export function PedidoCarrito({
  isLoading,
  items,
  mutations,
  modoTransferir,
  filasTransferibles,
  cantidadesTransferir,
  onToggleFila,
  onCambiarCantidadFila,
  onQuitarGrupo,
}: {
  isLoading: boolean;
  items: ItemConProducto[];
  mutations: ReturnType<typeof usePedidoMutations>;
  modoTransferir: boolean;
  filasTransferibles: GrupoEnviado[];
  cantidadesTransferir: Map<string, number>;
  onToggleFila: (fila: GrupoEnviado, index: number, shiftKey: boolean) => void;
  onCambiarCantidadFila: (fila: GrupoEnviado, nueva: number) => void;
  onQuitarGrupo: (grupo: GrupoEnviado) => void;
}) {
  if (isLoading) return <EmptyState>Cargando…</EmptyState>;
  if (items.length === 0) return <EmptyState>Todavía no agregaste nada.</EmptyState>;

  if (modoTransferir) {
    return (
      <>
        {filasTransferibles.map((fila, i) => (
          <FilaSeleccionable
            key={fila.key}
            fila={fila}
            cantidadElegida={cantidadesTransferir.get(fila.key) ?? 0}
            onToggle={(shiftKey) => onToggleFila(fila, i, shiftKey)}
            onCambiarCantidad={(nueva) => onCambiarCantidadFila(fila, nueva)}
          />
        ))}
      </>
    );
  }

  return (
    <>
      {agruparEnviados(items).map((g) => (
        <ItemGrupoFila key={g.key} grupo={g} onQuitar={() => onQuitarGrupo(g)} />
      ))}
      {items
        .filter((it) => !it.enviado_cocina)
        .map((it) => (
          <ItemFila key={it.id} item={it} mutations={mutations} />
        ))}
    </>
  );
}

function ItemGrupoFila({ grupo, onQuitar }: { grupo: GrupoEnviado; onQuitar: () => void }) {
  return (
    <div className="pedido-item">
      <div className="pedido-item-top">
        <span className="pedido-item-nombre">
          {grupo.nombre}
          <span style={{ marginLeft: 6 }}>
            <Badge tone={grupo.entregado ? 'good' : 'info'}>{grupo.entregado ? 'entregado' : 'en cocina'}</Badge>
          </span>
        </span>
        <div className="pedido-item-controls">
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>x{grupo.cantidad}</span>
          <button
            className="btn-danger btn-icon"
            title="Quitar (ej: se canceló o lo devolvieron)"
            aria-label={`Quitar ${grupo.nombre}`}
            onClick={onQuitar}
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}

function FilaSeleccionable({
  fila,
  cantidadElegida,
  onToggle,
  onCambiarCantidad,
}: {
  fila: GrupoEnviado;
  cantidadElegida: number;
  onToggle: (shiftKey: boolean) => void;
  onCambiarCantidad: (nueva: number) => void;
}) {
  const seleccionada = cantidadElegida > 0;
  return (
    <div
      className="pedido-item"
      style={{
        borderColor: seleccionada ? 'var(--terracota)' : undefined,
        background: seleccionada ? 'var(--cream-deep)' : undefined,
      }}
    >
      <div
        className="pedido-item-top"
        role="checkbox"
        aria-checked={seleccionada}
        onClick={(e) => onToggle(e.shiftKey)}
        style={{ cursor: 'pointer' }}
      >
        <span className="pedido-item-nombre">
          <span style={{ marginRight: 8 }}>{seleccionada ? '☑️' : '⬜'}</span>
          {fila.nombre}
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>x{fila.cantidad}</span>
      </div>
      {seleccionada && fila.cantidad > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }} onClick={(e) => e.stopPropagation()}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Transferir:</span>
          <button className="pedido-qty-btn" aria-label="Restar de la cantidad a transferir" onClick={() => onCambiarCantidad(cantidadElegida - 1)}>
            −
          </button>
          <span style={{ minWidth: 14, textAlign: 'center' }}>{cantidadElegida}</span>
          <button className="pedido-qty-btn" aria-label="Sumar a la cantidad a transferir" onClick={() => onCambiarCantidad(cantidadElegida + 1)}>
            +
          </button>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>de {fila.cantidad}</span>
        </div>
      )}
    </div>
  );
}

function ItemFila({
  item,
  mutations,
}: {
  item: ItemConProducto;
  mutations: ReturnType<typeof usePedidoMutations>;
}) {
  const [nota, setNota] = useState(item.nota ?? '');

  return (
    <div className="pedido-item">
      <div className="pedido-item-top">
        <span className="pedido-item-nombre">
          {item.productos?.nombre ?? `Producto #${item.producto_id}`}
          {item.enviado_cocina && (
            <span style={{ marginLeft: 6 }}>
              <Badge tone={item.entregado ? 'good' : 'info'}>{item.entregado ? 'entregado' : 'en cocina'}</Badge>
            </span>
          )}
        </span>
        <div className="pedido-item-controls">
          <button
            className="pedido-qty-btn"
            aria-label="Restar cantidad"
            onClick={() => mutations.actualizarCantidad.mutate({ itemId: item.id, cantidad: Math.max(1, Number(item.cantidad) - 1) })}
          >
            −
          </button>
          <span style={{ minWidth: 14, textAlign: 'center' }}>{item.cantidad}</span>
          <button
            className="pedido-qty-btn"
            aria-label="Sumar cantidad"
            onClick={() => mutations.actualizarCantidad.mutate({ itemId: item.id, cantidad: Number(item.cantidad) + 1 })}
          >
            +
          </button>
          <button
            className="btn-danger btn-icon"
            aria-label={`Quitar ${item.productos?.nombre ?? 'producto'}`}
            onClick={() => mutations.quitarItem.mutate(item.id)}
          >
            🗑
          </button>
        </div>
      </div>
      <input
        className="pedido-item-nota"
        placeholder="Nota (ej: sin azúcar)"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        onBlur={() => nota !== (item.nota ?? '') && mutations.actualizarNota.mutate({ itemId: item.id, nota })}
      />
    </div>
  );
}
