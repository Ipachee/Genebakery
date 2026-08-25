import { useQuery } from '@tanstack/react-query';
import { fetchAlertasStock, fetchProductoMasVendido, fetchResumenGastosRango, fetchVentasDesde } from './api';

function inicioDeRango(rango: 'semana' | 'mes') {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (rango === 'semana') d.setDate(d.getDate() - 6);
  else d.setDate(d.getDate() - 29);
  return d.toISOString();
}

function fechaLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// gastos.fecha/pagos_empleados.fecha son `date` (sin hora) -- fn_resumen_
// gastos_rango pide desde/hasta como date, no el ISO timestamp que usa
// inicioDeRango() para filtrar ventas.created_at.
function rangoFechas(rango: 'semana' | 'mes'): { desde: string; hasta: string } {
  const hasta = new Date();
  const desde = new Date();
  desde.setDate(desde.getDate() - (rango === 'semana' ? 6 : 29));
  return { desde: fechaLocal(desde), hasta: fechaLocal(hasta) };
}

export function useGastosPorRango(rango: 'semana' | 'mes') {
  const { desde, hasta } = rangoFechas(rango);
  return useQuery({
    queryKey: ['reportes-gastos', rango],
    queryFn: () => fetchResumenGastosRango(desde, hasta),
  });
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

export function useAlertasStock() {
  return useQuery({ queryKey: ['alertas-stock'], queryFn: fetchAlertasStock });
}
