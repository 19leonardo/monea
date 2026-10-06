import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';

import { MonthSelector } from '@/components/MonthSelector';
import { Screen } from '@/components/Screen';
import { useRefreshOnFocus } from '@/core/hooks/useRefreshOnFocus';
import { currentMonth } from '@/core/utils/date';
import { ComparisonCard } from '@/features/statistics/components/ComparisonCard';
import { ExpensesDonutCard } from '@/features/statistics/components/ExpensesDonutCard';
import { IncomeVsExpensesCard } from '@/features/statistics/components/IncomeVsExpensesCard';
import { MonthlyTrendCard } from '@/features/statistics/components/MonthlyTrendCard';
import {
  useByCategory,
  useComparison,
  useIncomeVsExpenses,
  useMonthly,
} from '@/features/statistics/useStatistics';

const TREND_MONTHS = 6;

export default function StatisticsScreen() {
  const { colors } = useTheme();
  const [month, setMonth] = useState(currentMonth());

  // El mes va en la queryKey: al cambiarlo, se vuelve a pedir al backend.
  const byCategory = useByCategory(month, 'gasto');
  const incomeVsExpenses = useIncomeVsExpenses(month);
  const comparison = useComparison(month);
  // La evolución siempre muestra los últimos 6 meses hasta hoy (no depende del selector).
  const monthly = useMonthly(TREND_MONTHS);

  const refetchAll = () =>
    Promise.all([
      byCategory.refetch(),
      incomeVsExpenses.refetch(),
      comparison.refetch(),
      monthly.refetch(),
    ]);
  // Al volver a la pestaña (p. ej. tras registrar un gasto con ➕), se recargan los gráficos.
  useRefreshOnFocus(refetchAll);

  const refreshing =
    !byCategory.isPending &&
    (byCategory.isRefetching ||
      incomeVsExpenses.isRefetching ||
      comparison.isRefetching ||
      monthly.isRefetching);

  return (
    <Screen title="Estadísticas">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refetchAll}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <MonthSelector value={month} onChange={setMonth} />

        <ExpensesDonutCard
          data={byCategory.data}
          isPending={byCategory.isPending}
          error={byCategory.error}
          onRetry={() => byCategory.refetch()}
        />

        <IncomeVsExpensesCard
          data={incomeVsExpenses.data}
          isPending={incomeVsExpenses.isPending}
          error={incomeVsExpenses.error}
          onRetry={() => incomeVsExpenses.refetch()}
        />

        <ComparisonCard
          data={comparison.data}
          isPending={comparison.isPending}
          error={comparison.error}
          onRetry={() => comparison.refetch()}
        />

        <MonthlyTrendCard
          data={monthly.data}
          months={TREND_MONTHS}
          isPending={monthly.isPending}
          error={monthly.error}
          onRetry={() => monthly.refetch()}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // paddingBottom: espacio para el botón ➕ que sobresale de la barra.
  content: { gap: 16, paddingBottom: 32 },
});
