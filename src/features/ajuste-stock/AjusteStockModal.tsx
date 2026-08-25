import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase/client';
import { FormModal } from '../../components/FormModal';
import { Field, TextInput } from '../../components/Field';

// Issue #12: ajuste manual de stock (mermas, roturas, conteo físico que no
// coincide). Vive suelto acá y no dentro de insumos/ o elaborados/ porque
// es el mismo modal para los dos -- lo único que cambia es el tipo que se
// le manda a la función.
//
// Se pide el stock REAL contado, no la diferencia: es lo que la persona
// tiene enfrente ("quedan 3 botellas"). Calcular el delta es trabajo de
// fn_ajustar_stock, y hacerlo acá sería una fuente de errores de signo.
export type ItemAjustable = { tipo: 'insumo' | 'elaborado'; id: number; nombre: string; stockActual: number; unidad: string };

export function AjusteStockModal({ item, onClose }: { item: ItemAjustable; onClose: () => void }) {
  const qc = useQueryClient();
  const [stockReal, setStockReal] = useState('');
  const [motivo, setMotivo] = useState('');

  const ajustar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('fn_ajustar_stock', {
        p_tipo: item.tipo,
        p_id: item.id,
        p_stock_real: Number(stockReal),
        p_motivo: motivo.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      onClose();
    },
  });

  const nRaw = Number(stockReal);
  const valido = stockReal.trim() !== '' && Number.isFinite(nRaw) && nRaw >= 0 && motivo.trim() !== '' && nRaw !== item.stockActual;
  const delta = Number.isFinite(nRaw) ? nRaw - item.stockActual : 0;

  return (
    <FormModal
      title={`📋 Ajustar stock — ${item.nombre}`}
      onClose={onClose}
      onSubmit={() => valido && ajustar.mutate()}
      submitLabel={ajustar.isPending ? 'Ajustando…' : 'Registrar ajuste'}
      submitDisabled={!valido || ajustar.isPending}
      error={ajustar.isError ? ajustar.error?.message : null}
    >
      <Field label={`Stock real contado (${item.unidad})`}>
        <TextInput autoFocus type="number" min={0} step="any" value={stockReal} onChange={(e) => setStockReal(e.target.value)} />
      </Field>

      <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
        En el sistema figura <strong>{item.stockActual}</strong> {item.unidad}.
        {stockReal.trim() !== '' && Number.isFinite(nRaw) && delta !== 0 && (
          <>
            {' '}
            Se va a registrar un ajuste de{' '}
            <strong style={{ color: delta < 0 ? 'var(--red)' : 'var(--green)' }}>
              {delta > 0 ? '+' : ''}
              {Number(delta.toFixed(3))}
            </strong>
            .
          </>
        )}
      </div>

      <Field label="Motivo">
        <TextInput
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej: se rompió una botella, conteo de fin de mes"
        />
      </Field>
    </FormModal>
  );
}
