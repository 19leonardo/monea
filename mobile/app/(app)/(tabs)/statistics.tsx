import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';

import { MonthSelector } from '@/components/MonthSelector';
import { Screen } from '@/components/Screen';
import { useRefreshOnFocus } from '@/core/hooks/useRefreshOnFocus';
import { currentMonth } from '@/core/utils/date';
import { ExpensesDonutCard } from '@/features/statistics/components/ExpensesDonutCard';
import { IncomeVsExpensesCard } from '@/features/statistics/components/IncomeVsExpensesCard';
import { useByCategory, useIncomeVsExpenses } from '@/features/statistics/useStatistics';

export default function StatisticsScreen() {
  const { colors } = useTheme();
  const [month, setMonth] = useState(currentMonth());

  // El mes va en la queryKey: al cambiarlo, se vuelve a pedir al backend.
  const byCategory = useByCategory(month, 'gasto');
  const incomeVsExpenses = useIncomeVsExpenses(month);

  const refetchAll = () => Promise.all([byCategory.refetch(), incomeVsExpenses.refetch()]);
  // Al volver a la pestaña (p. ej. tras registrar un gasto con ➕), se recargan los gráficos.
  useRefreshOnFocus(refetchAll);

  const refreshing =
    !byCategory.isPending && (byCategory.isRefetching || incomeVsExpenses.isRefetching);

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
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // paddingBottom: espacio para el botón ➕ que sobresale de la barra.
  content: { gap: 16, paddingBottom: 32 },
});
