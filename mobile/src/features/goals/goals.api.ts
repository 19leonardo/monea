import { apiClient } from '@/core/api/client';

import type { ContributionCreate, Goal, GoalCreate, GoalUpdate } from './goals.types';

export async function listGoals(): Promise<Goal[]> {
  const { data } = await apiClient.get<Goal[]>('/goals');
  return data;
}

export async function createGoal(data: GoalCreate): Promise<Goal> {
  const { data: goal } = await apiClient.post<Goal>('/goals', data);
  return goal;
}

export async function updateGoal(id: number, data: GoalUpdate): Promise<Goal> {
  const { data: goal } = await apiClient.put<Goal>(`/goals/${id}`, data);
  return goal;
}

export async function deleteGoal(id: number): Promise<void> {
  await apiClient.delete(`/goals/${id}`);
}

/** Registra el aporte y devuelve la meta actualizada (progreso, estado…). */
export async function contributeToGoal(id: number, data: ContributionCreate): Promise<Goal> {
  const { data: goal } = await apiClient.post<Goal>(`/goals/${id}/contributions`, data);
  return goal;
}
