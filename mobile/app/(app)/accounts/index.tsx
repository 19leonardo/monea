import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, FAB, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getApiErrorMessage } from '@/core/api/errors';
import { AccountCard } from '@/features/accounts/components/AccountCard';
import { useAccounts } from '@/features/accounts/useAccounts';

export default function AccountsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: accounts, isPending, isError, error, refetch, isRefetching } = useAccounts();

  const goToNew = () => router.push('/accounts/new');

  let content;
  if (isPending) {
    content = (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  } else if (isError) {
    content = (
      <View style={styles.center}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.error} />
        <Text variant="titleMedium">No se pudieron cargar tus cuentas</Text>
        <Text variant="bodyMedium" style={[styles.muted, { color: colors.onSurfaceVariant }]}>
          {getApiErrorMessage(error)}
        </Text>
        <Button mode="contained" onPress={() => refetch()}>
          Reintentar
        </Button>
      </View>
    );
  } else {
    content = (
      <FlatList
        data={accounts}
        keyExtractor={(account) => String(account.id)}
        renderItem={({ item }) => <AccountCard account={item} />}
        contentContainerStyle={[
          styles.list,
          accounts.length === 0 && styles.emptyList,
          // Espacio para que el FAB no tape la última tarjeta.
          { paddingBottom: 96 + insets.bottom },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <MaterialCommunityIcons name="wallet-outline" size={64} color={colors.primary} />
            <Text variant="titleMedium" style={styles.muted}>
              Aún no tienes cuentas, crea la primera
            </Text>
            <Button mode="contained" icon="plus" onPress={goToNew}>
              Crear cuenta
            </Button>
          </View>
        }
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {content}
      {!isPending && !isError && (
        <FAB
          icon="plus"
          label="Nueva cuenta"
          onPress={goToNew}
          style={[styles.fab, { bottom: 16 + insets.bottom }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16 },
  emptyList: { flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  muted: { textAlign: 'center' },
  fab: { position: 'absolute', right: 16 },
});
