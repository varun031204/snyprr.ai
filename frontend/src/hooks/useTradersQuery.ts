import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tradersService } from '../services/api/profilesService';

export function useTraders(search?: string) {
  return useQuery({
    queryKey: ['traders', search],
    queryFn: () => tradersService.getTraders(search),
    staleTime: 1000 * 60 * 5,
  });
}

export function useTraderDetail(id: string) {
  return useQuery({
    queryKey: ['trader', id],
    queryFn: () => tradersService.getTraderById(id),
    enabled: Boolean(id),
  });
}

export function useFollowTrader() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (traderId: string) => tradersService.followTrader(traderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traders'] });
    },
  });
}
