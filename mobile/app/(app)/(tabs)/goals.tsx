import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
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

import { Screen } from '@/components/Screen';
import { getApiErrorMessage } from '@/core/api/errors';
import { useRefreshOnFocus } from '@/core/hooks/useRefreshOnFocus';
import { formatMoney } from '@/core/utils/currency';
import { ContributeDialog } from '@/features/goals/components/ContributeDialog';
import { GoalCard } from '@/features/goals/components/GoalCard';
import type { Goal, GoalStatus } from '@/features/goals/goals.types';
import { useDeleteGoal, useGoals, useUpdateGoal } from '@/features/goals/useGoals';

// Activas primero, luego completadas y al final las canceladas.
const STATUS_ORDER: Record<GoalStatus, number> = { activa: 0, completada: 1, cancelada: 2 };

export default function GoalsScreen() {
  const { colors } = useTheme();
  const { data, isPending, isError, error, refetch, isRefetching } = useGoals();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const [contributeTo, setContributeTo] = useState<Goal | null>(null);
  const [toDelete, setToDelete] = useState<Goal | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useRefreshOnFocus(refetch);

  const goals = useMemo(
    () => [...(data ?? [])].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]),
    [data],
  );

  const toggleCancel = async (goal: Goal) => {
    const status: GoalStatus = goal.status === 'cancelada' ? 'activa' : 'cancelada';
    try {
      await updateGoal.mutateAsync({ id: goal.id, data: { status } });
      setMessage(status === 'cancelada' ? `"${goal.name}" cancelada` : `"${goal.name}" reactivada`);
    } catch (err) {
      setMessage(getApiErrorMessage(err));
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteGoal.mutateAsync(toDelete.id);
      setMessage(`Meta "${toDelete.name}" eliminada`);
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
        <Text variant="titleMedium">No se pudieron cargar tus metas</Text>
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
        data={goals}
        keyExtractor={(goal) => String(goal.id)}
        renderItem={({ item }) => (
          <GoalCard
            goal={item}
            onContribute={setContributeTo}
            onToggleCancel={toggleCancel}
            onDelete={setToDelete}
          />
        )}
        contentContainerStyle={[styles.list, goals.length === 0 && styles.emptyList]}
        showsVerticalScrollIndicator={false}
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
            <MaterialCommunityIcons name="piggy-bank-outline" size={64} color={colors.primary} />
            <Text variant="titleMedium" style={styles.muted}>
              Crea tu primera meta
            </Text>
            <Text variant="bodyMedium" style={[styles.muted, { color: colors.onSurfaceVariant }]}>
              Un viaje, un fondo de emergencia, una laptop… Monea te dice cuánto ahorrar cada mes.
            </Text>
            <Button mode="contained" icon="plus" onPress={() => router.push('/goals/new')}>
              Nueva meta
            </Button>
          </View>
        }
      />
    );
  }

  return (
    <Screen title="Metas">
      {body}

      {!isPending && !isError && goals.length > 0 && (
        <FAB
          icon="plus"
          label="Nueva meta"
          onPress={() => router.push('/goals/new')}
          style={styles.fab}
        />
      )}

      <ContributeDialog
        goal={contributeTo}
        onDismiss={() => setContributeTo(null)}
        onSuccess={(updated, amount) => {
          setContributeTo(null);
          setMessage(
            updated.status === 'completada'
              ? `¡Meta "${updated.name}" completada! 🎉`
              : `Aportaste ${formatMoney(amount)} a "${updated.name}"`,
          );
        }}
      />

      <Portal>
        <Dialog visible={!!toDelete} onDismiss={() => setToDelete(null)}>
          <Dialog.Title>Eliminar meta</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              ¿Eliminar "{toDelete?.name}" y todo su historial de aportes? No se puede deshacer.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setToDelete(null)} disabled={deleteGoal.isPending}>
              Cancelar
            </Button>
            <Button
              onPress={confirmDelete}
              loading={deleteGoal.isPending}
              disabled={deleteGoal.isPending}
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
        duration={4000}
      >
        {message}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 96 },
  emptyList: { flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 8 },
  muted: { textAlign: 'center' },
  fab: { position: 'absolute', right: 0, bottom: 0 },
});
