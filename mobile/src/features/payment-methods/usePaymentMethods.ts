import { useQuery } from '@tanstack/react-query';

import { listPaymentMethods } from './payment-methods.api';

export function usePaymentMethods() {
  return useQuery({
    queryKey: ['payment-methods'],
    queryFn: listPaymentMethods,
    staleTime: 5 * 60_000,
  });
}
