import { useState } from 'react';
import { useAuth } from '../../../auth/useAuth';
import {
  useCerrarTurno,
  useEnviarResumenPorMail,
  useFacturadoTurno,
  useInsumosStockBajo,
  useMesasPendientesDelTurno,
  useResumenGastosDia,
  useVentasDelTurno,
} from '../hooks';
import { usePerfilNegocio } from '../../negocio/hooks';
import { generarPdfCierre } from '../cierrePdf';
import { Button } from '../../../components/Button';
import { TextInput } from '../../../components/Field';
import { fmtMoney as fmt } from '../../../lib/format';
import { useOnlineStatus } from '../../../app/useOnlineStatus';
import type { Database } from '../../../lib/supabase/types';

type Turno = Database['public']['Tables']['turnos']['Row'];

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CierreTurnoModal({ turno, onClose }: { turno: Turno; onClose: () => void }) {
  const { signOut } = useAuth();
  const online = useOnlineStatus();
  const { data: ventas } = useVentasDelTurno(turno.id);
  const { data: facturado = 0 } = useFacturadoTurno(turno.id);
  const { data: mesasPendientes } = useMesasPendientesDelTurno(turno.id);
  const { data: insumosBajo } = useInsumosStockBajo();
  const { data: perfil } = usePerfilNegocio();
  // Fecha local del turno (no el ISO en UTC) -- gastos.fecha/pagos_empleados.fecha
  // son un date sin horario, cargados con la fecha del día real.
  const fechaTurno = (() => {
    const d = new Date(turno.abierto_at);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const { data: gastosDia } = useResumenGastosDia(fechaTurno);
  const cerrar = useCerrarTurno(turno.id);
  const enviarMail = useEnviarResumenPorMail();
  const [email, setEmail] = useState('');
  const [envioOk, setEnvioOk] = useState(false);
  const [envioError, setEnvioError] = useState<string | null>(null);
  const [efectivoContado, setEfectivoContado] = useState('');

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

  // Arqueo: fondo con el que abrió + lo cobrado en efectivo este turno es
  // lo que "debería" haber en la caja. Los pagos divididos ya quedan como
  // una fila de ventas por método (ver fn_cobrar_pedido), así que sumar
  // "Efectivo" acá ya incluye la parte en efectivo de un cobro dividido.
  const efectivoApertura = Number(turno.efectivo_apertura ?? 0);
  const efectivoCobrado = porMetodo.get('Efectivo') ?? 0;
  const efectivoEsperado = efectivoApertura + efectivoCobrado;
  const efectivoContadoNum = efectivoContado.trim() === '' ? null : Number(efectivoContado);
  const diferenciaCaja = efectivoContadoNum != null ? efectivoContadoNum - efectivoEsperado : null;

  // El dueño quiere que sí o sí quede un conteo de caja y un mail de
  // contacto antes de poder cerrar -- no hace falta que el mail se haya
  // mandado de verdad (eso depende de un servicio externo, no queremos que
  // un problema de Resend le impida a alguien cerrar su turno), alcanza con
  // que los dos campos estén completos y con formato válido.
  const faltaArqueo = efectivoContadoNum == null;
  const faltaEmail = !emailValido;
  const faltanObligatorios = faltaArqueo || faltaEmail;

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
      efectivoContado: efectivoContadoNum,
      gastosDia: gastosDia ?? [],
    });
  }

  const totalGastosDia = (gastosDia ?? []).reduce((s, g) => s + Number(g.monto), 0);

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
          <button className="pedido-close" aria-label="Cerrar" onClick={onClose}>
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

          {!!gastosDia?.length && (
            <div>
              <div className="field-label" style={{ marginBottom: 8 }}>
                Gastos del día
              </div>
              <div className="card card-pad">
                {gastosDia.map((g, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text)' }}>
                      {g.concepto} <span style={{ color: 'var(--text-dim)', fontSize: 11.5 }}>({g.tipo})</span>
                    </span>
                    <strong style={{ color: 'var(--red)' }}>-{fmt.format(Number(g.monto))}</strong>
                  </div>
                ))}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    fontWeight: 700,
                    borderTop: '1px dashed var(--border)',
                    paddingTop: 6,
                    marginTop: 4,
                  }}
                >
                  <span>Neto (facturado − gastos)</span>
                  <span style={{ color: facturado - totalGastosDia >= 0 ? 'var(--terracota-dark)' : 'var(--red)' }}>
                    {fmt.format(facturado - totalGastosDia)}
                  </span>
                </div>
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
              Arqueo de caja <span style={{ color: 'var(--red)' }}>*</span>
            </div>
            <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-dim)' }}>Fondo inicial</span>
                <span style={{ color: 'var(--text)' }}>{fmt.format(efectivoApertura)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-dim)' }}>+ Efectivo cobrado</span>
                <span style={{ color: 'var(--text)' }}>{fmt.format(efectivoCobrado)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--text)',
                  borderTop: '1px dashed var(--border)',
                  paddingTop: 6,
                }}
              >
                <span>= Debería haber</span>
                <span>{fmt.format(efectivoEsperado)}</span>
              </div>
              <TextInput
                type="number"
                min={0}
                placeholder="Contá el efectivo de la caja y poné el monto acá"
                value={efectivoContado}
                onChange={(e) => setEfectivoContado(e.target.value)}
              />
              {diferenciaCaja != null && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: diferenciaCaja === 0 ? 'var(--green)' : Math.abs(diferenciaCaja) <= 50 ? 'var(--text-dim)' : 'var(--red)',
                  }}
                >
                  {diferenciaCaja === 0
                    ? '✓ Coincide exacto.'
                    : diferenciaCaja > 0
                      ? `Sobran ${fmt.format(diferenciaCaja)}.`
                      : `Faltan ${fmt.format(-diferenciaCaja)}.`}
                </p>
              )}
            </div>
          </div>

          <div>
            <div className="field-label" style={{ marginBottom: 8 }}>
              Resumen en PDF <span style={{ color: 'var(--red)' }}>*</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 8px' }}>
              Incluye membrete del negocio, gráfico de ventas por medio de pago y el detalle completo. Se manda de
              verdad por mail (no abre tu programa de correo). El mail de abajo es obligatorio para poder cerrar el
              turno, aunque no llegues a apretar "Enviar por mail".
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

          {!bloqueaCierre && faltanObligatorios && (
            <p style={{ color: 'var(--red)', fontSize: 13, background: 'var(--red-soft)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', margin: 0 }}>
              Antes de cerrar hace falta completar: {[faltaArqueo && 'el efectivo contado en el arqueo de caja', faltaEmail && 'un mail válido'].filter(Boolean).join(' y ')}.
            </p>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            {!online && (
              <p style={{ color: 'var(--red)', fontSize: 12, margin: 0 }}>
                📡 Sin conexión: necesitás internet para cerrar el turno.
              </p>
            )}
            <Button
              variant="danger"
              disabled={bloqueaCierre || faltanObligatorios || cerrar.isPending || !online}
              onClick={async () => {
                await cerrar.mutateAsync(efectivoContadoNum);
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
