import { apiClient } from '@/core/api/client';

import type {
  ByCategory,
  Comparison,
  IncomeVsExpenses,
  MonthlySeries,
  StatisticsType,
} from './statistics.types';

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

export async function getMonthly(months: number): Promise<MonthlySeries> {
  const { data } = await apiClient.get<MonthlySeries>('/statistics/monthly', {
    params: { months },
  });
  return data;
}

export async function getComparison(month: string): Promise<Comparison> {
  const { data } = await apiClient.get<Comparison>('/statistics/comparison', {
    params: { month },
  });
  return data;
}
