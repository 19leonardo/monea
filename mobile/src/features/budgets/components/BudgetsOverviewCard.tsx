import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, ProgressBar, Text, useTheme } from 'react-native-paper';

import { getApiErrorMessage } from '@/core/api/errors';
import { formatMoney } from '@/core/utils/currency';

import { budgetColor } from '../budgetColors';
import type { Budget } from '../budgets.types';

const MAX_ITEMS = 3;

type Props = {
  budgets: Budget[] | undefined;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
};

/** Sección de Inicio: los presupuestos más usados del mes y acceso a la pantalla completa. */
export function BudgetsOverviewCard({ budgets, isPending, error, onRetry }: Props) {
  const { colors } = useTheme();

  let body;
  if (isPending) {
    body = <ActivityIndicator style={styles.loader} />;
  } else if (error || !budgets) {
    body = (
      // View (no Fragment): Card de Paper clona a sus hijos con la prop `index`.
      <View style={styles.errorBox}>
        <Text style={[styles.padded, { color: colors.error }]}>{getApiErrorMessage(error)}</Text>
        <Button compact onPress={onRetry} style={styles.retry}>
          Reintentar
        </Button>
      </View>
    );
  } else if (budgets.length === 0) {
    body = (
      <Text style={[styles.padded, { color: colors.onSurfaceVariant }]}>
        Ponle un tope a tus gastos: crea tu primer presupuesto.
      </Text>
    );
  } else {
    // Los más cercanos al tope primero.
    const top = [...budgets].sort((a, b) => b.percentage - a.percentage).slice(0, MAX_ITEMS);
    const exceeded = budgets.filter((budget) => budget.percentage >= 100).length;
    body = (
      <View style={styles.list}>
        {exceeded > 0 && (
          <Text variant="labelLarge" style={{ color: colors.error }}>
            {exceeded === 1 ? '1 presupuesto superado' : `${exceeded} presupuestos superados`}
          </Text>
        )}
        {top.map((budget) => {
          const color = budgetColor(budget.percentage);
          return (
            <View key={budget.id} style={styles.item}>
              <View style={styles.row}>
                <Text variant="bodyMedium" style={styles.name} numberOfLines={1}>
                  {budget.category_name}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                  {formatMoney(budget.spent)} de {formatMoney(budget.amount)}
                </Text>
                <Text variant="labelLarge" style={[styles.percentage, { color }]}>
                  {budget.percentage} %
                </Text>
              </View>
              <ProgressBar
                progress={Math.min(budget.percentage, 100) / 100}
                color={color}
                style={[styles.bar, { backgroundColor: colors.surfaceVariant }]}
              />
            </View>
          );
        })}
      </View>
    );
  }

  const empty = !isPending && !error && budgets?.length === 0;

  return (
    <Card mode="elevated" style={styles.card}>
      <Card.Title title="Presupuestos del mes" titleVariant="titleMedium" />
      {body}
      <Card.Actions>
        <Button
          mode={empty ? 'contained' : 'contained-tonal'}
          icon={empty ? 'plus' : 'chart-donut'}
          onPress={() => router.push(empty ? '/budgets/new' : '/budgets')}
        >
          {empty ? 'Crear presupuesto' : 'Ver presupuestos'}
        </Button>
      </Card.Actions>
    </Card>
  );
}

const styles = StyleSheet.create({
  errorBox: { gap: 4 },
  card: { width: '100%' },
  loader: { marginVertical: 16 },
  padded: { paddingHorizontal: 16 },
  retry: { alignSelf: 'flex-start', marginLeft: 8 },
  list: { paddingHorizontal: 16, gap: 12 },
  item: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontWeight: '600' },
  percentage: { minWidth: 44, textAlign: 'right', fontWeight: 'bold' },
  bar: { height: 6, borderRadius: 3 },
});
