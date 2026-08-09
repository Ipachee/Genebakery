import { useState } from 'react';
import { useEmpleadoMutations, useEmpleados } from '../hooks';

export function EmpleadosView() {
  const { data: empleados, isLoading } = useEmpleados();
  const { crear, borrar } = useEmpleadoMutations();
  const [form, setForm] = useState({ nombre: '', apellido: '', dni: '', puesto: '', ingreso: '', descuentoPct: '' });

  function submit() {
    if (!form.nombre || !form.apellido) return;
    crear.mutate({ ...form, descuentoPct: Number(form.descuentoPct) || 0 });
    setForm({ nombre: '', apellido: '', dni: '', puesto: '', ingreso: '', descuentoPct: '' });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={inp} />
        <input placeholder="Apellido" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} style={inp} />
        <input placeholder="DNI" value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} style={{ ...inp, width: 110 }} />
        <input placeholder="Puesto" value={form.puesto} onChange={(e) => setForm({ ...form, puesto: e.target.value })} style={inp} />
        <input placeholder="Ingreso" type="date" value={form.ingreso} onChange={(e) => setForm({ ...form, ingreso: e.target.value })} style={{ ...inp, width: 150 }} />
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
              <th style={th}>DNI</th>
              <th style={th}>Puesto</th>
              <th style={th}>Ingreso</th>
              <th style={th}>Desc.</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {empleados?.map((e) => (
              <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={td}>
                  {e.nombre} {e.apellido}
                </td>
                <td style={td}>{e.dni || '—'}</td>
                <td style={td}>{e.puesto || '—'}</td>
                <td style={td}>{e.ingreso || '—'}</td>
                <td style={td}>{e.descuento_pct}%</td>
                <td style={td}>
                  <button onClick={() => borrar.mutate(e.id)} style={{ color: 'var(--red)', border: 'none', background: 'none' }}>
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
