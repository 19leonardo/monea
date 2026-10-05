import { useQuery } from '@tanstack/react-query';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { useRefreshOnFocus } from '@/core/hooks/useRefreshOnFocus';
import { useAccounts } from '@/features/accounts/useAccounts';
import { getMe } from '@/features/auth/auth.api';
import { useAuthStore } from '@/features/auth/auth.store';
import { AccountsMiniList } from '@/features/dashboard/components/AccountsMiniList';
import { BalanceCard } from '@/features/dashboard/components/BalanceCard';
import { useRecentTransactions, useSummary } from '@/features/dashboard/useDashboard';
import { RecentTransactionsCard } from '@/features/transactions/components/RecentTransactionsCard';

export default function HomeScreen() {
  const { colors } = useTheme();
  const sessionUser = useAuthStore((state) => state.user);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    initialData: sessionUser ?? undefined,
  });
  // Los totales vienen calculados del backend (GET /statistics/summary).
  const summary = useSummary();
  const accounts = useAccounts();
  const recent = useRecentTransactions();

  const refetchAll = () => Promise.all([summary.refetch(), accounts.refetch(), recent.refetch()]);

  // Al volver a Inicio (p. ej. tras registrar un movimiento) se recargan los datos.
  useRefreshOnFocus(refetchAll);

  const refreshing =
    !summary.isPending &&
    (summary.isRefetching || accounts.isRefetching || recent.isRefetching);

  const firstName = (user?.name || user?.email || '').split(/\s+/)[0];

  return (
    <Screen title="Inicio">
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
        <Text variant="titleLarge">Hola, {firstName} 👋</Text>

        <BalanceCard
          summary={summary.data}
          isPending={summary.isPending}
          error={summary.error}
          onRetry={() => summary.refetch()}
        />

        <AccountsMiniList
          accounts={accounts.data}
          isPending={accounts.isPending}
          error={accounts.error}
          onRetry={() => accounts.refetch()}
        />

        <RecentTransactionsCard
          transactions={recent.data}
          isPending={recent.isPending}
          error={recent.error}
          onRetry={() => recent.refetch()}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // paddingBottom: espacio para el botón ➕ que sobresale de la barra.
  content: { gap: 16, paddingBottom: 32 },
});
