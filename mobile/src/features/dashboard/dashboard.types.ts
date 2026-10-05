/** Respuesta de GET /statistics/summary. Montos como texto decimal ("1500.50"). */
export type Summary = {
  /** "YYYY-MM" */
  period: string;
  /** Saldo actual de todas las cuentas (no depende del mes). */
  total_balance: string;
  income: string;
  expenses: string;
  /** income − expenses del mes. */
  net: string;
  accounts_count: number;
  transactions_count: number;
};
