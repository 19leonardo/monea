/** Nivel de alerta que calcula el backend: qué umbral se superó. */
export type AlertLevel = 70 | 90 | 100;

/** Respuesta de /budgets. Montos como texto decimal ("800.00"); spent/available/percentage son calculados. */
export type Budget = {
  id: number;
  category_id: number;
  category_name: string;
  category_icon: string;
  amount: string;
  period: 'mensual';
  /** "YYYY-MM" */
  month: string;
  alert_70: number;
  alert_90: number;
  alert_100: number;
  created_at: string;
  spent: string;
  /** amount − spent (negativo si se superó). */
  available: string;
  percentage: number;
  alert_level: AlertLevel | null;
};

export type BudgetCreate = {
  category_id: number;
  amount: string;
  month: string;
};

export type BudgetUpdate = Partial<BudgetCreate> & {
  alert_70?: number;
  alert_90?: number;
  alert_100?: number;
};
