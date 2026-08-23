import { useEffect, useState, type ReactNode } from 'react';
import { GRUPOS, SECCIONES_FIJAS, grupoDe, visiblePara, type Rol, type SeccionId } from './nav';
import { useTheme } from './useTheme';
import { usePersistido } from './usePersistido';
import './sidebar.css';

const ICONO_FIJA: Record<string, string> = { salon: '🪑', comandera: '🧾' };

// En pantallas de celular la topbar no tiene aire para el toggle de tema
// + el candado de admin además de turno/usuario/salir -- quedan movidos
// adentro del cajón del menú (ver .app-sidebar-footer) en vez de
// amontonados ahí arriba. En desktop/tablet siguen en la topbar como
// siempre.
function useEsMobile(): boolean {
  const [esMobile, setEsMobile] = useState(() => window.matchMedia('(max-width: 560px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 560px)');
    const onChange = () => setEsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return esMobile;
}

export function AppShell({
  rol,
  activo,
  permisos,
  onNavigate,
  topbarRight,
  accionesMenu,
  children,
}: {
  rol: Rol;
  activo: SeccionId | null;
  permisos: Set<string>;
  onNavigate: (id: SeccionId) => void;
  topbarRight: ReactNode;
  accionesMenu?: ReactNode;
  children: ReactNode;
}) {
  const { theme, toggleTheme } = useTheme();
  const esMobile = useEsMobile();
  // Mozo arranca con el lateral colapsado -- de entrada ve nada más que
  // Salón/Comandera/Calendario, así que menos aire ocupado para lo que en
  // la práctica es un atajo de pocos botones. Admin y encargado arrancan
  // expandidos.
  const [collapsed, setCollapsed] = usePersistido('comandacafe-nav-collapsed', rol === 'mozo');
  const [openGroups, setOpenGroups] = usePersistido<string[]>(
    'comandacafe-nav-open-groups',
    GRUPOS.map((g) => g.id)
  );
  // Off-canvas en pantallas chicas: el lateral entero se comporta como un
  // drawer que tapa el contenido en vez de compartir ancho con él.
  const [offCanvasAbierto, setOffCanvasAbierto] = useState(false);

  useEffect(() => {
    setOffCanvasAbierto(false);
  }, [activo]);

  const grupos = GRUPOS.map((g) => ({ ...g, items: g.items.filter((it) => visiblePara(rol, it, permisos)) })).filter(
    (g) => g.items.length > 0
  );
  const fijas = SECCIONES_FIJAS.filter((s) => visiblePara(rol, s, permisos));

  const grupo = activo ? grupoDe(activo) : null;
  const kicker = grupo?.label ?? (activo === 'salon' || activo === 'comandera' ? 'Operación' : null);
  const tituloActivo =
    fijas.find((s) => s.id === activo)?.label ?? grupos.flatMap((g) => g.items).find((it) => it.id === activo)?.label ?? '';

  function toggleGroup(id: string) {
    // Colapsado (rail de íconos) no hay lugar para desplegar la lista de
    // ítems del grupo -- tocar el ícono expande el lateral entero y de paso
    // abre ese grupo, en vez de intentar un flyout aparte.
    if (collapsed) {
      setCollapsed(false);
      if (!openGroups.includes(id)) setOpenGroups([...openGroups, id]);
      return;
    }
    setOpenGroups(openGroups.includes(id) ? openGroups.filter((g) => g !== id) : [...openGroups, id]);
  }

  function navegar(id: SeccionId) {
    onNavigate(id);
    setOffCanvasAbierto(false);
  }

  return (
    <div className={`app-shell ${collapsed ? 'is-collapsed' : ''} ${offCanvasAbierto ? 'is-off-canvas-open' : ''}`}>
      {offCanvasAbierto && <div className="app-shell-scrim" onClick={() => setOffCanvasAbierto(false)} />}

      <aside className="app-sidebar">
        <div className="app-sidebar-brand">
          <span>☕</span>
          <span className="app-sidebar-brand-label">ComandaCafé</span>
        </div>

        <nav className="app-sidebar-nav">
          {fijas.map((s) => (
            <button
              key={s.id}
              className={`app-nav-item ${activo === s.id ? 'active' : ''}`}
              title={s.label}
              onClick={() => navegar(s.id)}
            >
              <span className="app-nav-icon">{ICONO_FIJA[s.id] ?? '•'}</span>
              <span className="app-nav-label">{s.label}</span>
            </button>
          ))}

          {grupos.length > 0 && <div className="app-sidebar-sep" />}

          {grupos.map((g) => {
            const abierto = openGroups.includes(g.id);
            return (
              <div key={g.id} className="app-nav-group">
                <button className="app-nav-group-header" onClick={() => toggleGroup(g.id)} title={g.label}>
                  <span className="app-nav-icon">{g.icon}</span>
                  <span className="app-nav-label">{g.label}</span>
                  <span className={`app-nav-chevron ${abierto ? 'open' : ''}`}>›</span>
                </button>
                {abierto && (
                  <div className="app-nav-group-items">
                    {g.items.map((it) => (
                      <button
                        key={it.id}
                        className={`app-nav-item app-nav-item-nested ${activo === it.id ? 'active' : ''}`}
                        title={it.label}
                        onClick={() => navegar(it.id)}
                      >
                        <span className="app-nav-icon app-nav-dot" aria-hidden="true">
                          •
                        </span>
                        <span className="app-nav-label">{it.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {esMobile && (
          <div className="app-sidebar-footer">
            <button className="app-sidebar-footer-item" onClick={toggleTheme}>
              <span className="app-nav-icon">{theme === 'light' ? '🌙' : '☀️'}</span>
              <span className="app-nav-label">{theme === 'light' ? 'Modo oscuro' : 'Modo claro'}</span>
            </button>
            {accionesMenu}
          </div>
        )}
      </aside>

      <div className="app-content-col">
        <header className="app-topbar">
          <button
            className="app-hamburger"
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            onClick={() => {
              // en pantallas chicas el lateral es off-canvas: el mismo botón
              // lo abre/cierra en vez de colapsar a rail de íconos.
              if (window.matchMedia('(max-width: 1024px)').matches) {
                setOffCanvasAbierto((v) => !v);
              } else {
                setCollapsed(!collapsed);
              }
            }}
          >
            ☰
          </button>
          <div className="app-topbar-title">
            {kicker && <span className="app-topbar-kicker">{kicker}</span>}
            <span className="app-topbar-section">{tituloActivo}</span>
          </div>
          <div className="app-topbar-right">
            {!esMobile && (
              <>
                <button
                  className="app-theme-toggle"
                  onClick={toggleTheme}
                  title={theme === 'light' ? 'Cambiar a modo oscuro (Espresso)' : 'Cambiar a modo claro (Organic)'}
                  aria-label="Cambiar tema"
                >
                  {theme === 'light' ? '☀️' : '🌙'}
                </button>
                {accionesMenu}
              </>
            )}
            {topbarRight}
          </div>
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
