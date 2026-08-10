import { useState, type ReactNode } from 'react';
import { Button } from './Button';
import './ConfirmDialog.css';

type Pedido = { mensaje: string; danger: boolean; resolve: (v: boolean) => void };

/**
 * Reemplaza el confirm() nativo del navegador (feo, no se puede estilar, y
 * en mobile corta distinto en cada navegador) por un modal propio. Uso:
 *
 *   const { confirm, dialog } = useConfirm();
 *   ...
 *   if (await confirm('¿Cancelar todo?')) { ... }
 *   ...
 *   return <>{dialog}{resto}</>;
 */
export function useConfirm() {
  const [pedido, setPedido] = useState<Pedido | null>(null);

  function confirm(mensaje: string, opts: { danger?: boolean } = {}) {
    return new Promise<boolean>((resolve) => {
      setPedido({ mensaje, danger: opts.danger ?? true, resolve });
    });
  }

  function responder(valor: boolean) {
    pedido?.resolve(valor);
    setPedido(null);
  }

  const dialog: ReactNode = pedido && (
    <div className="confirm-overlay" onClick={() => responder(false)}>
      <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-mensaje">{pedido.mensaje}</p>
        <div className="confirm-actions">
          <Button variant="secondary" size="sm" onClick={() => responder(false)}>
            Cancelar
          </Button>
          <Button variant={pedido.danger ? 'danger' : 'primary'} size="sm" onClick={() => responder(true)}>
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );

  return { confirm, dialog };
}
