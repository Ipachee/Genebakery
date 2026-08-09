import { useQuery } from '@tanstack/react-query';
import { fetchMesas, fetchSalones } from './api';

export function useSalones() {
  return useQuery({ queryKey: ['salones'], queryFn: fetchSalones });
}

export function useMesas() {
  return useQuery({ queryKey: ['mesas'], queryFn: fetchMesas });
}
