import { useState } from 'react';
import { useElaboradoMutations, useProductosSinElaborado } from '../hooks';
import { FormModal } from '../../../components/FormModal';
import { Field, Select, TextInput } from '../../../components/Field';
import type { Database } from '../../../lib/supabase/types';

type Elaborado = Database['public']['Tables']['elaborados']['Row'] & { productos: { nombre: string } | null };

// Mismo modal para cargar y editar -- si viene `elaborado`, arranca con
// esos valores y guarda con actualizar() en vez de crear(). El producto
// vinculado NO se edita a propósito -- cambiarlo afecta recetas/ventas ya
// existentes, así que queda fijo desde que se crea.
export function NuevoElaboradoModal({ elaborado, onClose }: { elaborado?: Elaborado; onClose: () => void }) {
  const editando = !!elaborado;
  const { data: productosDisponibles } = useProductosSinElaborado();
  const { crear, actualizar } = useElaboradoMutations();
  const [form, setForm] = useState({
    nombre: elaborado?.nombre ?? '',
    productoId: elaborado ? String(elaborado.producto_id) : '',
    porcionesPorUnidad: elaborado ? String(elaborado.porciones_por_unidad) : '',
    porcionesMin: elaborado ? String(elaborado.porciones_min) : '',
  });

  const guardando = editando ? actualizar.isPending : crear.isPending;
  const mutacionActiva = editando ? actualizar : crear;
  const valido = form.nombre.trim() !== '' && form.productoId !== '' && form.porcionesPorUnidad !== '';

  function submit() {
    if (!valido) return;
    if (editando) {
      actualizar.mutate({
        id: elaborado.id,
        nombre: form.nombre.trim(),
        porcionesPorUnidad: Number(form.porcionesPorUnidad),
        porcionesMin: Number(form.porcionesMin) || 0,
      });
    } else {
      crear.mutate({
        nombre: form.nombre.trim(),
        productoId: Number(form.productoId),
        porcionesPorUnidad: Number(form.porcionesPorUnidad),
        porcionesMin: Number(form.porcionesMin) || 0,
      });
    }
    onClose();
  }

  return (
    <FormModal
      title={editando ? '✏️ Editar elaborado' : '🍰 Nuevo elaborado'}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={guardando ? 'Guardando…' : editando ? 'Guardar cambios' : '+ Agregar elaborado'}
      submitDisabled={!valido || guardando}
      error={mutacionActiva.isError ? mutacionActiva.error?.message : null}
    >
      <Field label="Nombre">
        <TextInput
          autoFocus
          placeholder="Ej: Torta de chocolate"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
        />
      </Field>
      {editando ? (
        <Field label="Producto del menú vinculado">
          <TextInput value={elaborado.productos?.nombre ?? ''} disabled />
        </Field>
      ) : (
        <Field label="Producto del menú vinculado">
          <Select value={form.productoId} onChange={(e) => setForm({ ...form, productoId: e.target.value })}>
            <option value="">Elegí un producto…</option>
            {productosDisponibles?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <Field label="Porciones por unidad" style={{ flex: 1 }}>
          <TextInput
            type="number"
            min={1}
            value={form.porcionesPorUnidad}
            onChange={(e) => setForm({ ...form, porcionesPorUnidad: e.target.value })}
          />
        </Field>
        <Field label="Porciones mínimas" style={{ flex: 1 }}>
          <TextInput type="number" min={0} value={form.porcionesMin} onChange={(e) => setForm({ ...form, porcionesMin: e.target.value })} />
        </Field>
      </div>
    </FormModal>
  );
}
