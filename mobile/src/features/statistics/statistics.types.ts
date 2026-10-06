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

/** Un punto de GET /statistics/monthly. */
export type MonthlyPoint = {
  /** "YYYY-MM" */
  month: string;
  income: string;
  expenses: string;
};

/** Últimos N meses, del más antiguo al más reciente (los vacíos en "0.00"). */
export type MonthlySeries = {
  series: MonthlyPoint[];
};

/** GET /statistics/comparison: el mes contra el anterior. */
export type Comparison = {
  period: string;
  previous_period: string;
  expenses: string;
  previous_expenses: string;
  /** "15.0"; null si el mes anterior fue 0 (sin base de comparación). */
  expenses_change_pct: string | null;
  income: string;
  previous_income: string;
  income_change_pct: string | null;
  /** null si el mes aún no empezó. */
  daily_avg_expense: string | null;
};
