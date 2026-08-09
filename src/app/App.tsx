import { useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { RequireRole } from '../auth/RequireRole';
import { LoginScreen } from '../features/auth/LoginScreen';
import { SalonView } from '../features/salon/components/SalonView';
import { AdminPanel } from '../features/admin/AdminPanel';
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

function Shell() {
  const { session, profile, signOut } = useAuth();
  const [vista, setVista] = useState<'salon' | 'admin'>('salon');
  const iniciales = (profile?.nombre ?? session?.user.email ?? '?').slice(0, 1).toUpperCase();

  return (
    <div>
      <header className="shell-header">
        <div className="shell-brand">☕ ComandaCafé</div>

        <div className="shell-right">
          <RequireRole rol="admin">
            <nav className="shell-nav">
              <button className={vista === 'salon' ? 'active' : ''} onClick={() => setVista('salon')}>
                Salón
              </button>
              <button className={vista === 'admin' ? 'active' : ''} onClick={() => setVista('admin')}>
                Administración
              </button>
            </nav>
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
        {vista === 'admin' && profile?.rol === 'admin' ? <AdminPanel /> : <SalonView />}
      </main>
    </div>
  );
}
