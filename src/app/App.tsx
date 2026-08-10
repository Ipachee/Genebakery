import { useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { RequireRole } from '../auth/RequireRole';
import { LoginScreen } from '../features/auth/LoginScreen';
import { AdminUnlock } from '../features/auth/components/AdminUnlock';
import { SalonView } from '../features/salon/components/SalonView';
import { AdminPanel } from '../features/admin/AdminPanel';
import { ComanderaView } from '../features/comandera/components/ComanderaView';
import { AjustesView } from '../features/ajustes/components/AjustesView';
import { TurnoProvider } from '../features/turnos/TurnoContext';
import { TurnoBadge } from '../features/turnos/components/TurnoBadge';
import { useTurnoActual } from '../features/turnos/useTurnoActual';
import { useNuevaVersion } from './useNuevaVersion';
import { Button } from '../components/Button';
import './shell.css';

export function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return <p style={{ padding: 24 }}>Cargando…</p>;
  }

  return (
    <>
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

type Vista = 'salon' | 'comandera' | 'admin' | 'ajustes';

function Shell() {
  const { session, profile, signOut, puedeVolverATurno, volverATurno } = useAuth();
  const { error: turnoError, reintentar: reintentarTurno } = useTurnoActual();
  const [vista, setVista] = useState<Vista>('salon');
  const iniciales = (profile?.nombre ?? session?.user.email ?? '?').slice(0, 1).toUpperCase();
  const esAdmin = profile?.rol === 'admin';
  const bloqueadoPorTurno = profile?.rol === 'mozo' && !!turnoError;

  return (
    <div>
      <header className="shell-header">
        <div className="shell-brand">☕ ComandaCafé</div>

        <div className="shell-right">
          <nav className="shell-nav">
            <button className={vista === 'salon' ? 'active' : ''} onClick={() => setVista('salon')}>
              Salón
            </button>
            <button className={vista === 'comandera' ? 'active' : ''} onClick={() => setVista('comandera')}>
              Comandera
            </button>
            <RequireRole rol="admin">
              <button className={vista === 'admin' ? 'active' : ''} onClick={() => setVista('admin')}>
                Administración
              </button>
            </RequireRole>
          </nav>

          <RequireRole rol="admin">
            <button
              className="shell-signout"
              title="Ajustes"
              aria-label="Ajustes"
              onClick={() => setVista('ajustes')}
              style={{ background: vista === 'ajustes' ? 'rgba(255,255,255,0.18)' : undefined }}
            >
              ⚙️
            </button>
          </RequireRole>

          {profile?.rol === 'mozo' && !puedeVolverATurno && <AdminUnlock onSuccess={() => setVista('admin')} />}

          {puedeVolverATurno && (
            <button
              className="shell-signout"
              onClick={async () => {
                await volverATurno();
                setVista('salon');
              }}
            >
              ↩ Volver a mi turno
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
        </div>
      </header>
      <main className="shell-main">
        {bloqueadoPorTurno ? (
          <TurnoBloqueado mensaje={turnoError!} onReintentar={reintentarTurno} onVolverATurnos={signOut} />
        ) : (
          <>
            {vista === 'admin' && esAdmin && <AdminPanel />}
            {vista === 'ajustes' && esAdmin && <AjustesView />}
            {vista === 'comandera' && <ComanderaView />}
            {(vista === 'salon' || (!esAdmin && (vista === 'admin' || vista === 'ajustes'))) && <SalonView />}
          </>
        )}
      </main>
    </div>
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
