import { useState } from 'react';
import { useInsumoMutations, useInsumos } from '../hooks';

const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });

export function InsumosView() {
  const { data: insumos, isLoading } = useInsumos();
  const { crear, borrar } = useInsumoMutations();
  const [form, setForm] = useState({ nombre: '', unidad: 'kg', stock: '', costoUnit: '', stockMin: '' });

  function submit() {
    if (!form.nombre || !form.unidad) return;
    crear.mutate({
      nombre: form.nombre,
      unidad: form.unidad,
      stock: Number(form.stock) || 0,
      costoUnit: Number(form.costoUnit) || 0,
      stockMin: Number(form.stockMin) || 0,
    });
    setForm({ nombre: '', unidad: 'kg', stock: '', costoUnit: '', stockMin: '' });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={inp} />
        <input placeholder="Unidad (kg, L, unid)" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} style={{ ...inp, width: 130 }} />
        <input placeholder="Stock inicial" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} style={{ ...inp, width: 110 }} />
        <input placeholder="Costo unitario" type="number" value={form.costoUnit} onChange={(e) => setForm({ ...form, costoUnit: e.target.value })} style={{ ...inp, width: 120 }} />
        <input placeholder="Stock mínimo" type="number" value={form.stockMin} onChange={(e) => setForm({ ...form, stockMin: e.target.value })} style={{ ...inp, width: 110 }} />
        <button onClick={submit} style={btnPrimary}>+ Agregar</button>
      </div>

      {isLoading ? (
        <p>Cargando…</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <th style={th}>Nombre</th>
              <th style={th}>Unidad</th>
              <th style={th}>Stock</th>
              <th style={th}>Costo unit.</th>
              <th style={th}>Mínimo</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {insumos?.map((i) => {
              const bajo = Number(i.stock) <= Number(i.stock_min);
              return (
                <tr key={i.id} style={{ borderBottom: '1px solid var(--border)', background: bajo ? 'var(--warn-soft, rgba(163,83,44,0.08))' : undefined }}>
                  <td style={td}>{i.nombre}</td>
                  <td style={td}>{i.unidad}</td>
                  <td style={td}>
                    {i.stock} {bajo && <span style={{ color: 'var(--red)', fontSize: 11 }}>⚠ bajo</span>}
                  </td>
                  <td style={td}>{fmt.format(Number(i.costo_unit))}</td>
                  <td style={td}>{i.stock_min}</td>
                  <td style={td}>
                    <button onClick={() => borrar.mutate(i.id)} style={{ color: 'var(--red)', border: 'none', background: 'none' }}>
                      🗑
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

const inp: React.CSSProperties = { padding: 7, borderRadius: 5, border: '1px solid var(--border)', fontSize: 13 };
const btnPrimary: React.CSSProperties = { padding: '7px 12px', borderRadius: 5, border: 'none', background: 'var(--terracota)', color: '#fff', fontWeight: 600, fontSize: 13 };
const th: React.CSSProperties = { padding: '6px 8px', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)' };
const td: React.CSSProperties = { padding: '7px 8px' };
