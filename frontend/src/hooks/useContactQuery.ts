import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminListContacts,
  adminUpdateContactStatus,
  type ContactMessage,
  type ListContactParams,
} from '../services/api/contactService';

export function useAdminContacts(params: ListContactParams = {}) {
  return useQuery({
    queryKey: ['adminContacts', params],
    queryFn: () => adminListContacts(params),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useUpdateContactStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      adminNotes,
    }: {
      id: string;
      status: ContactMessage['status'];
      adminNotes?: string;
    }) => adminUpdateContactStatus(id, status, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminContacts'] });
    },
  });
}
