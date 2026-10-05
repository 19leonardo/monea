import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { summaryKey } from '@/features/dashboard/useDashboard';

import { createAccount, deleteAccount, listAccounts, updateAccount } from './accounts.api';
import type { AccountCreate, AccountUpdate } from './accounts.types';

export const accountsKey = ['accounts'] as const;

export function useAccounts() {
  return useQuery({ queryKey: accountsKey, queryFn: listAccounts });
}

/**
 * Tras cualquier cambio se invalida la lista para que se recargue sola, y el
 * resumen del dashboard (saldo total y número de cuentas).
 */
function useInvalidateAccounts() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: accountsKey }),
      queryClient.invalidateQueries({ queryKey: summaryKey }),
    ]);
}

export function useCreateAccount() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: (data: AccountCreate) => createAccount(data),
    onSuccess: invalidate,
  });
}

export function useUpdateAccount() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AccountUpdate }) => updateAccount(id, data),
    onSuccess: invalidate,
  });
}

export function useDeleteAccount() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: (id: number) => deleteAccount(id),
    onSuccess: invalidate,
  });
}
