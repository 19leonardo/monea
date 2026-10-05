import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { contributeToGoal, createGoal, deleteGoal, listGoals, updateGoal } from './goals.api';
import type { ContributionCreate, GoalCreate, GoalUpdate } from './goals.types';

export const goalsKey = ['goals'] as const;

export function useGoals() {
  return useQuery({ queryKey: goalsKey, queryFn: listGoals });
}

function useInvalidateGoals() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: goalsKey });
}

export function useCreateGoal() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: (data: GoalCreate) => createGoal(data),
    onSuccess: invalidate,
  });
}

export function useContribute() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ContributionCreate }) =>
      contributeToGoal(id, data),
    onSuccess: invalidate,
  });
}

export function useUpdateGoal() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: GoalUpdate }) => updateGoal(id, data),
    onSuccess: invalidate,
  });
}

export function useDeleteGoal() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: (id: number) => deleteGoal(id),
    onSuccess: invalidate,
  });
}
