import { useState } from 'react';
import { useClienteMutations, useClientes } from '../hooks';

export function ClientesView() {
  const { data: clientes, isLoading } = useClientes();
  const { crear, borrar } = useClienteMutations();
  const [form, setForm] = useState({ nombre: '', apellido: '', dni: '', cuit: '', direccion: '', condicionFiscal: '', email: '', descuentoPct: '' });

  function submit() {
    if (!form.nombre || !form.apellido) return;
    crear.mutate({ ...form, descuentoPct: Number(form.descuentoPct) || 0 });
    setForm({ nombre: '', apellido: '', dni: '', cuit: '', direccion: '', condicionFiscal: '', email: '', descuentoPct: '' });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={inp} />
        <input placeholder="Apellido" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} style={inp} />
        <input placeholder="DNI" value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} style={{ ...inp, width: 110 }} />
        <input placeholder="CUIT" value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })} style={{ ...inp, width: 130 }} />
        <input placeholder="Condición fiscal" value={form.condicionFiscal} onChange={(e) => setForm({ ...form, condicionFiscal: e.target.value })} style={inp} />
        <input placeholder="% descuento" type="number" value={form.descuentoPct} onChange={(e) => setForm({ ...form, descuentoPct: e.target.value })} style={{ ...inp, width: 100 }} />
        <button onClick={submit} style={btnPrimary}>
          + Agregar
        </button>
      </div>

      {isLoading ? (
        <p>Cargando…</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <th style={th}>Nombre</th>
              <th style={th}>DNI/CUIT</th>
              <th style={th}>Cond. fiscal</th>
              <th style={th}>Desc.</th>
              <th style={th}>Visitas</th>
              <th style={th}>Total gastado</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {clientes?.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={td}>
                  {c.nombre} {c.apellido}
                </td>
                <td style={td}>{c.dni || c.cuit || '—'}</td>
                <td style={td}>{c.condicion_fiscal || '—'}</td>
                <td style={td}>{c.descuento_pct}%</td>
                <td style={td}>{c.visitas}</td>
                <td style={td}>${Number(c.total_gastado).toLocaleString('es-AR')}</td>
                <td style={td}>
                  <button onClick={() => borrar.mutate(c.id)} style={{ color: 'var(--red)', border: 'none', background: 'none' }}>
                    🗑
                  </button>
                </td>
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
