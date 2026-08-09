import { useQuery } from '@tanstack/react-query';
import { fetchMovimientos } from './api';

export function useMovimientos() {
  return useQuery({ queryKey: ['movimientos'], queryFn: fetchMovimientos });
}
