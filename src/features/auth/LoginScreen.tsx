import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useTurnosPublico } from '../turnos/hooks';
import { useRolesPersonalizados } from '../permisos/hooks';
import { CUENTAS } from './accounts';

// Admin no se loguea acá — se accede desde adentro de un turno con el
// candadito 🔑 del header, sin perder la sesión de mozo abierta.
// Turnos (Mañana/Tarde/Noche): acceso de todos los días, tarjetas grandes.
const TURNOS = CUENTAS.filter((c) => c.id !== 'admin' && 'etiqueta' in c);
import './LoginScreen.css';

// Un "cargo" (RRHH y lo que se vaya agregando con + Nuevo cargo) es
// cualquier fila de roles_personalizados -- a diferencia de los turnos,
// no vive hardcodeado en accounts.ts, así que un cargo nuevo aparece acá
// solo con insertar la fila, sin tocar código. El email de login se arma
// con la misma convención que ya usan las cuentas fijas (clave@dominio).
type Cargo = { clave: string; etiqueta: string; icono: string };

function emailDeCargo(clave: string) {
  return `${clave}@comandacafe.local`;
}

function useReloj() {
  const [ahora, setAhora] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return ahora;
}

export function LoginScreen() {
  const { signIn } = useAuth();
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuCargosAbierto, setMenuCargosAbierto] = useState(false);
  const [cargoAbierto, setCargoAbierto] = useState<Cargo | null>(null);
  const [passwordCargo, setPasswordCargo] = useState('');
  const [errorCargo, setErrorCargo] = useState<string | null>(null);
  const [entrandoCargo, setEntrandoCargo] = useState(false);
  const ahora = useReloj();
  const { data: turnosPublico } = useTurnosPublico();
  const { data: rolesPersonalizados } = useRolesPersonalizados();

  const cargos: Cargo[] = (rolesPersonalizados ?? []).map((r) => ({ clave: r.clave, etiqueta: r.etiqueta, icono: r.icono ?? '🗂️' }));

  function turnoAbierto(opcion: (typeof TURNOS)[number]) {
    return turnosPublico?.some((t) => t.etiqueta === opcion.etiqueta && t.estado === 'abierto') ?? false;
  }

  async function handleSubmit(e: FormEvent, opcion: (typeof TURNOS)[number]) {
    e.preventDefault();
    setError(null);
    setSubmitting(opcion.id);
    const { error } = await signIn(opcion.email, passwords[opcion.id] ?? '');
    setSubmitting(null);
    if (error) setError(`${opcion.label}: contraseña incorrecta`);
  }

  async function handleSubmitCargo(e: FormEvent) {
    e.preventDefault();
    if (!cargoAbierto) return;
    setErrorCargo(null);
    setEntrandoCargo(true);
    const { error } = await signIn(emailDeCargo(cargoAbierto.clave), passwordCargo);
    setEntrandoCargo(false);
    if (error) setErrorCargo('Contraseña incorrecta');
    else {
      setCargoAbierto(null);
      setPasswordCargo('');
    }
  }

  return (
    <div className="login-screen">
      <div className="login-brand">
        <div className="login-mark">☕</div>
        <h1 className="login-title">ComandaCafé</h1>
        <p className="login-subtitle">Elegí tu acceso e ingresá la contraseña</p>
        <span className="login-clock">
          🕐 {ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} ·{' '}
          {ahora.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>

      <div className="shift-cards">
        {TURNOS.map((opcion) => (
          <form key={opcion.id} className="shift-card" onSubmit={(e) => handleSubmit(e, opcion)}>
            <span className="shift-icon-wrap">
              <span className="shift-icon">{opcion.icon}</span>
            </span>
            <span className="shift-name">{opcion.label}</span>
            {turnoAbierto(opcion) && (
              <span className="shift-status-abierto">
                <span className="shift-status-dot" /> turno abierto
              </span>
            )}
            <input
              type="password"
              placeholder="Contraseña"
              value={passwords[opcion.id] ?? ''}
              onChange={(e) => setPasswords({ ...passwords, [opcion.id]: e.target.value })}
              required
            />
            <button type="submit" disabled={submitting === opcion.id}>
              {submitting === opcion.id ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        ))}
      </div>
      {error && <p className="login-error">{error}</p>}

      {cargos.length > 0 && (
        <div className="cargos-flotante">
          {menuCargosAbierto && (
            <>
              <div className="cargos-fondo" onClick={() => setMenuCargosAbierto(false)} />
              <div className="cargos-panel">
                <span className="cargos-panel-titulo">Cargos</span>
                {cargos.map((c) => (
                  <button
                    key={c.clave}
                    type="button"
                    className="cargos-item"
                    onClick={() => {
                      setMenuCargosAbierto(false);
                      setCargoAbierto(c);
                      setErrorCargo(null);
                      setPasswordCargo('');
                    }}
                  >
                    <span className="cargos-item-icono">{c.icono}</span>
                    {c.etiqueta}
                  </button>
                ))}
              </div>
            </>
          )}
          <button type="button" className="cargos-boton" onClick={() => setMenuCargosAbierto((v) => !v)}>
            🗂️ Cargos
          </button>
        </div>
      )}

      {cargoAbierto && (
        <div className="cargo-modal-fondo" onClick={() => setCargoAbierto(null)}>
          <form className="cargo-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmitCargo}>
            <span className="shift-icon-wrap">
              <span className="shift-icon">{cargoAbierto.icono}</span>
            </span>
            <span className="shift-name">{cargoAbierto.etiqueta}</span>
            <input
              type="password"
              autoFocus
              placeholder="Contraseña"
              value={passwordCargo}
              onChange={(e) => setPasswordCargo(e.target.value)}
              required
            />
            {errorCargo && <p className="login-error">{errorCargo}</p>}
            <button type="submit" disabled={entrandoCargo}>
              {entrandoCargo ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
