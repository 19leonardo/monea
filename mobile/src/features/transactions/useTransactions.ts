import { useMutation, useQueryClient } from '@tanstack/react-query';

import { accountsKey } from '@/features/accounts/useAccounts';

import { createTransaction } from './transactions.api';
import type { TransactionCreate } from './transactions.types';

export const transactionsKey = ['transactions'] as const;

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TransactionCreate) => createTransaction(data),
    // El backend ajusta el saldo de la cuenta: se recargan cuentas y movimientos.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: accountsKey }),
        queryClient.invalidateQueries({ queryKey: transactionsKey }),
      ]),
  });
}
