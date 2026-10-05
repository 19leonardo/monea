export type StatisticsType = 'gasto' | 'ingreso';

/** Montos como texto decimal ("500.00"); percentage con 1 decimal ("50.0"). */
export type CategoryTotal = {
  category_id: number;
  category_name: string;
  category_icon: string;
  total: string;
  percentage: string;
};

/** GET /statistics/by-category: ya agrupado y ordenado de mayor a menor por el backend. */
export type ByCategory = {
  /** "YYYY-MM" */
  period: string;
  type: StatisticsType;
  total: string;
  items: CategoryTotal[];
};

/** GET /statistics/income-vs-expenses */
export type IncomeVsExpenses = {
  period: string;
  income: string;
  expenses: string;
  net: string;
};
