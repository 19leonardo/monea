import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Dialog,
  FAB,
  Portal,
  Snackbar,
  Text,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MonthSelector } from '@/components/MonthSelector';
import { getApiErrorMessage } from '@/core/api/errors';
import { useRefreshOnFocus } from '@/core/hooks/useRefreshOnFocus';
import { currentMonth } from '@/core/utils/date';
import type { Budget } from '@/features/budgets/budgets.types';
import { BudgetCard } from '@/features/budgets/components/BudgetCard';
import { useBudgets, useDeleteBudget } from '@/features/budgets/useBudgets';

export default function BudgetsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(currentMonth());
  const [toDelete, setToDelete] = useState<Budget | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Cambiar de mes cambia la queryKey (['budgets', month]) y vuelve a pedir.
  const { data: budgets, isPending, isError, error, refetch, isRefetching } = useBudgets(month);
  const deleteBudget = useDeleteBudget();

  // Al volver (p. ej. tras registrar un gasto con ➕), recarga lo gastado.
  useRefreshOnFocus(refetch);

  const goToNew = () => router.push({ pathname: '/budgets/new', params: { month } });

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteBudget.mutateAsync(toDelete.id);
      setMessage(`Presupuesto de ${toDelete.category_name} eliminado`);
    } catch (err) {
      setMessage(getApiErrorMessage(err));
    } finally {
      setToDelete(null);
    }
  };

  let body;
  if (isPending) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  } else if (isError) {
    body = (
      <View style={styles.center}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.error} />
        <Text variant="titleMedium">No se pudieron cargar los presupuestos</Text>
        <Text style={[styles.muted, { color: colors.onSurfaceVariant }]}>
          {getApiErrorMessage(error)}
        </Text>
        <Button mode="contained" onPress={() => refetch()}>
          Reintentar
        </Button>
      </View>
    );
  } else {
    body = (
      <FlatList
        data={budgets}
        keyExtractor={(budget) => String(budget.id)}
        renderItem={({ item }) => <BudgetCard budget={item} onDelete={setToDelete} />}
        contentContainerStyle={[
          styles.list,
          budgets.length === 0 && styles.emptyList,
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
            <MaterialCommunityIcons name="chart-donut" size={64} color={colors.primary} />
            <Text variant="titleMedium" style={styles.muted}>
              Crea tu primer presupuesto
            </Text>
            <Text variant="bodyMedium" style={[styles.muted, { color: colors.onSurfaceVariant }]}>
              Ponle un tope a una categoría de gasto y Monea te avisará cuando te acerques.
            </Text>
            <Button mode="contained" icon="plus" onPress={goToNew}>
              Crear presupuesto
            </Button>
          </View>
        }
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MonthSelector value={month} onChange={setMonth} />
      {body}

      {!isPending && !isError && (
        <FAB
          icon="plus"
          label="Nuevo presupuesto"
          onPress={goToNew}
          style={[styles.fab, { bottom: 16 + insets.bottom }]}
        />
      )}

      <Portal>
        <Dialog visible={!!toDelete} onDismiss={() => setToDelete(null)}>
          <Dialog.Title>Eliminar presupuesto</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              ¿Eliminar el presupuesto de {toDelete?.category_name}? Tus movimientos no se borran.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setToDelete(null)} disabled={deleteBudget.isPending}>
              Cancelar
            </Button>
            <Button
              onPress={confirmDelete}
              loading={deleteBudget.isPending}
              disabled={deleteBudget.isPending}
              textColor={colors.error}
            >
              Eliminar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={!!message}
        onDismiss={() => setMessage(null)}
        duration={3000}
        wrapperStyle={{ bottom: insets.bottom }}
      >
        {message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  emptyList: { flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  muted: { textAlign: 'center' },
  fab: { position: 'absolute', right: 16 },
});
