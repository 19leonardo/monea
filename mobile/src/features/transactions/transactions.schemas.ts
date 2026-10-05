import { z } from 'zod';

import { parseMoneyInput, toCents } from '@/core/utils/currency';

// NUMERIC(12,2) en el backend: hasta 10 dígitos enteros.
const MAX_CENTS = 9_999_999_999_99;

export const transactionFormSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, 'Ingresa el monto')
    .refine((value) => parseMoneyInput(value) !== null, {
      message: 'Monto inválido (usa coma o punto y máximo 2 decimales)',
    })
    .refine((value) => {
      const parsed = parseMoneyInput(value);
      return parsed === null || toCents(parsed) > 0;
    }, 'El monto debe ser mayor a 0')
    .refine((value) => {
      const parsed = parseMoneyInput(value);
      return parsed === null || toCents(parsed) <= MAX_CENTS;
    }, 'El monto es demasiado grande'),
  accountId: z.number('Elige una cuenta'),
  categoryId: z.number('Elige una categoría'),
  paymentMethodId: z.number().nullable(),
  date: z.iso.date('Fecha inválida'),
  description: z.string().trim().max(255, 'Máximo 255 caracteres'),
});

export type TransactionFormInput = z.input<typeof transactionFormSchema>;
export type TransactionForm = z.output<typeof transactionFormSchema>;
