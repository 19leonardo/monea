/** Color de la barra según el uso del presupuesto. */
export const BUDGET_COLORS = {
  ok: '#2E7D32', // < 70 %: verde
  warning: '#F9A825', // 70–89 %: amarillo
  danger: '#EF6C00', // 90–99 %: naranja
  exceeded: '#BA1A1A', // ≥ 100 %: rojo
} as const;

export function budgetColor(percentage: number): string {
  if (percentage >= 100) return BUDGET_COLORS.exceeded;
  if (percentage >= 90) return BUDGET_COLORS.danger;
  if (percentage >= 70) return BUDGET_COLORS.warning;
  return BUDGET_COLORS.ok;
}
