import { useState } from 'react';
import { useInsumoMutations } from '../hooks';
import { FormModal } from '../../../components/FormModal';
import { Field, TextInput } from '../../../components/Field';
import type { Database } from '../../../lib/supabase/types';

type Insumo = Database['public']['Tables']['insumos']['Row'];

// Mismo modal para cargar y editar -- si viene `insumo`, arranca con esos
// valores y guarda con actualizar() en vez de crear(). El stock no se
// edita acá a mano a propósito -- se recalcula solo con cada compra
// (Gastos), tocarlo directo rompería ese promedio ponderado.
export function NuevoInsumoModal({ insumo, onClose }: { insumo?: Insumo; onClose: () => void }) {
  const editando = !!insumo;
  const { crear, actualizar } = useInsumoMutations();
  const [form, setForm] = useState({
    nombre: insumo?.nombre ?? '',
    unidad: insumo?.unidad ?? 'kg',
    stock: '',
    costoUnit: insumo ? String(insumo.costo_unit) : '',
    stockMin: insumo ? String(insumo.stock_min) : '',
  });

  const guardando = editando ? actualizar.isPending : crear.isPending;
  const mutacionActiva = editando ? actualizar : crear;
  const valido = form.nombre.trim() !== '' && form.unidad.trim() !== '';

  function submit() {
    if (!valido) return;
    if (editando) {
      actualizar.mutate({
        id: insumo.id,
        nombre: form.nombre.trim(),
        unidad: form.unidad.trim(),
        costoUnit: Number(form.costoUnit) || 0,
        stockMin: Number(form.stockMin) || 0,
      });
    } else {
      crear.mutate({
        nombre: form.nombre.trim(),
        unidad: form.unidad.trim(),
        stock: Number(form.stock) || 0,
        costoUnit: Number(form.costoUnit) || 0,
        stockMin: Number(form.stockMin) || 0,
      });
    }
    onClose();
  }

  return (
    <FormModal
      title={editando ? '✏️ Editar insumo' : '📦 Nuevo insumo'}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={guardando ? 'Guardando…' : editando ? 'Guardar cambios' : '+ Agregar insumo'}
      submitDisabled={!valido || guardando}
      error={mutacionActiva.isError ? mutacionActiva.error?.message : null}
    >
      <Field label="Nombre">
        <TextInput autoFocus value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
      </Field>
      <div style={{ display: 'flex', gap: 8 }}>
        <Field label="Unidad (kg, L, unid)" style={{ flex: 1 }}>
          <TextInput value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} />
        </Field>
        {!editando && (
          <Field label="Stock inicial" style={{ flex: 1 }}>
            <TextInput type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </Field>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Field label="Costo unitario" style={{ flex: 1 }}>
          <TextInput type="number" min={0} value={form.costoUnit} onChange={(e) => setForm({ ...form, costoUnit: e.target.value })} />
        </Field>
        <Field label="Stock mínimo" style={{ flex: 1 }}>
          <TextInput type="number" min={0} value={form.stockMin} onChange={(e) => setForm({ ...form, stockMin: e.target.value })} />
        </Field>
      </div>
    </FormModal>
  );
}
