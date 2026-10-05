import { z } from 'zod';

import { parseMoneyInput, toCents } from '@/core/utils/currency';

// NUMERIC(12,2) en el backend: hasta 10 dígitos enteros.
const MAX_CENTS = 9_999_999_999_99;

/** Monto escrito por el usuario ("1.234,50"): obligatorio, > 0, máx. 2 decimales. */
export function positiveMoney(requiredMessage: string) {
  return z
    .string()
    .trim()
    .min(1, requiredMessage)
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
    }, 'El monto es demasiado grande');
}

export const goalFormSchema = z.object({
  name: z.string().trim().min(1, 'Ponle un nombre a tu meta').max(100, 'Máximo 100 caracteres'),
  targetAmount: positiveMoney('Ingresa cuánto quieres ahorrar'),
  /** "YYYY-MM-DD" o null (sin fecha objetivo). */
  targetDate: z.iso.date('Fecha inválida').nullable(),
  description: z.string().trim().max(255, 'Máximo 255 caracteres'),
});

export type GoalFormInput = z.input<typeof goalFormSchema>;
export type GoalForm = z.output<typeof goalFormSchema>;

export const contributionFormSchema = z.object({
  amount: positiveMoney('Ingresa cuánto vas a aportar'),
});

export type ContributionForm = z.infer<typeof contributionFormSchema>;
