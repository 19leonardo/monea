import { useQuery } from '@tanstack/react-query';

import { listTransactions } from '@/features/transactions/transactions.api';

import { getSummary } from './dashboard.api';

export const summaryKey = ['summary'] as const;
export const recentTransactionsKey = ['transactions', 'recent'] as const;

const RECENT_LIMIT = 5;

/** Totales del mes calculados por el backend (no se suma nada en el cliente). */
export function useSummary(month?: string) {
  return useQuery({
    queryKey: [...summaryKey, month ?? 'actual'],
    queryFn: () => getSummary(month),
  });
}

/** Los 5 movimientos más recientes (GET /transactions?limit=5). */
export function useRecentTransactions() {
  return useQuery({
    queryKey: recentTransactionsKey,
    queryFn: () => listTransactions({}, { limit: RECENT_LIMIT }),
  });
}
