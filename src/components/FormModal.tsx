import type { ReactNode } from 'react';
import { Button } from './Button';

// Cáscara compartida por los modales de alta (Insumos, Clientes, Empleados,
// Proveedores, Elaborados...): mismo overlay/tamaño/header/footer que ya usa
// el resto de los modales de la app (pedido, apertura/cierre de caja,
// registrar gasto) -- así no hay que repetir esto en cada uno.
export function FormModal({
  title,
  onClose,
  onSubmit,
  submitLabel,
  submitDisabled,
  error,
  width = 480,
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  submitDisabled?: boolean;
  error?: string | null;
  width?: number;
  children: ReactNode;
}) {
  return (
    <div className="pedido-overlay" onClick={onClose}>
      <div className="pedido-modal" style={{ width }} onClick={(e) => e.stopPropagation()}>
        <div className="pedido-modal-header">
          <h3>{title}</h3>
          <button className="pedido-close" aria-label="Cerrar" onClick={onClose}>
            ✕
          </button>
        </div>
        <div style={{ padding: 'var(--space-5)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {children}
          {error && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={onSubmit} disabled={submitDisabled}>
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
