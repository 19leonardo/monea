import { z } from 'zod';

import { parseMoneyInput, toCents } from '@/core/utils/currency';

import { ACCOUNT_TYPES } from './accounts.types';

// NUMERIC(12,2) en el backend: hasta 10 dígitos enteros.
const MAX_CENTS = 9_999_999_999_99;

export const accountFormSchema = z.object({
  name: z.string().trim().min(1, 'Ingresa un nombre').max(100, 'Máximo 100 caracteres'),
  type: z.enum(ACCOUNT_TYPES, 'Elige un tipo de cuenta'),
  initialBalance: z
    .string()
    .trim()
    .refine((value) => value === '' || parseMoneyInput(value) !== null, {
      message: 'Monto inválido (usa coma o punto y máximo 2 decimales)',
    })
    .refine(
      (value) => {
        const parsed = value === '' ? '0' : parseMoneyInput(value);
        return parsed === null || Math.abs(toCents(parsed)) <= MAX_CENTS;
      },
      { message: 'El monto es demasiado grande' },
    ),
});

export type AccountForm = z.infer<typeof accountFormSchema>;
