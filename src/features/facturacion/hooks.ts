import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export function useEstadoCredenciales() {
  return useQuery({ queryKey: ['credenciales-facturacion'], queryFn: api.fetchEstadoCredenciales });
}

export function useGuardarCredenciales() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.guardarCredenciales,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credenciales-facturacion'] }),
  });
}

export function useCrearFacturaPendiente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.crearFacturaPendiente,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ventas'] }),
  });
}

export function useEmitirFactura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.emitirFactura,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ventas'] }),
  });
}
