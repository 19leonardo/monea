import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createBudget, deleteBudget, listBudgets, updateBudget } from './budgets.api';
import type { BudgetCreate, BudgetUpdate } from './budgets.types';

export const budgetsKey = ['budgets'] as const;

/** Presupuestos de un mes con lo gastado ya calculado por el backend. */
export function useBudgets(month: string) {
  return useQuery({
    queryKey: [...budgetsKey, month],
    queryFn: () => listBudgets(month),
  });
}

function useInvalidateBudgets() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: budgetsKey });
}

export function useCreateBudget() {
  const invalidate = useInvalidateBudgets();
  return useMutation({
    mutationFn: (data: BudgetCreate) => createBudget(data),
    onSuccess: invalidate,
  });
}

export function useUpdateBudget() {
  const invalidate = useInvalidateBudgets();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: BudgetUpdate }) => updateBudget(id, data),
    onSuccess: invalidate,
  });
}

export function useDeleteBudget() {
  const invalidate = useInvalidateBudgets();
  return useMutation({
    mutationFn: (id: number) => deleteBudget(id),
    onSuccess: invalidate,
  });
}
