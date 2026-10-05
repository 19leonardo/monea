import { apiClient } from '@/core/api/client';

import type { PaymentMethod } from './payment-methods.types';

export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  const { data } = await apiClient.get<PaymentMethod[]>('/payment-methods');
  return data;
}
