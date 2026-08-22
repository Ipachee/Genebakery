import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/useAuth';
import * as api from './api';

// `permisos`: set de "rol:seccionId" con visible=true (ve la sección) --
// lo que nav.ts usa para filtrar el menú de mozo/encargado. `edicion`: set
// con puede_editar=true (puede escribir ahí, no solo mirar) -- lo usan las
// vistas que distinguen ver de editar, como Calendario. Admin no depende
// de ninguno de los dos (ve y edita todo siempre).
export function usePermisosNavegacion() {
  const query = useQuery({ queryKey: ['permisos-navegacion'], queryFn: api.fetchPermisosNavegacion });
  const { permisos, edicion } = useMemo(() => {
    const permisos = new Set<string>();
    const edicion = new Set<string>();
    for (const p of query.data ?? []) {
      if (p.visible) permisos.add(`${p.rol}:${p.seccion_id}`);
      if (p.puede_editar) edicion.add(`${p.rol}:${p.seccion_id}`);
    }
    return { permisos, edicion };
  }, [query.data]);
  return { permisos, edicion, filas: query.data ?? [], isLoading: query.isLoading };
}

export function usePermisosMutations() {
  const qc = useQueryClient();
  const invalidar = () => qc.invalidateQueries({ queryKey: ['permisos-navegacion'] });
  return {
    set: useMutation({
      mutationFn: (v: { rol: string; seccionId: string; visible: boolean }) => api.setPermiso(v.rol, v.seccionId, v.visible),
      onSuccess: invalidar,
    }),
    setEditar: useMutation({
      mutationFn: (v: { rol: string; seccionId: string; puedeEditar: boolean }) => api.setPermisoEditar(v.rol, v.seccionId, v.puedeEditar),
      onSuccess: invalidar,
    }),
  };
}

// Atajo para gatillar en cada vista si el usuario actual puede editar
// ESA sección puntual (agregar/editar/borrar ahí adentro) -- admin
// siempre puede, mozo/RRHH solo si tienen el tick de "Editar" tildado en
// Ajustes → Roles y permisos para esa sección. "Ver" (que ya controla si
// la sección aparece en el menú) no alcanza para esto.
export function usePuedeEditar(seccionId: string): boolean {
  const { profile } = useAuth();
  const { edicion } = usePermisosNavegacion();
  if (profile?.rol === 'admin') return true;
  return !!profile?.rol && edicion.has(`${profile.rol}:${seccionId}`);
}

export function useRolesPersonalizados() {
  return useQuery({ queryKey: ['roles-personalizados'], queryFn: api.fetchRolesPersonalizados });
}

export function useRolMutations() {
  const qc = useQueryClient();
  return {
    actualizarEtiqueta: useMutation({
      mutationFn: (v: { clave: string; etiqueta: string }) => api.actualizarEtiquetaRol(v.clave, v.etiqueta),
      onSuccess: () => qc.invalidateQueries({ queryKey: ['roles-personalizados'] }),
    }),
  };
}
