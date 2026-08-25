import { useState } from 'react';
import { usePuedeEditar } from '../../permisos/hooks';
import { useCategoriaMutations, useCategorias } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable } from '../../../components/DataTable';
import { Button } from '../../../components/Button';
import { Select, TextInput } from '../../../components/Field';
import { EmptyState } from '../../../components/EmptyState';
import { useConfirm } from '../../../components/ConfirmDialog';
import type { Database } from '../../../lib/supabase/types';

type Categoria = Database['public']['Tables']['categorias']['Row'];

export function CategoriasView() {
  const puedeEditar = usePuedeEditar('categorias');
  const { data: categorias, isLoading } = useCategorias();
  const { crear, actualizar, actualizarDestino, borrar } = useCategoriaMutations();
  const [nombre, setNombre] = useState('');
  const { confirm, dialog } = useConfirm();

  function submit() {
    if (!nombre.trim()) return;
    const maxOrden = Math.max(0, ...(categorias ?? []).map((c) => c.orden));
    crear.mutate({ nombre: nombre.trim(), orden: maxOrden + 1 });
    setNombre('');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader
        title="Categorías"
      />

      {puedeEditar && (
        <div className="toolbar-form">
          <TextInput placeholder="Nombre de la categoría (ej: Bebidas noche)" value={nombre} onChange={(e) => setNombre(e.target.value)} style={{ minWidth: 220 }} />
          <Button variant="primary" onClick={submit}>
            + Agregar categoría
          </Button>
        </div>
      )}

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !categorias?.length ? (
        <EmptyState>Todavía no cargaste categorías.</EmptyState>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Orden</th>
              <th>Nombre</th>
              <th>Destino</th>
              {puedeEditar && <th></th>}
            </tr>
          </thead>
          <tbody>
            {categorias.map((c) => (
              <FilaCategoria
                key={c.id}
                categoria={c}
                puedeEditar={puedeEditar}
                onGuardar={(v) => actualizar.mutate(v)}
                onGuardarDestino={(destino) => actualizarDestino.mutate({ id: c.id, destino })}
                onBorrar={async () => {
                  if (await confirm(`¿Borrar la categoría "${c.nombre}"?`)) borrar.mutate(c.id);
                }}
              />
            ))}
          </tbody>
        </DataTable>
      )}
      {dialog}
    </div>
  );
}

function FilaCategoria({
  categoria,
  puedeEditar,
  onGuardar,
  onGuardarDestino,
  onBorrar,
}: {
  categoria: Categoria;
  puedeEditar: boolean;
  onGuardar: (v: { id: number; nombre: string; orden: number }) => void;
  onGuardarDestino: (destino: 'cocina' | 'barra') => void;
  onBorrar: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ nombre: categoria.nombre, orden: String(categoria.orden) });

  function empezarEdicion() {
    setForm({ nombre: categoria.nombre, orden: String(categoria.orden) });
    setEditando(true);
  }

  function guardar() {
    if (!form.nombre.trim()) return;
    onGuardar({ id: categoria.id, nombre: form.nombre.trim(), orden: Number(form.orden) || 0 });
    setEditando(false);
  }

  if (editando) {
    return (
      <tr style={{ background: 'var(--surface-sunken)' }}>
        <td>
          <TextInput type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: e.target.value })} style={{ width: 70 }} />
        </td>
        <td>
          <TextInput value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={{ width: '100%' }} autoFocus />
        </td>
        <td>{categoria.destino === 'barra' ? '🍹 Barra' : '🍳 Cocina'}</td>
        <td style={{ display: 'flex', gap: 6 }}>
          <Button variant="success" size="sm" onClick={guardar}>
            💾 Guardar
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setEditando(false)}>
            ✕ Cancelar
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{categoria.orden}</td>
      <td>{categoria.nombre}</td>
      <td>
        {puedeEditar ? (
          <Select
            value={categoria.destino}
            onChange={(e) => onGuardarDestino(e.target.value as 'cocina' | 'barra')}
            style={{ fontSize: 12.5, padding: '4px 6px' }}
          >
            <option value="cocina">🍳 Cocina</option>
            <option value="barra">🍹 Barra</option>
          </Select>
        ) : categoria.destino === 'barra' ? (
          '🍹 Barra'
        ) : (
          '🍳 Cocina'
        )}
      </td>
      {puedeEditar && (
        <td style={{ display: 'flex', gap: 6 }}>
          <Button size="sm" variant="secondary" onClick={empezarEdicion}>
            ✏️ Editar
          </Button>
          <Button variant="danger" size="sm" aria-label={`Borrar categoría ${categoria.nombre}`} onClick={onBorrar}>
            🗑
          </Button>
        </td>
      )}
    </tr>
  );
}
