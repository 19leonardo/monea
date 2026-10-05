import { z } from 'zod';

import { parseMoneyInput, toCents } from '@/core/utils/currency';

// NUMERIC(12,2) en el backend: hasta 10 dígitos enteros.
const MAX_CENTS = 9_999_999_999_99;

export const budgetFormSchema = z.object({
  categoryId: z.number('Elige una categoría'),
  amount: z
    .string()
    .trim()
    .min(1, 'Ingresa el tope del presupuesto')
    .refine((value) => parseMoneyInput(value) !== null, {
      message: 'Monto inválido (usa coma o punto y máximo 2 decimales)',
    })
    .refine((value) => {
      const parsed = parseMoneyInput(value);
      return parsed === null || toCents(parsed) > 0;
    }, 'El tope debe ser mayor a 0')
    .refine((value) => {
      const parsed = parseMoneyInput(value);
      return parsed === null || toCents(parsed) <= MAX_CENTS;
    }, 'El monto es demasiado grande'),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mes inválido'),
});

export type BudgetFormInput = z.input<typeof budgetFormSchema>;
export type BudgetForm = z.output<typeof budgetFormSchema>;
