import { useQuery } from '@tanstack/react-query';
import { fetchProductoMasVendido, fetchVentasDesde } from './api';

function inicioDeRango(rango: 'semana' | 'mes') {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (rango === 'semana') d.setDate(d.getDate() - 6);
  else d.setDate(d.getDate() - 29);
  return d.toISOString();
}

export function useVentasPorRango(rango: 'semana' | 'mes') {
  const desde = inicioDeRango(rango);
  return useQuery({
    queryKey: ['reportes-ventas', rango],
    queryFn: () => fetchVentasDesde(desde),
  });
}

export function useProductoMasVendido(rango: 'semana' | 'mes') {
  const desde = inicioDeRango(rango);
  return useQuery({
    queryKey: ['reportes-productos', rango],
    queryFn: () => fetchProductoMasVendido(desde),
  });
}
