import type { CategoryType } from '@/features/categories/categories.types';

export type TransactionType = 'INGRESO' | 'GASTO';

/** Tipo en la URL del formulario (/add/gasto, /add/ingreso). */
export type TransactionKindParam = CategoryType;

export const TRANSACTION_KIND: Record<
  TransactionKindParam,
  { type: TransactionType; title: string; saveLabel: string }
> = {
  gasto: { type: 'GASTO', title: 'Nuevo gasto', saveLabel: 'Guardar gasto' },
  ingreso: { type: 'INGRESO', title: 'Nuevo ingreso', saveLabel: 'Guardar ingreso' },
};

/** Los montos van como texto decimal ("45.50"), nunca como float. */
export type Transaction = {
  id: number;
  account_id: number;
  account_name: string;
  category_id: number;
  category_name: string;
  category_icon: string;
  payment_method_id: number | null;
  payment_method_name: string | null;
  type: TransactionType;
  amount: string;
  description: string | null;
  date: string;
  created_at: string;
};

export type TransactionCreate = {
  account_id: number;
  category_id: number;
  payment_method_id?: number | null;
  type: TransactionType;
  amount: string;
  description?: string | null;
  /** "YYYY-MM-DD" */
  date: string;
};

/** Filtros de GET /transactions (todos opcionales; nombres = query params del backend). */
export type TransactionFilters = {
  type?: TransactionType;
  account_id?: number;
  category_id?: number;
  payment_method_id?: number;
  /** "YYYY-MM-DD", inclusive */
  start_date?: string;
  /** "YYYY-MM-DD", inclusive */
  end_date?: string;
};

export type TransactionPage = {
  limit?: number;
  offset?: number;
};
