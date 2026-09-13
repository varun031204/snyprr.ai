import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { subscriptionsService } from '../services/api/subscriptionsService';

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscriptionPlans'],
    queryFn: () => subscriptionsService.getPlans(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useMySubscriptions() {
  return useQuery({
    queryKey: ['mySubscriptions'],
    queryFn: () => subscriptionsService.getMySubscriptions(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useSubscribeToPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => subscriptionsService.subscribeToPlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mySubscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['userSubscription'] });
    },
  });
}
