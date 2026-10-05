import { useQuery } from '@tanstack/react-query';

import { listCategories } from './categories.api';
import type { CategoryType } from './categories.types';

export function useCategories(type?: CategoryType) {
  return useQuery({
    queryKey: ['categories', type ?? 'todas'],
    queryFn: () => listCategories(type),
    // Cambian poco: se reutilizan 5 minutos sin volver a pedirlas.
    staleTime: 5 * 60_000,
  });
}
