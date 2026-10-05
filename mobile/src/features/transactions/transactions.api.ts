import { apiClient } from '@/core/api/client';

import type {
  Transaction,
  TransactionCreate,
  TransactionFilters,
  TransactionPage,
} from './transactions.types';

export async function createTransaction(data: TransactionCreate): Promise<Transaction> {
  const { data: transaction } = await apiClient.post<Transaction>('/transactions', data);
  return transaction;
}

/**
 * Filtra en el backend vía query params (?type=GASTO&account_id=3&...).
 * Solo se envían los filtros con valor.
 */
export async function listTransactions(
  filters: TransactionFilters = {},
  page: TransactionPage = {},
): Promise<Transaction[]> {
  const params = Object.fromEntries(
    Object.entries({ ...filters, ...page }).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );
  const { data } = await apiClient.get<Transaction[]>('/transactions', { params });
  return data;
}
