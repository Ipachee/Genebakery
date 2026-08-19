import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export function useProveedores() {
  return useQuery({ queryKey: ['proveedores'], queryFn: api.fetchProveedores });
}

export function useProveedorMutations() {
  const qc = useQueryClient();
  const invalidar = () => qc.invalidateQueries({ queryKey: ['proveedores'] });
  return {
    crear: useMutation({ mutationFn: api.crearProveedor, onSuccess: invalidar }),
    borrar: useMutation({ mutationFn: api.borrarProveedor, onSuccess: invalidar }),
  };
}

export function useFacturasDeProveedor(proveedorId: number | null) {
  return useQuery({
    queryKey: ['facturas-proveedor', proveedorId],
    queryFn: () => api.fetchFacturasDeProveedor(proveedorId!),
    enabled: proveedorId != null,
  });
}

export function useFacturaMutations(proveedorId: number | null) {
  const qc = useQueryClient();
  const invalidar = () => qc.invalidateQueries({ queryKey: ['facturas-proveedor', proveedorId] });
  return {
    crear: useMutation({ mutationFn: api.crearFactura, onSuccess: invalidar }),
    borrar: useMutation({ mutationFn: api.borrarFactura, onSuccess: invalidar }),
  };
}
