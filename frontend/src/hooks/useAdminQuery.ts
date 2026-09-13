import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApiService } from '../services/api/adminService';
import { UserRole } from '../types';

export function useAdminUsers() {
  return useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => adminApiService.getUsers(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useAdminTraders() {
  return useQuery({
    queryKey: ['adminTraders'],
    queryFn: () => adminApiService.getTraders(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useAdminAuditLogs() {
  return useQuery({
    queryKey: ['adminAuditLogs'],
    queryFn: () => adminApiService.getAuditLogs(),
    staleTime: 1000 * 30,
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['adminStats'],
    queryFn: () => adminApiService.getPlatformStats(),
    staleTime: 1000 * 60,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      adminApiService.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminAuditLogs'] });
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' }) =>
      adminApiService.updateUserStatus(userId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
  });
}
