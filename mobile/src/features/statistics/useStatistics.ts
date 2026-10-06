import { useQuery } from '@tanstack/react-query';

import { getByCategory, getComparison, getIncomeVsExpenses, getMonthly } from './statistics.api';
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

/** Ingresos y gastos de los últimos `months` meses (para el gráfico de líneas). */
export function useMonthly(months = 6) {
  return useQuery({
    queryKey: [...statisticsKey, 'monthly', months],
    queryFn: () => getMonthly(months),
  });
}

/** El mes contra el anterior: % de cambio y gasto diario promedio. */
export function useComparison(month: string) {
  return useQuery({
    queryKey: [...statisticsKey, 'comparison', month],
    queryFn: () => getComparison(month),
  });
}
