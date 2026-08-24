import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useTurnosPublico } from '../turnos/hooks';
import { useRolesPersonalizados } from '../permisos/hooks';
import { useConfiguracionTurnos } from '../configuracion-turnos/hooks';
import { etiquetasActivasHoy } from '../configuracion-turnos/turnosActivosHoy';
import { turnoPorHora } from './turnoPorHora';
import { CUENTAS } from './accounts';
import './LoginScreen.css';

// Admin y turnos (Mañana/Tarde/Noche) viven hardcodeados en accounts.ts;
// los cargos (RRHH y lo que se agregue con + Nuevo cargo) son dinámicos,
// de roles_personalizados -- ver docs/Permisos.md.
const TODOS_LOS_TURNOS = CUENTAS.filter((c) => c.id !== 'admin' && 'etiqueta' in c);
const ADMIN = CUENTAS.find((c) => c.id === 'admin')!;

const NOMBRE_TURNO: Record<string, string> = { Mañana: 'Encargada Mañana', Tarde: 'Encargada Tarde', Noche: 'Encargada Noche' };
const COLOR_TURNO: Record<string, { fondo: string; texto: string }> = {
  Mañana: { fondo: '#e0793d', texto: '#1a1210' },
  Tarde: { fondo: '#e0793d', texto: '#1a1210' },
  Noche: { fondo: '#4a3e6b', texto: '#e8ddd4' },
};

function emailDeCargo(clave: string) {
  return `${clave}@comandacafe.local`;
}

type Persona = { id: string; email: string; nombre: string; letra: string; fondo: string; texto: string; abierto: boolean };

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
  const ahora = useReloj();
  const { data: turnosPublico } = useTurnosPublico();
  const { data: rolesPersonalizados } = useRolesPersonalizados();
  const { data: configuracionTurnos } = useConfiguracionTurnos();

  const abierto = (etiqueta: string) => turnosPublico?.some((t) => t.etiqueta === etiqueta && t.estado === 'abierto') ?? false;

  // Mientras no cargó la config (o falló), se muestran todos los turnos --
  // que el login se caiga por un fetch que falla sería peor que mostrar un
  // turno de más por un rato. Ver docs/Configuracion-turnos.md.
  //
  // Un turno que quedó ABIERTO de verdad se muestra siempre, aunque hoy no
  // le toque por configuración -- si no, un Noche que quedó sin cerrar de
  // un domingo se vuelve imposible de cerrar un lunes (no aparece su
  // tarjeta para entrar y cerrarlo). El filtro por día solo esconde la
  // opción de EMPEZAR un turno que no corresponde hoy, nunca la de
  // terminar uno que quedó corriendo de antes.
  const activasHoy = configuracionTurnos ? etiquetasActivasHoy(configuracionTurnos) : null;
  const turnosHoy = activasHoy
    ? TODOS_LOS_TURNOS.filter((t) => activasHoy.includes(t.etiqueta) || abierto(t.etiqueta))
    : TODOS_LOS_TURNOS;

  const personasTurno: Persona[] = turnosHoy.map((t) => ({
    id: t.id,
    email: t.email,
    nombre: NOMBRE_TURNO[t.etiqueta] ?? t.label,
    letra: t.etiqueta[0],
    fondo: COLOR_TURNO[t.etiqueta]?.fondo ?? '#e0793d',
    texto: COLOR_TURNO[t.etiqueta]?.texto ?? '#1a1210',
    abierto: abierto(t.etiqueta),
  }));

  const personasCargo: Persona[] = (rolesPersonalizados ?? []).map((r) => ({
    id: r.clave,
    email: emailDeCargo(r.clave),
    nombre: r.etiqueta,
    letra: r.etiqueta[0]?.toUpperCase() ?? '?',
    fondo: '#3f5a52',
    texto: '#e8ddd4',
    abierto: false,
  }));

  const personaAdmin: Persona = { id: 'admin', email: ADMIN.email, nombre: 'Administración', letra: '★', fondo: '', texto: '#c9a24a', abierto: false };

  const personasGrilla = [...personasTurno, ...personasCargo];
  const personasTodas = [...personasGrilla, personaAdmin];

  const turnoDetectado = turnoPorHora(ahora);
  const personaDetectada = personasTurno.find((p) => p.nombre === NOMBRE_TURNO[turnoDetectado]);

  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const personaSeleccionada = personasTodas.find((p) => p.id === seleccionId) ?? personaDetectada ?? personasGrilla[0] ?? null;

  const [pin, setPin] = useState('');
  const [estado, setEstado] = useState<'idle' | 'verificando' | 'ok' | 'error'>('idle');

  function elegirPersona(id: string) {
    setSeleccionId(id);
    setPin('');
    setEstado('idle');
  }

  async function presionar(digito: string) {
    if (!personaSeleccionada || estado === 'verificando' || estado === 'ok' || pin.length >= 4) return;
    const nuevo = pin + digito;
    setPin(nuevo);
    if (nuevo.length !== 4) return;
    setEstado('verificando');
    const { error } = await signIn(personaSeleccionada.email, nuevo);
    if (error) {
      setEstado('error');
      setTimeout(() => {
        setPin('');
        setEstado('idle');
      }, 900);
    } else {
      setEstado('ok');
    }
  }

  function borrar() {
    if (estado === 'verificando' || estado === 'ok') return;
    setPin((p) => p.slice(0, -1));
  }

  return (
    <div className="login-screen">
      <div className="login-card-container">
        <div className="login-brand">
          <div className="login-mark">☕</div>
          <div className="login-name">ComandaCafé</div>
          <div className="login-badge">
            <span className="login-badge-dot" /> Turno {turnoDetectado.toLowerCase()} en curso
          </div>
          <div className="login-fecha">
            {ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} ·{' '}
            {ahora.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>

        <div className="login-grid">
          {personasGrilla.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`login-card ${personaSeleccionada?.id === p.id ? 'seleccionada' : ''}`}
              onClick={() => elegirPersona(p.id)}
            >
              <span className="login-avatar" style={{ background: p.fondo, color: p.texto }}>
                {p.letra}
                {p.abierto && <span className="login-avatar-dot" aria-label="turno abierto" />}
              </span>
              <span className="login-card-nombre">{p.nombre}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`login-card-admin ${personaSeleccionada?.id === 'admin' ? 'seleccionada' : ''}`}
          onClick={() => elegirPersona('admin')}
        >
          ★ Administración
        </button>

        {personaSeleccionada && (
          <div className="login-pin-panel">
            <div className="login-pin-label">PIN — {personaSeleccionada.nombre}</div>
            <div className="login-pin-dots">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`login-pin-dot ${pin.length > i ? (estado === 'error' ? 'error' : 'lleno') : ''}`} />
              ))}
            </div>
            <div className={`login-keypad ${estado === 'error' ? 'shake' : ''}`}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button key={d} type="button" disabled={estado === 'verificando' || estado === 'ok'} onClick={() => presionar(d)}>
                  {d}
                </button>
              ))}
              <button
                type="button"
                className="login-key-borrar"
                aria-label="Borrar"
                disabled={estado === 'verificando' || estado === 'ok'}
                onClick={borrar}
              >
                ⌫
              </button>
              <button type="button" disabled={estado === 'verificando' || estado === 'ok'} onClick={() => presionar('0')}>
                0
              </button>
              <span />
            </div>
            {estado === 'ok' && <p className="login-pin-ok">✓ Acceso concedido</p>}
            {estado === 'error' && <p className="login-pin-error">PIN incorrecto</p>}
          </div>
        )}
      </div>
    </div>
  );
}
