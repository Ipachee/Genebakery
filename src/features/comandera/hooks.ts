import { useQuery } from '@tanstack/react-query';
import { fetchPedidosComandera } from './api';

export function usePedidosComandera() {
  return useQuery({
    queryKey: ['comandera'],
    queryFn: fetchPedidosComandera,
    refetchInterval: 10000,
  });
}
