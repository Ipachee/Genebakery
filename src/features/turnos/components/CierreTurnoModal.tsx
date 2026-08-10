import { useState } from 'react';
import {
  useCerrarTurno,
  useFacturadoTurno,
  useInsumosStockBajo,
  useMesasPendientesDelTurno,
  useVentasDelTurno,
} from '../hooks';
import { Button } from '../../../components/Button';
import { TextInput } from '../../../components/Field';
import type { Database } from '../../../lib/supabase/types';

type Turno = Database['public']['Tables']['turnos']['Row'];

const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export function CierreTurnoModal({ turno, onClose }: { turno: Turno; onClose: () => void }) {
  const { data: ventas } = useVentasDelTurno(turno.id);
  const { data: facturado = 0 } = useFacturadoTurno(turno.id);
  const { data: mesasPendientes } = useMesasPendientesDelTurno(turno.id);
  const { data: insumosBajo } = useInsumosStockBajo();
  const cerrar = useCerrarTurno(turno.id);
  const [email, setEmail] = useState('');

  const esUltimoTurnoDelDia = turno.etiqueta === 'Tarde';
  const hayPendientes = (mesasPendientes?.length ?? 0) > 0;
  const bloqueaCierre = esUltimoTurnoDelDia && hayPendientes;

  const porMetodo = new Map<string, number>();
  for (const v of ventas ?? []) {
    porMetodo.set(v.metodo_pago, (porMetodo.get(v.metodo_pago) ?? 0) + Number(v.total));
  }

  function generarResumenTexto() {
    const lineas: string[] = [];
    lineas.push(`Cierre de turno — ${turno.etiqueta} — ${new Date().toLocaleDateString('es-AR')}`);
    lineas.push('');
    lineas.push(`Mesas cobradas: ${ventas?.length ?? 0}`);
    lineas.push(`Total facturado: ${fmt.format(facturado)}`);
    lineas.push(`Mesas pendientes: ${mesasPendientes?.length ?? 0}`);
    lineas.push('');
    lineas.push('Detalle de ventas:');
    for (const v of ventas ?? []) {
      lineas.push(
        `- Mesa ${v.mesas?.label ?? v.mesa_id ?? 'take away'} · ${new Date(v.created_at).toLocaleTimeString('es-AR')} · ${
          v.clientes ? `${v.clientes.nombre} ${v.clientes.apellido}` : 'sin cliente'
        } · ${fmt.format(Number(v.total))} · ${v.metodo_pago}`
      );
    }
    lineas.push('');
    lineas.push('Desglose por método de pago:');
    for (const [metodo, total] of porMetodo) {
      lineas.push(`- ${metodo}: ${fmt.format(total)}`);
    }
    if (hayPendientes) {
      lineas.push('');
      lineas.push('Mesas pendientes para el próximo turno:');
      for (const p of mesasPendientes ?? []) {
        lineas.push(`- Mesa ${p.mesas?.label ?? p.mesa_id} (${p.estado})`);
      }
    }
    if (insumosBajo?.length) {
      lineas.push('');
      lineas.push('Insumos con stock bajo:');
      for (const i of insumosBajo) {
        lineas.push(`- ${i.nombre}: ${i.stock} ${i.unidad} (mínimo ${i.stock_min})`);
      }
    }
    return lineas.join('\n');
  }

  function generarMail() {
    const asunto = `Cierre de turno ${turno.etiqueta} — ${new Date().toLocaleDateString('es-AR')}`;
    const cuerpo = generarResumenTexto();
    const destino = email.trim();
    window.location.href = `mailto:${destino}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  }

  return (
    <div className="pedido-overlay" onClick={onClose}>
      <div className="pedido-modal" style={{ width: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="pedido-modal-header">
          <h3>🔒 Cierre de turno</h3>
          <button className="pedido-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={{ padding: 'var(--space-5)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            {turno.etiqueta} · {new Date(turno.abierto_at).toLocaleDateString('es-AR')}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-3)' }}>
            <div className="card card-pad" style={{ borderLeft: '3px solid var(--terracota)' }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{ventas?.length ?? 0}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>Mesas cobradas</div>
            </div>
            <div className="card card-pad" style={{ borderLeft: '3px solid var(--terracota)' }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt.format(facturado)}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>Total facturado</div>
            </div>
            <div className="card card-pad" style={{ borderLeft: '3px solid var(--terracota)' }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{mesasPendientes?.length ?? 0}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>Mesas pendientes</div>
            </div>
          </div>

          <div>
            <div className="field-label" style={{ marginBottom: 8 }}>
              Detalle de ventas del turno
            </div>
            {!ventas?.length ? (
              <p style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Todavía no se cobró ninguna mesa en este turno.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Mesa</th>
                      <th>Hora</th>
                      <th>Cliente</th>
                      <th>Total</th>
                      <th>Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.map((v) => (
                      <tr key={v.id}>
                        <td>{v.mesas?.label ?? v.mesa_id ?? 'Take away'}</td>
                        <td>{new Date(v.created_at).toLocaleTimeString('es-AR')}</td>
                        <td>{v.clientes ? `${v.clientes.nombre} ${v.clientes.apellido}` : '—'}</td>
                        <td>{fmt.format(Number(v.total))}</td>
                        <td>{v.metodo_pago}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {porMetodo.size > 0 && (
            <div>
              <div className="field-label" style={{ marginBottom: 8 }}>
                Desglose por medio de pago
              </div>
              <div className="card card-pad">
                {[...porMetodo.entries()].map(([metodo, total]) => (
                  <div key={metodo} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{metodo}</span>
                    <strong>{fmt.format(total)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="field-label" style={{ marginBottom: 8 }}>
              Mesas pendientes {esUltimoTurnoDelDia ? '' : 'para el próximo turno'}
            </div>
            {!hayPendientes ? (
              <p style={{ fontSize: 12.5, color: 'var(--green)' }}>Ninguna — todas las mesas están libres o cobradas. ✅</p>
            ) : (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {mesasPendientes!.map((p, i) => (
                  <span key={i} className="badge badge-warn">
                    Mesa {p.mesas?.label ?? p.mesa_id}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="field-label" style={{ marginBottom: 8 }}>
              Insumos con stock bajo
            </div>
            {!insumosBajo?.length ? (
              <p style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Ninguno por ahora.</p>
            ) : (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {insumosBajo.map((i) => (
                  <span key={i.id} className="badge badge-warn">
                    {i.nombre} ({i.stock} {i.unidad})
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="field-label" style={{ marginBottom: 8 }}>
              Enviar este resumen por mail
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 8px' }}>
              Esto arma el mail con todo el resumen y lo abre en tu programa de correo — solo falta confirmarlo desde ahí.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <TextInput placeholder="dueño@cafeteria.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: 1 }} />
              <Button variant="secondary" onClick={generarMail} disabled={!email.trim()}>
                ✉️ Generar mail
              </Button>
            </div>
          </div>

          {bloqueaCierre && (
            <p style={{ color: 'var(--red)', fontSize: 13, background: 'var(--red-soft)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', margin: 0 }}>
              No se puede cerrar el turno tarde con mesas pendientes de cobro — es el último turno del día, no hay a quién pasárselas. Cobrá o cancelá esas mesas primero.
            </p>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant="danger"
              disabled={bloqueaCierre || cerrar.isPending}
              onClick={async () => {
                await cerrar.mutateAsync();
                onClose();
              }}
            >
              🔒 Confirmar cierre de turno
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
