import { apiClient } from '@/core/api/client';

import type { Category, CategoryType } from './categories.types';

export async function listCategories(type?: CategoryType): Promise<Category[]> {
  const { data } = await apiClient.get<Category[]>('/categories', {
    params: type ? { type } : undefined,
  });
  return data;
}
