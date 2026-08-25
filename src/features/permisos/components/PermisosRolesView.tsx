import { Fragment, useState } from 'react';
import { usePermisosNavegacion, usePermisosMutations, useRolesPersonalizados, useRolMutations } from '../hooks';
import { SECCIONES_FIJAS, GRUPOS } from '../../../app/nav';
import { DataTable } from '../../../components/DataTable';
import { EmptyState } from '../../../components/EmptyState';
import { Button } from '../../../components/Button';
import { FormModal } from '../../../components/FormModal';
import { Field, TextInput } from '../../../components/Field';
import './PermisosRolesView.css';

export function PermisosRolesView() {
  const { permisos, edicion, isLoading } = usePermisosNavegacion();
  const { set, setEditar } = usePermisosMutations();
  const { data: rolesPersonalizados } = useRolesPersonalizados();
  const [creandoCargo, setCreandoCargo] = useState(false);

  // "mozo" es el único rol fijo configurable (admin ve todo siempre, así
  // que no aparece acá) -- todo lo demás (RRHH y cualquier otro cargo que
  // se cree con + Nuevo cargo) es una fila de roles_personalizados, así
  // que la lista de columnas sale de ahí en vez de estar hardcodeada.
  const roles = ['mozo', ...((rolesPersonalizados ?? []).map((r) => r.clave))];

  function labelRol(rol: string) {
    if (rol === 'mozo') return 'Mozo';
    return rolesPersonalizados?.find((r) => r.clave === rol)?.etiqueta ?? rol;
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <Button variant="secondary" size="sm" onClick={() => setCreandoCargo(true)}>
          + Nuevo cargo
        </Button>
      </div>

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : (
        <>
          <div className="permisos-matriz">
            <DataTable>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ verticalAlign: 'bottom' }}>
                    Sección
                  </th>
                  {roles.map((rol) => (
                    <th key={rol} colSpan={2} className="col-grupo-rol" style={{ textAlign: 'center' }}>
                      {labelRol(rol)}
                    </th>
                  ))}
                </tr>
                <tr>
                  {roles.map((rol) => (
                    <Fragment key={rol}>
                      <th className="col-ver" style={{ textAlign: 'center', fontWeight: 500, fontSize: 11.5, color: 'var(--text-dim)' }}>
                        Ver
                      </th>
                      <th className="col-editar" style={{ textAlign: 'center', fontWeight: 500, fontSize: 11.5, color: 'var(--text-dim)' }}>
                        Editar
                      </th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gruposConLabel.map((grupo) => (
                  <Fragment key={grupo.id}>
                    <tr style={{ background: 'var(--surface-sunken)' }}>
                      <td colSpan={roles.length * 2 + 1} style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        {grupo.label}
                      </td>
                    </tr>
                    {grupo.items.map((s) => (
                      <tr key={s.id}>
                        <td>{s.label}</td>
                        {roles.map((rol) => {
                          const visible = permisos.has(`${rol}:${s.id}`);
                          const puedeEditar = edicion.has(`${rol}:${s.id}`);
                          return (
                            <Fragment key={rol}>
                              <td className="col-ver">
                                <input
                                  type="checkbox"
                                  checked={visible}
                                  onChange={() => toggleVer(rol, s.id, visible)}
                                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                                  aria-label={`${labelRol(rol)} ve ${s.label}`}
                                />
                              </td>
                              <td className="col-editar">
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
          </div>
        </>
      )}

      {creandoCargo && <NuevoCargoModal onClose={() => setCreandoCargo(false)} />}
    </div>
  );
}

function NuevoCargoModal({ onClose }: { onClose: () => void }) {
  const { crear } = useRolMutations();
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');

  const valido = nombre.trim().length > 0 && password.length >= 6;

  async function submit() {
    if (!valido) return;
    await crear.mutateAsync({ nombre: nombre.trim(), password });
    onClose();
  }

  return (
    <FormModal
      title="🗂️ Nuevo cargo"
      onClose={onClose}
      onSubmit={submit}
      submitLabel={crear.isPending ? 'Creando…' : 'Crear cargo'}
      submitDisabled={!valido || crear.isPending}
      error={crear.isError ? crear.error?.message : null}
    >
      <Field label="Nombre del cargo">
        <TextInput autoFocus placeholder="Ej: Cocina, Delivery…" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </Field>
      <Field label="Contraseña de acceso">
        <TextInput type="password" placeholder="Al menos 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
    </FormModal>
  );
}
