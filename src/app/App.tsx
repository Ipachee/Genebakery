import { useState, type ComponentType } from 'react';
import { useAuth } from '../auth/useAuth';
import { LoginScreen } from '../features/auth/LoginScreen';
import { AdminUnlock } from '../features/auth/components/AdminUnlock';
import { SalonView } from '../features/salon/components/SalonView';
import { InsumosView } from '../features/insumos/components/InsumosView';
import { MovimientosView } from '../features/movimientos/components/MovimientosView';
import { ProveedoresView } from '../features/proveedores/components/ProveedoresView';
import { CategoriasView } from '../features/categorias/components/CategoriasView';
import { RecetasView } from '../features/recetas/components/RecetasView';
import { ElaboradosView } from '../features/elaborados/components/ElaboradosView';
import { VentasView } from '../features/ventas/components/VentasView';
import { GastosView } from '../features/gastos/components/GastosView';
import { CobranzasView } from '../features/cobranzas/components/CobranzasView';
import { ReportesView } from '../features/reportes/components/ReportesView';
import { EmpleadosView } from '../features/empleados/components/EmpleadosView';
import { ClientesView } from '../features/clientes/components/ClientesView';
import { CalendarioView } from '../features/calendario/components/CalendarioView';
import { PapeleraView } from '../features/papelera/components/PapeleraView';
import { ComanderaView } from '../features/comandera/components/ComanderaView';
import { AjustesView } from '../features/ajustes/components/AjustesView';
import { TurnoProvider } from '../features/turnos/TurnoContext';
import { TurnoBadge } from '../features/turnos/components/TurnoBadge';
import { AperturaCajaModal } from '../features/turnos/components/AperturaCajaModal';
import { useTurnoActual } from '../features/turnos/useTurnoActual';
import { useNuevaVersion } from './useNuevaVersion';
import { useOnlineStatus } from './useOnlineStatus';
import { useCobrosPendientes } from '../features/pedidos/hooks';
import { Button } from '../components/Button';
import { AppShell } from './AppShell';
import { idVisiblePara, primeraSeccionVisible, type Rol, type SeccionId } from './nav';
import { usePermisosNavegacion } from '../features/permisos/hooks';
import { useTheme } from './useTheme';
import { usePersistido } from './usePersistido';
import './shell.css';

const REGISTRO: Record<SeccionId, ComponentType> = {
  salon: SalonView,
  comandera: ComanderaView,
  insumos: InsumosView,
  movimientos: MovimientosView,
  proveedores: ProveedoresView,
  categorias: CategoriasView,
  recetas: RecetasView,
  elaborados: ElaboradosView,
  ventas: VentasView,
  gastos: GastosView,
  reportes: ReportesView,
  cobranzas: CobranzasView,
  empleados: EmpleadosView,
  clientes: ClientesView,
  calendario: CalendarioView,
  ajustes: AjustesView,
  papelera: PapeleraView,
};

export function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return <p style={{ padding: 24 }}>Cargando…</p>;
  }

  return (
    <>
      <BannerOffline />
      <BannerCobrosPendientes />
      {!session ? (
        <LoginScreen />
      ) : (
        <TurnoProvider>
          <Shell />
        </TurnoProvider>
      )}
      <BannerNuevaVersion />
    </>
  );
}

function BannerOffline() {
  const online = useOnlineStatus();
  if (online) return null;
  // Sin position:fixed a propósito: el header ya es sticky (relativo a su
  // posición en el flujo normal), así que este banner tiene que vivir
  // ARRIBA de él en el documento para empujarlo hacia abajo en vez de
  // taparlo.
  return (
    <div
      style={{
        background: 'var(--red)',
        color: '#fff',
        padding: '8px 16px',
        textAlign: 'center',
        fontSize: 12.5,
        fontWeight: 600,
        position: 'relative',
        zIndex: 250,
      }}
    >
      📡 Sin conexión — se ve el último plano guardado. Podés seguir armando pedidos y cobrando (el cobro queda
      pendiente hasta que vuelva internet); enviar a cocina y transferir no funcionan. No cierres ni recargues la
      página si acabás de cobrar algo — se pierde ese cobro.
    </div>
  );
}

// Se muestra haya o no conexión: el hueco de riesgo real no es solo "estoy
// offline" sino también el ratito después de volver la señal en el que el
// cobro todavía no terminó de viajar al servidor -- mientras exista, no hay
// que cerrar ni recargar la pestaña o ese cobro se pierde (las mutaciones
// pendientes no sobreviven a un recargado, a propósito, ver providers.tsx).
function BannerCobrosPendientes() {
  const pendientes = useCobrosPendientes();
  if (pendientes === 0) return null;
  return (
    <div
      style={{
        background: 'var(--amber)',
        color: '#3b2418',
        padding: '8px 16px',
        textAlign: 'center',
        fontSize: 12.5,
        fontWeight: 600,
        position: 'relative',
        zIndex: 250,
      }}
    >
      🧾 {pendientes} cobro{pendientes > 1 ? 's' : ''} esperando conexión para confirmarse — no cierres ni recargués
      esta pestaña hasta que se confirme.
    </div>
  );
}

function BannerNuevaVersion() {
  const hayNueva = useNuevaVersion();
  if (!hayNueva) return null;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        background: 'var(--brown-dark)',
        color: '#fff',
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        fontSize: 12.5,
        flexWrap: 'wrap',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <span>Hay una versión nueva de ComandaCafé.</span>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: 'var(--terracota)',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '6px 14px',
          fontWeight: 700,
          fontSize: 12.5,
          cursor: 'pointer',
        }}
      >
        ↺ Actualizar
      </button>
    </div>
  );
}

function Shell() {
  const { session, profile, signOut, puedeVolverATurno, volverATurno } = useAuth();
  const { turno, error: turnoError, reintentar: reintentarTurno } = useTurnoActual();
  // Persistido (no un useState suelto) -- si el navegador descarta esta
  // pestaña de fondo y la recarga entera al volver (pasa seguido en el
  // celu con poca memoria, o simplemente al cambiar de pestaña un rato),
  // antes esto volvía siempre a "salon" perdiendo en qué pantalla estaba
  // parado (ej. a mitad de cargar una credencial en Ajustes).
  const [seccion, setSeccion] = usePersistido<SeccionId>('comandacafe-ultima-seccion', 'salon');
  const [omitirAperturaCaja, setOmitirAperturaCaja] = useState(false);
  const iniciales = (profile?.nombre ?? session?.user.email ?? '?').slice(0, 1).toUpperCase();
  // Cualquier rol real (admin/mozo/encargado/un cargo nuevo) pasa tal cual
  // -- antes esto colapsaba todo lo que no fuera admin/encargado en
  // "mozo", lo cual estaba bien cuando esos eran los únicos 3 roles, pero
  // con cargos dinámicos (+ Nuevo cargo) un cargo nuevo necesita su propia
  // columna de permisos, no heredar la de mozo.
  const rol: Rol = profile?.rol ?? 'mozo';
  const { permisos } = usePermisosNavegacion();
  const bloqueadoPorTurno = profile?.rol === 'mozo' && !!turnoError;
  // Cuando está bloqueado por turno no se renderiza el AppShell (no hay
  // sidebar ni contenido real que mostrar todavía), así que el toggle de
  // tema -- que vive en el topbar de AppShell -- se pierde justo en esta
  // pantalla. Se repite acá suelto para que no haga falta quedarse en modo
  // claro forzado hasta resolver el bloqueo.
  const { theme, toggleTheme } = useTheme();
  // Se pide una sola vez por turno recién creado (efectivo_apertura arranca
  // en null) -- si ya se registró, o el mozo la omite, no vuelve a
  // aparecer hasta el próximo turno nuevo.
  const pedirAperturaCaja = !!turno && turno.estado === 'abierto' && turno.efectivo_apertura == null && !omitirAperturaCaja;

  // Defensivo: el filtrado por rol vive en el árbol de navegación (así no
  // se ve el ítem), pero si por lo que sea `seccion` termina apuntando a
  // algo que este rol no puede ver (ej. quedó guardado de una sesión admin
  // anterior en la misma pestaña), no renderiza esa pantalla igual --
  // el permiso real de todos modos lo valida cada policy de Supabase.
  const seccionValida = idVisiblePara(rol, seccion, permisos);
  const seccionEfectiva = seccionValida ? seccion : primeraSeccionVisible(rol, permisos);
  const Contenido = seccionEfectiva ? REGISTRO[seccionEfectiva] : null;

  return (
    <>
      {bloqueadoPorTurno ? (
        <main className="app-content" style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-3)' }}>
            <button
              className="app-theme-toggle"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Cambiar a modo oscuro (Espresso)' : 'Cambiar a modo claro (Organic)'}
              aria-label="Cambiar tema"
            >
              {theme === 'light' ? '☀️' : '🌙'}
            </button>
          </div>
          <TurnoBloqueado mensaje={turnoError!} onReintentar={reintentarTurno} onVolverATurnos={signOut} />
        </main>
      ) : (
        <AppShell
          rol={rol}
          activo={seccionEfectiva}
          permisos={permisos}
          onNavigate={setSeccion}
          accionesMenu={
            // mozo Y encargado/cargos pueden desbloquear admin puntualmente
            // sin cerrar sesión -- el mismo mecanismo de siempre. En celular
            // vive en el cajón del menú en vez de la topbar (ver AppShell).
            profile?.rol !== 'admin' && !puedeVolverATurno ? <AdminUnlock onSuccess={() => setSeccion('insumos')} /> : null
          }
          topbarRight={
            <>
              {puedeVolverATurno && (
                <button
                  className="shell-signout"
                  onClick={async () => {
                    const { error } = await volverATurno();
                    if (error) {
                      alert(`No se pudo volver a tu cuenta (${error}). Probá de nuevo; si sigue igual, cerrá sesión y volvé a entrar con tu clave.`);
                      return;
                    }
                    setSeccion('salon');
                  }}
                >
                  ↩ Volver a mi cuenta
                </button>
              )}

              <TurnoBadge />

              <div className="shell-user">
                <span className="shell-user-avatar">{iniciales}</span>
                <span>{profile?.nombre ?? session?.user.email}</span>
                <span className="shell-role">{profile?.rol ?? '…'}</span>
              </div>

              <button className="shell-signout" onClick={signOut}>
                Salir
              </button>
            </>
          }
        >
          {Contenido ? (
            <Contenido />
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 16px' }}>
              <div className="card card-pad" style={{ maxWidth: 420, textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 14 }}>
                  Todavía no tenés ninguna sección habilitada. Pedile a un admin que te tilde algo en Ajustes → Roles y
                  permisos.
                </p>
              </div>
            </div>
          )}
        </AppShell>
      )}
      {pedirAperturaCaja && <AperturaCajaModal turno={turno!} onClose={() => setOmitirAperturaCaja(true)} />}
    </>
  );
}

function TurnoBloqueado({
  mensaje,
  onReintentar,
  onVolverATurnos,
}: {
  mensaje: string;
  onReintentar: () => void;
  onVolverATurnos: () => void;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 16px' }}>
      <div className="card card-pad" style={{ maxWidth: 440, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 30 }}>🔒</div>
        <h3 style={{ margin: 0 }}>No se pudo abrir el turno</h3>
        <p style={{ margin: 0, color: 'var(--red)', fontSize: 13.5, fontWeight: 600 }}>{mensaje}</p>
        <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: 12.5 }}>
          Entrá con la cuenta de ese turno para cerrarlo desde ahí. Después volvé a entrar con esta cuenta.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <Button onClick={onVolverATurnos}>↩ Volver a turnos</Button>
          <Button variant="secondary" onClick={onReintentar}>
            ↺ Reintentar
          </Button>
        </div>
      </div>
    </div>
  );
}
