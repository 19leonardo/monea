import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { AccountsSummaryCard } from '@/features/accounts/components/AccountsSummaryCard';
import { RecentTransactionsCard } from '@/features/transactions/components/RecentTransactionsCard';
import { getMe } from '@/features/auth/auth.api';
import { useAuthStore } from '@/features/auth/auth.store';

export default function HomeScreen() {
  const sessionUser = useAuthStore((state) => state.user);

  // Parte de los datos cargados al iniciar sesión y los refresca desde /users/me.
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    initialData: sessionUser ?? undefined,
  });

  return (
    <Screen title="Inicio">
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineSmall">Hola, {user?.name || user?.email}</Text>
        <AccountsSummaryCard />
        <RecentTransactionsCard />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
});
