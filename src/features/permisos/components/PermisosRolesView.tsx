import { Fragment, useEffect, useState } from 'react';
import { usePermisosNavegacion, usePermisosMutations, useRolesPersonalizados, useRolMutations } from '../hooks';
import { SECCIONES_FIJAS, GRUPOS, ROLES_CONFIGURABLES } from '../../../app/nav';
import { DataTable } from '../../../components/DataTable';
import { Field, TextInput } from '../../../components/Field';
import { EmptyState } from '../../../components/EmptyState';

const LABEL_ROL_FIJO: Record<string, string> = { mozo: 'Mozo' };

export function PermisosRolesView() {
  const { permisos, edicion, isLoading } = usePermisosNavegacion();
  const { set, setEditar } = usePermisosMutations();
  const { data: rolesPersonalizados } = useRolesPersonalizados();
  const { actualizarEtiqueta } = useRolMutations();

  const etiquetaEncargado = rolesPersonalizados?.find((r) => r.clave === 'encargado')?.etiqueta ?? 'Encargado';
  const [nombreEncargado, setNombreEncargado] = useState(etiquetaEncargado);
  // El input arranca vacío (la query todavía no cargó) y se sincroniza una
  // vez que llega el nombre real -- después de eso el usuario ya puede
  // estar escribiendo, así que no se vuelve a pisar.
  useEffect(() => {
    if (rolesPersonalizados) setNombreEncargado(etiquetaEncargado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolesPersonalizados === undefined]);

  function labelRol(rol: string) {
    if (rol === 'encargado') return etiquetaEncargado;
    return LABEL_ROL_FIJO[rol] ?? rol;
  }

  function toggleVer(rol: string, seccionId: string, actual: boolean) {
    set.mutate({ rol, seccionId, visible: !actual });
  }

  function toggleEditar(rol: string, seccionId: string, actual: boolean) {
    setEditar.mutate({ rol, seccionId, puedeEditar: !actual });
  }

  const gruposConLabel = [{ id: '_fijas', label: 'Operación', items: SECCIONES_FIJAS }, ...GRUPOS];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 var(--space-3)' }}>
          Qué sección del menú ve cada rol. <strong>Admin siempre ve todo</strong> (no se puede restringir, para no
          quedarse afuera de esta misma pantalla por error). Los cambios se guardan solos, no hace falta un botón
          "Guardar".
        </p>

        <Field label="Nombre del 3er rol (todavía sin definir el puesto real)">
          <div style={{ display: 'flex', gap: 8, maxWidth: 320 }}>
            <TextInput value={nombreEncargado} onChange={(e) => setNombreEncargado(e.target.value)} />
            <button
              className="btn btn-secondary btn-sm"
              disabled={!nombreEncargado.trim() || nombreEncargado.trim() === etiquetaEncargado}
              onClick={() => actualizarEtiqueta.mutate({ clave: 'encargado', etiqueta: nombreEncargado.trim() })}
            >
              {actualizarEtiqueta.isPending ? 'Guardando…' : 'Renombrar'}
            </button>
          </div>
        </Field>
      </div>

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : (
        <>
        <DataTable>
          <thead>
            <tr>
              <th rowSpan={2} style={{ verticalAlign: 'bottom' }}>
                Sección
              </th>
              {ROLES_CONFIGURABLES.map((rol) => (
                <th key={rol} colSpan={2} style={{ textAlign: 'center' }}>
                  {labelRol(rol)}
                </th>
              ))}
            </tr>
            <tr>
              {ROLES_CONFIGURABLES.map((rol) => (
                <Fragment key={rol}>
                  <th style={{ textAlign: 'center', fontWeight: 500, fontSize: 11.5, color: 'var(--text-dim)' }}>Ver</th>
                  <th style={{ textAlign: 'center', fontWeight: 500, fontSize: 11.5, color: 'var(--text-dim)' }}>Editar</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {gruposConLabel.map((grupo) => (
              <Fragment key={grupo.id}>
                <tr style={{ background: 'var(--surface-sunken)' }}>
                  <td colSpan={ROLES_CONFIGURABLES.length * 2 + 1} style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {grupo.label}
                  </td>
                </tr>
                {grupo.items.map((s) => (
                  <tr key={s.id}>
                    <td>{s.label}</td>
                    {ROLES_CONFIGURABLES.map((rol) => {
                      const visible = permisos.has(`${rol}:${s.id}`);
                      const puedeEditar = edicion.has(`${rol}:${s.id}`);
                      return (
                        <Fragment key={rol}>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={visible}
                              onChange={() => toggleVer(rol, s.id, visible)}
                              style={{ width: 18, height: 18, cursor: 'pointer' }}
                              aria-label={`${labelRol(rol)} ve ${s.label}`}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={puedeEditar}
                              onChange={() => toggleEditar(rol, s.id, puedeEditar)}
                              style={{ width: 18, height: 18, cursor: 'pointer' }}
                              aria-label={`${labelRol(rol)} edita ${s.label}`}
                            />
                          </td>
                        </Fragment>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </DataTable>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>
          "Ver" muestra la sección en el menú. "Editar" habilita cargar/mover/borrar ahí adentro -- por ahora esto último
          solo lo respeta Calendario (el resto de las secciones sigue funcionando como antes, atado solo a "Ver").
        </p>
        </>
      )}
    </div>
  );
}
