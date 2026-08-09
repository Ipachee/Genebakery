import { useState } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { useGastoMutations, useGastos, useInsumos } from '../hooks';

const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export function GastosView() {
  const { session } = useAuth();
  const { data: gastos, isLoading } = useGastos();
  const { data: insumos } = useInsumos();
  const { registrar } = useGastoMutations();

  const [form, setForm] = useState({ insumoId: '', cantidad: '', costoTotal: '', proveedor: '' });
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!session || !form.insumoId || !form.cantidad || !form.costoTotal) return;
    setError(null);
    try {
      await registrar.mutateAsync({
        insumoId: Number(form.insumoId),
        cantidad: Number(form.cantidad),
        costoTotal: Number(form.costoTotal),
        proveedor: form.proveedor,
        usuarioId: session.user.id,
      });
      setForm({ insumoId: '', cantidad: '', costoTotal: '', proveedor: '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el gasto');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <select value={form.insumoId} onChange={(e) => setForm({ ...form, insumoId: e.target.value })} style={inp}>
          <option value="">Insumo comprado…</option>
          {insumos?.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nombre} ({i.unidad})
            </option>
          ))}
        </select>
        <input placeholder="Cantidad" type="number" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} style={{ ...inp, width: 100 }} />
        <input placeholder="Costo total $" type="number" value={form.costoTotal} onChange={(e) => setForm({ ...form, costoTotal: e.target.value })} style={{ ...inp, width: 120 }} />
        <input placeholder="Proveedor" value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} style={inp} />
        <button onClick={submit} style={btnPrimary}>
          + Registrar gasto
        </button>
      </div>
      {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}

      {isLoading ? (
        <p>Cargando…</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <th style={th}>Fecha</th>
              <th style={th}>Insumo</th>
              <th style={th}>Cantidad</th>
              <th style={th}>Costo total</th>
              <th style={th}>Proveedor</th>
            </tr>
          </thead>
          <tbody>
            {gastos?.map((g) => (
              <tr key={g.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={td}>{g.fecha}</td>
                <td style={td}>{g.insumos?.nombre}</td>
                <td style={td}>{g.cantidad}</td>
                <td style={td}>{fmt.format(Number(g.costo_total))}</td>
                <td style={td}>{g.proveedor ?? '—'}</td>
              </tr>
            ))}
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
