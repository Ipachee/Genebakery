import { useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { RequireRole } from '../auth/RequireRole';
import { LoginScreen } from '../features/auth/LoginScreen';
import { SalonView } from '../features/salon/components/SalonView';
import { AdminPanel } from '../features/admin/AdminPanel';
import { ComanderaView } from '../features/comandera/components/ComanderaView';
import { AjustesView } from '../features/ajustes/components/AjustesView';
import { TurnoProvider } from '../features/turnos/TurnoContext';
import { TurnoBadge } from '../features/turnos/components/TurnoBadge';
import './shell.css';

export function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return <p style={{ padding: 24 }}>Cargando…</p>;
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <TurnoProvider>
      <Shell />
    </TurnoProvider>
  );
}

type Vista = 'salon' | 'comandera' | 'admin' | 'ajustes';

function Shell() {
  const { session, profile, signOut } = useAuth();
  const [vista, setVista] = useState<Vista>('salon');
  const iniciales = (profile?.nombre ?? session?.user.email ?? '?').slice(0, 1).toUpperCase();
  const esAdmin = profile?.rol === 'admin';

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
        {vista === 'admin' && esAdmin && <AdminPanel />}
        {vista === 'ajustes' && esAdmin && <AjustesView />}
        {vista === 'comandera' && <ComanderaView />}
        {(vista === 'salon' || (!esAdmin && (vista === 'admin' || vista === 'ajustes'))) && <SalonView />}
      </main>
    </div>
  );
}
