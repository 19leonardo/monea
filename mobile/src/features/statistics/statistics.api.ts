import { apiClient } from '@/core/api/client';

import type { ByCategory, IncomeVsExpenses, StatisticsType } from './statistics.types';

export async function getByCategory(month: string, type: StatisticsType): Promise<ByCategory> {
  const { data } = await apiClient.get<ByCategory>('/statistics/by-category', {
    params: { month, type },
  });
  return data;
}

export async function getIncomeVsExpenses(month: string): Promise<IncomeVsExpenses> {
  const { data } = await apiClient.get<IncomeVsExpenses>('/statistics/income-vs-expenses', {
    params: { month },
  });
  return data;
}
