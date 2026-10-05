import { apiClient } from '@/core/api/client';

import type { Account, AccountCreate, AccountUpdate } from './accounts.types';

export async function listAccounts(): Promise<Account[]> {
  const { data } = await apiClient.get<Account[]>('/accounts');
  return data;
}

export async function createAccount(data: AccountCreate): Promise<Account> {
  const { data: account } = await apiClient.post<Account>('/accounts', data);
  return account;
}

export async function updateAccount(id: number, data: AccountUpdate): Promise<Account> {
  const { data: account } = await apiClient.put<Account>(`/accounts/${id}`, data);
  return account;
}

export async function deleteAccount(id: number): Promise<void> {
  await apiClient.delete(`/accounts/${id}`);
}
