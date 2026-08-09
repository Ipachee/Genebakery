import { useState } from 'react';
import { useInsumos, useProductos, useRecetaDeProducto, useRecetaMutations } from '../hooks';

export function RecetasView() {
  const { data: productos } = useProductos();
  const { data: insumos } = useInsumos();
  const [productoId, setProductoId] = useState<number | null>(null);
  const { data: receta } = useRecetaDeProducto(productoId);
  const mutations = useRecetaMutations(productoId);

  const [insumoId, setInsumoId] = useState<number | ''>('');
  const [cantidad, setCantidad] = useState('');

  const insumosUsados = new Set(receta?.map((r) => r.insumo_id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480 }}>
      <select
        value={productoId ?? ''}
        onChange={(e) => setProductoId(e.target.value ? Number(e.target.value) : null)}
        style={{ padding: 8, borderRadius: 5, border: '1px solid var(--border)' }}
      >
        <option value="">Elegí un producto…</option>
        {productos?.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre} ({p.categoria})
          </option>
        ))}
      </select>

      {productoId && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {receta?.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                Sin receta cargada todavía (si este producto es un elaborado, esta es la receta de UNA unidad completa).
              </p>
            )}
            {receta?.map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 5, padding: '6px 10px', fontSize: 13 }}>
                <span>
                  {r.insumos?.nombre} — {r.cantidad} {r.insumos?.unidad}
                </span>
                <button onClick={() => mutations.quitar.mutate(r.id)} style={{ color: 'var(--red)', border: 'none', background: 'none' }}>
                  🗑
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <select value={insumoId} onChange={(e) => setInsumoId(e.target.value ? Number(e.target.value) : '')} style={{ flex: 1, padding: 7, borderRadius: 5, border: '1px solid var(--border)' }}>
              <option value="">Insumo…</option>
              {insumos
                ?.filter((i) => !insumosUsados.has(i.id))
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre} ({i.unidad})
                  </option>
                ))}
            </select>
            <input placeholder="Cantidad" type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)} style={{ width: 100, padding: 7, borderRadius: 5, border: '1px solid var(--border)' }} />
            <button
              onClick={() => {
                if (!insumoId || !cantidad) return;
                mutations.agregar.mutate({ insumoId, cantidad: Number(cantidad) });
                setInsumoId('');
                setCantidad('');
              }}
              style={{ padding: '7px 12px', borderRadius: 5, border: 'none', background: 'var(--terracota)', color: '#fff', fontSize: 13 }}
            >
              + Agregar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
