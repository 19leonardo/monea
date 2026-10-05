import { apiClient } from '@/core/api/client';

import type { Summary } from './dashboard.types';

/** Resumen del mes ("YYYY-MM"); sin mes, el backend usa el actual. */
export async function getSummary(month?: string): Promise<Summary> {
  const { data } = await apiClient.get<Summary>('/statistics/summary', {
    params: month ? { month } : undefined,
  });
  return data;
}
