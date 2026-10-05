import { apiClient } from '@/core/api/client';

import type { Budget, BudgetCreate, BudgetUpdate } from './budgets.types';

export async function listBudgets(month: string): Promise<Budget[]> {
  const { data } = await apiClient.get<Budget[]>('/budgets', { params: { month } });
  return data;
}

export async function createBudget(data: BudgetCreate): Promise<Budget> {
  const { data: budget } = await apiClient.post<Budget>('/budgets', data);
  return budget;
}

export async function updateBudget(id: number, data: BudgetUpdate): Promise<Budget> {
  const { data: budget } = await apiClient.put<Budget>(`/budgets/${id}`, data);
  return budget;
}

export async function deleteBudget(id: number): Promise<void> {
  await apiClient.delete(`/budgets/${id}`);
}
