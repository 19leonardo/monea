import { useQuery } from '@tanstack/react-query';

import { getByCategory, getIncomeVsExpenses } from './statistics.api';
import type { StatisticsType } from './statistics.types';

/** Prefijo común: invalidarlo refresca todos los gráficos (cualquier mes o tipo). */
export const statisticsKey = ['statistics'] as const;

export function useByCategory(month: string, type: StatisticsType = 'gasto') {
  return useQuery({
    queryKey: [...statisticsKey, 'by-category', month, type],
    queryFn: () => getByCategory(month, type),
  });
}

export function useIncomeVsExpenses(month: string) {
  return useQuery({
    queryKey: [...statisticsKey, 'income-vs-expenses', month],
    queryFn: () => getIncomeVsExpenses(month),
  });
}
