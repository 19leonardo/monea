import { apiClient } from '@/core/api/client';

import type { Transaction, TransactionCreate } from './transactions.types';

export async function createTransaction(data: TransactionCreate): Promise<Transaction> {
  const { data: transaction } = await apiClient.post<Transaction>('/transactions', data);
  return transaction;
}
