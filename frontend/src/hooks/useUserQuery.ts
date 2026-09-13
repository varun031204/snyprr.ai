import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profilesUserService } from '../services/api/profilesService';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: () => profilesUserService.getCurrentUser(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { full_name?: string; username?: string; avatar_url?: string | null }) =>
      profilesUserService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
}

export function useWatchlist() {
  return useQuery({
    queryKey: ['watchlist'],
    queryFn: () => profilesUserService.getWatchlist(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useToggleWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (predictionId: string) => profilesUserService.toggleWatchlist(predictionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
    },
  });
}
