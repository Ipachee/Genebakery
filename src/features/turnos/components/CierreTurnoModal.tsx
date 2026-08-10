import { useState } from 'react';
import { useAuth } from '../../../auth/useAuth';
import {
  useCerrarTurno,
  useEnviarResumenPorMail,
  useFacturadoTurno,
  useInsumosStockBajo,
  useMesasPendientesDelTurno,
  useVentasDelTurno,
} from '../hooks';
import { usePerfilNegocio } from '../../negocio/hooks';
import { generarPdfCierre } from '../cierrePdf';
import { Button } from '../../../components/Button';
import { TextInput } from '../../../components/Field';
import type { Database } from '../../../lib/supabase/types';

type Turno = Database['public']['Tables']['turnos']['Row'];

const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CierreTurnoModal({ turno, onClose }: { turno: Turno; onClose: () => void }) {
  const { signOut } = useAuth();
  const { data: ventas } = useVentasDelTurno(turno.id);
  const { data: facturado = 0 } = useFacturadoTurno(turno.id);
  const { data: mesasPendientes } = useMesasPendientesDelTurno(turno.id);
  const { data: insumosBajo } = useInsumosStockBajo();
  const { data: perfil } = usePerfilNegocio();
  const cerrar = useCerrarTurno(turno.id);
  const enviarMail = useEnviarResumenPorMail();
  const [email, setEmail] = useState('');
  const [envioOk, setEnvioOk] = useState(false);
  const [envioError, setEnvioError] = useState<string | null>(null);

  // Mañana y Tarde siempre pueden pasarle mesas pendientes al siguiente
  // turno (aunque ese dia no se termine usando Noche, la mesa queda
  // pendiente para quien abra despues, sin bloquear el cierre). Noche es el
  // ultimo eslabon posible de la cadena, sin importar el dia -- si alguna
  // vez se abre (una cena especial un martes, por ejemplo), es la unica que
  // no tiene a quien pasarle mesas sin cobrar.
  const esUltimoTurnoDelDia = turno.etiqueta === 'Noche';
  const hayPendientes = (mesasPendientes?.length ?? 0) > 0;
  const bloqueaCierre = esUltimoTurnoDelDia && hayPendientes;
  const emailValido = EMAIL_VALIDO.test(email.trim());

  const porMetodo = new Map<string, number>();
  for (const v of ventas ?? []) {
    porMetodo.set(v.metodo_pago, (porMetodo.get(v.metodo_pago) ?? 0) + Number(v.total));
  }

  function nombreArchivo() {
    return `cierre-turno-${turno.etiqueta.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`;
  }

  function construirPdf() {
    return generarPdfCierre({
      turno,
      perfil: perfil ?? null,
      ventas: ventas ?? [],
      facturado,
      mesasPendientes: mesasPendientes ?? [],
      insumosBajo: insumosBajo ?? [],
    });
  }

  function descargarPdf() {
    const blob = construirPdf();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo();
    a.click();
    URL.revokeObjectURL(url);
  }

  async function enviarPorMail() {
    if (!emailValido) return;
    setEnvioError(null);
    setEnvioOk(false);
    try {
      const pdf = construirPdf();
      await enviarMail.mutateAsync({
        to: email.trim(),
        subject: `Cierre de turno ${turno.etiqueta} — ${new Date().toLocaleDateString('es-AR')}`,
        pdf,
        filename: nombreArchivo(),
      });
      setEnvioOk(true);
    } catch (e) {
      setEnvioError(e instanceof Error ? e.message : 'No se pudo enviar el mail');
    }
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

          <div className="stat-grid">
            <div className="card card-pad stat-card">
              <div className="stat-card-value">{ventas?.length ?? 0}</div>
              <div className="stat-card-label">Mesas cobradas</div>
            </div>
            <div className="card card-pad stat-card">
              <div className="stat-card-value">{fmt.format(facturado)}</div>
              <div className="stat-card-label">Total facturado</div>
            </div>
            <div className="card card-pad stat-card">
              <div className="stat-card-value">{mesasPendientes?.length ?? 0}</div>
              <div className="stat-card-label">Mesas pendientes</div>
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
                    <span style={{ color: 'var(--text)' }}>{metodo}</span>
                    <strong style={{ color: 'var(--terracota-dark)' }}>{fmt.format(total)}</strong>
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
              Resumen en PDF
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 8px' }}>
              Incluye membrete del negocio, gráfico de ventas por medio de pago y el detalle completo. Se manda de
              verdad por mail (no abre tu programa de correo).
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <Button variant="secondary" onClick={descargarPdf}>
                📄 Descargar PDF
              </Button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <TextInput
                placeholder="dueño@cafeteria.com"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEnvioOk(false);
                  setEnvioError(null);
                }}
                style={{ flex: 1 }}
              />
              <Button variant="secondary" onClick={enviarPorMail} disabled={!emailValido || enviarMail.isPending}>
                {enviarMail.isPending ? 'Enviando…' : '✉️ Enviar por mail'}
              </Button>
            </div>
            {email.trim() && !emailValido && (
              <p style={{ fontSize: 11.5, color: 'var(--red)', margin: '6px 0 0' }}>Ingresá un email válido (con @ y dominio).</p>
            )}
            {envioOk && <p style={{ fontSize: 12, color: 'var(--green)', margin: '6px 0 0' }}>✓ Mail enviado.</p>}
            {envioError && <p style={{ fontSize: 12, color: 'var(--red)', margin: '6px 0 0' }}>{envioError}</p>}
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
                // Termina la sesión de este turno y vuelve a la pantalla de
                // login para que se pueda elegir el turno siguiente.
                await signOut();
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
