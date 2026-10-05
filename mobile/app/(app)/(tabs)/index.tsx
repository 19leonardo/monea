import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { AccountsSummaryCard } from '@/features/accounts/components/AccountsSummaryCard';
import { getMe } from '@/features/auth/auth.api';
import { useAuthStore } from '@/features/auth/auth.store';

export default function HomeScreen() {
  const { colors } = useTheme();
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
        <Text variant="bodyMedium" style={[styles.soon, { color: colors.onSurfaceVariant }]}>
          Aquí irá tu resumen financiero
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  soon: { textAlign: 'center', marginTop: 8 },
});
