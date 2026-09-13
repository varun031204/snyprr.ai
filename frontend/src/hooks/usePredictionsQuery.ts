import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { signalsService } from '../services/api/signalsService';
import { Prediction } from '../types';

export function usePredictions(filters?: {
  instrument?: string;
  direction?: string;
  status?: string;
  timeframe?: string;
  traderId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ['predictions', filters],
    queryFn: () => signalsService.getPredictions(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function usePredictionDetail(id: string) {
  return useQuery({
    queryKey: ['prediction', id],
    queryFn: () => signalsService.getPredictionById(id),
    enabled: Boolean(id),
  });
}

export function useCreatePrediction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Prediction>) => signalsService.createPrediction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
    },
  });
}

export function useUpdatePrediction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Prediction> }) =>
      signalsService.updatePrediction(id, data),
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
      queryClient.invalidateQueries({ queryKey: ['prediction', variables.id] });
    },
  });
}

export function usePublishPrediction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => signalsService.publishPrediction(id),
    onSuccess: (_res, id) => {
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
      queryClient.invalidateQueries({ queryKey: ['prediction', id] });
    },
  });
}

export function useClosePrediction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: Prediction['outcome'] }) =>
      signalsService.closePrediction(id, outcome),
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
      queryClient.invalidateQueries({ queryKey: ['prediction', variables.id] });
    },
  });
}
