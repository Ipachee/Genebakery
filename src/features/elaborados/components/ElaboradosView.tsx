import { useState } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { useElaboradoMutations, useElaborados, useProductosSinElaborado } from '../hooks';

const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });

export function ElaboradosView() {
  const { session } = useAuth();
  const { data: elaborados, isLoading } = useElaborados();
  const { data: productosDisponibles } = useProductosSinElaborado();
  const mutations = useElaboradoMutations();

  const [form, setForm] = useState({ nombre: '', productoId: '', porcionesPorUnidad: '', porcionesMin: '' });
  const [producciones, setProducciones] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  function crear() {
    if (!form.nombre || !form.productoId || !form.porcionesPorUnidad) return;
    mutations.crear.mutate({
      nombre: form.nombre,
      productoId: Number(form.productoId),
      porcionesPorUnidad: Number(form.porcionesPorUnidad),
      porcionesMin: Number(form.porcionesMin) || 0,
    });
    setForm({ nombre: '', productoId: '', porcionesPorUnidad: '', porcionesMin: '' });
  }

  async function producir(elaboradoId: number) {
    if (!session) return;
    const cantidad = Number(producciones[elaboradoId]);
    if (!cantidad) return;
    setError(null);
    try {
      await mutations.producir.mutateAsync({ elaboradoId, cantidadUnidades: cantidad, usuarioId: session.user.id });
      setProducciones({ ...producciones, [elaboradoId]: '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la producción');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <input placeholder="Nombre (ej: Torta de chocolate)" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={inp} />
        <select value={form.productoId} onChange={(e) => setForm({ ...form, productoId: e.target.value })} style={inp}>
          <option value="">Producto del menú vinculado…</option>
          {productosDisponibles?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <input placeholder="Porciones por unidad" type="number" value={form.porcionesPorUnidad} onChange={(e) => setForm({ ...form, porcionesPorUnidad: e.target.value })} style={{ ...inp, width: 140 }} />
        <input placeholder="Porciones mínimas" type="number" value={form.porcionesMin} onChange={(e) => setForm({ ...form, porcionesMin: e.target.value })} style={{ ...inp, width: 130 }} />
        <button onClick={crear} style={btnPrimary}>
          + Agregar
        </button>
      </div>

      {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}

      {isLoading ? (
        <p>Cargando…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {elaborados?.map((e) => {
            const bajo = Number(e.stock_porciones) <= Number(e.porciones_min);
            return (
              <div key={e.id} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <strong>{e.nombre}</strong>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    {e.productos?.nombre} · {e.porciones_por_unidad} porciones/unidad · costo/porción {fmt.format(Number(e.costo_unit_porcion))}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    Stock: {e.stock_porciones} porciones {bajo && <span style={{ color: 'var(--red)', fontSize: 11 }}>⚠ bajo</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    placeholder="Unidades hechas"
                    type="number"
                    value={producciones[e.id] ?? ''}
                    onChange={(ev) => setProducciones({ ...producciones, [e.id]: ev.target.value })}
                    style={{ width: 110, padding: 6, borderRadius: 5, border: '1px solid var(--border)', fontSize: 12 }}
                  />
                  <button onClick={() => producir(e.id)} style={{ padding: '6px 10px', borderRadius: 5, border: 'none', background: 'var(--green)', color: '#fff', fontSize: 12 }}>
                    Registrar producción
                  </button>
                  <button onClick={() => mutations.borrar.mutate(e.id)} style={{ color: 'var(--red)', border: 'none', background: 'none' }}>
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const inp: React.CSSProperties = { padding: 7, borderRadius: 5, border: '1px solid var(--border)', fontSize: 13 };
const btnPrimary: React.CSSProperties = { padding: '7px 12px', borderRadius: 5, border: 'none', background: 'var(--terracota)', color: '#fff', fontWeight: 600, fontSize: 13 };
