import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { accountsKey } from '@/features/accounts/useAccounts';
import { budgetsKey } from '@/features/budgets/useBudgets';
import { recentTransactionsKey, summaryKey } from '@/features/dashboard/useDashboard';
import { statisticsKey } from '@/features/statistics/useStatistics';

import { createTransaction, listTransactions } from './transactions.api';
import type { TransactionCreate, TransactionFilters } from './transactions.types';

export const transactionsKey = ['transactions'] as const;

/** Tamaño de página del historial (el backend acepta hasta 100). */
export const TRANSACTIONS_PAGE_SIZE = 30;

/**
 * Una sola petición con filtros (p. ej. los últimos 5 en Inicio).
 * Los filtros van en la queryKey: al cambiar, se vuelve a pedir al backend.
 */
export function useTransactions(filters: TransactionFilters = {}, limit = TRANSACTIONS_PAGE_SIZE) {
  return useQuery({
    queryKey: [...transactionsKey, { ...filters, limit }],
    queryFn: () => listTransactions(filters, { limit }),
  });
}

/** Historial paginado (limit/offset): carga la siguiente página al llegar al final. */
export function useInfiniteTransactions(filters: TransactionFilters = {}) {
  return useInfiniteQuery({
    queryKey: [...transactionsKey, 'infinite', filters],
    queryFn: ({ pageParam }) =>
      listTransactions(filters, { limit: TRANSACTIONS_PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    // Una página incompleta significa que no hay más.
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < TRANSACTIONS_PAGE_SIZE
        ? undefined
        : allPages.length * TRANSACTIONS_PAGE_SIZE,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TransactionCreate) => createTransaction(data),
    // El backend ajusta el saldo de la cuenta: se recargan cuentas, movimientos
    // (todas las queries que empiezan por ['transactions'], con cualquier filtro),
    // los recientes, el resumen del dashboard, los presupuestos (lo gastado) y los gráficos.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: accountsKey }),
        queryClient.invalidateQueries({ queryKey: transactionsKey }),
        queryClient.invalidateQueries({ queryKey: recentTransactionsKey }),
        queryClient.invalidateQueries({ queryKey: summaryKey }),
        queryClient.invalidateQueries({ queryKey: budgetsKey }),
        queryClient.invalidateQueries({ queryKey: statisticsKey }),
      ]),
  });
}
