import { supabase } from '../../lib/supabase/client';

export async function fetchPermisosNavegacion() {
  const { data, error } = await supabase.from('permisos_navegacion').select('*');
  if (error) throw error;
  return data;
}

// Destildar "Ver" también apaga "Editar" -- no tiene sentido dejar
// prendido un permiso de escritura sobre una sección que ya no se puede
// ni ver.
export async function setPermiso(rol: string, seccionId: string, visible: boolean) {
  const { error } = await supabase
    .from('permisos_navegacion')
    .upsert(
      { rol, seccion_id: seccionId, visible, ...(visible ? {} : { puede_editar: false }) },
      { onConflict: 'rol,seccion_id' },
    );
  if (error) throw error;
}

// Tildar "Editar" prende "Ver" de yapa si todavía no estaba -- para no
// quedar en el estado inconsistente de poder editar algo que no se puede
// ver.
export async function setPermisoEditar(rol: string, seccionId: string, puedeEditar: boolean) {
  const { error } = await supabase
    .from('permisos_navegacion')
    .upsert(
      { rol, seccion_id: seccionId, puede_editar: puedeEditar, ...(puedeEditar ? { visible: true } : {}) },
      { onConflict: 'rol,seccion_id' },
    );
  if (error) throw error;
}

export async function fetchRolesPersonalizados() {
  const { data, error } = await supabase.from('roles_personalizados').select('*');
  if (error) throw error;
  return data;
}

export async function actualizarEtiquetaRol(clave: string, etiqueta: string) {
  const { error } = await supabase.from('roles_personalizados').update({ etiqueta }).eq('clave', clave);
  if (error) throw error;
  // El nombre que se ve en el topbar (profiles.nombre) es el de la cuenta
  // real, no la etiqueta del rol -- se sincroniza acá para que renombrar
  // el rol también renombre a la única cuenta que lo usa, sin que quede
  // desactualizado en la esquina de arriba.
  const { error: errorProfile } = await supabase.from('profiles').update({ nombre: etiqueta }).eq('rol', clave);
  if (errorProfile) throw errorProfile;
}

// Crea el cargo de punta a punta (usuario de login + profile + fila en
// roles_personalizados) via la Edge Function crear-cargo -- necesita la
// service_role key para dar de alta el usuario de auth, así que no se
// puede hacer directo desde acá con la clave anon.
export async function crearCargo(v: { nombre: string; password: string; icono?: string }) {
  const { data, error } = await supabase.functions.invoke('crear-cargo', { body: v });
  if (error) {
    const mensaje = (await error.context?.text?.().catch(() => null)) || error.message;
    throw new Error(mensaje);
  }
  return data as { ok: true; clave: string };
}
