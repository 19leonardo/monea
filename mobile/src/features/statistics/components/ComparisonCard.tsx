import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Divider, Text, useTheme } from 'react-native-paper';

import { getApiErrorMessage } from '@/core/api/errors';
import { formatMoney, formatPercent, toCents } from '@/core/utils/currency';
import { currentMonth, formatMonthLabel } from '@/core/utils/date';
import { moneyColors } from '@/theme';

import type { Comparison } from '../statistics.types';

type Props = {
  data: Comparison | undefined;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
};

/** El mes elegido contra el anterior: gastos, ingresos (con flecha y %) y gasto diario. */
export function ComparisonCard({ data, isPending, error, onRetry }: Props) {
  const { colors } = useTheme();

  let body;
  if (isPending) {
    body = <ActivityIndicator style={styles.loader} />;
  } else if (error || !data) {
    body = (
      <View style={styles.center}>
        <Text style={{ color: colors.error, textAlign: 'center' }}>
          No se pudo cargar la comparación: {getApiErrorMessage(error)}
        </Text>
        <Button compact onPress={onRetry}>
          Reintentar
        </Button>
      </View>
    );
  } else {
    const isCurrent = data.period === currentMonth();
    const periodText = isCurrent ? 'este mes' : `en ${formatMonthLabel(data.period)}`;

    body = (
      <>
        <Row
          label={`Gastos ${periodText}`}
          amount={data.expenses}
          changePct={data.expenses_change_pct}
          // Que el gasto suba es malo (rojo); que baje, bueno (verde).
          upIsGood={false}
        />
        <Divider style={styles.divider} />
        <Row
          label={`Ingresos ${periodText}`}
          amount={data.income}
          changePct={data.income_change_pct}
          upIsGood
        />
        <Divider style={styles.divider} />

        <View style={styles.daily}>
          <MaterialCommunityIcons name="calendar-today" size={22} color={colors.primary} />
          {data.daily_avg_expense === null ? (
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
              Sin gasto diario: el mes aún no empieza
            </Text>
          ) : (
            <Text variant="bodyMedium">
              <Text style={styles.bold}>{formatMoney(data.daily_avg_expense)}</Text> por día{' '}
              {periodText}
            </Text>
          )}
        </View>
      </>
    );
  }

  return (
    <Card mode="elevated" style={styles.card}>
      <Card.Title
        title="Comparación"
        subtitle={data ? `Contra ${formatMonthLabel(data.previous_period)}` : undefined}
        subtitleStyle={styles.capitalize}
        titleVariant="titleMedium"
      />
      <Card.Content>{body}</Card.Content>
    </Card>
  );
}

type RowProps = {
  label: string;
  amount: string;
  /** "15.0" / "-20.0", o null si no hay mes anterior con el que comparar. */
  changePct: string | null;
  upIsGood: boolean;
};

function Row({ label, amount, changePct, upIsGood }: RowProps) {
  const { colors } = useTheme();

  let indicator;
  if (changePct === null) {
    // Sin dato del mes anterior: no se inventa un porcentaje.
    indicator = (
      <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>
        Sin comparación
      </Text>
    );
  } else {
    const cents = toCents(changePct);
    const direction = cents > 0 ? 'up' : cents < 0 ? 'down' : 'same';
    const color =
      direction === 'same'
        ? colors.onSurfaceVariant
        : (direction === 'up') === upIsGood
          ? moneyColors.income
          : moneyColors.expense;
    const icon =
      direction === 'up' ? 'arrow-up-bold' : direction === 'down' ? 'arrow-down-bold' : 'equal';
    // La flecha ya indica el sentido: el % se muestra sin signo.
    const percent = formatPercent(changePct).replace(/^-/, '');

    indicator = (
      <View
        style={styles.change}
        accessibilityLabel={
          direction === 'same'
            ? 'Sin cambios respecto al mes anterior'
            : `${direction === 'up' ? 'Subió' : 'Bajó'} ${percent} respecto al mes anterior`
        }
      >
        <MaterialCommunityIcons name={icon} size={18} color={color} />
        <Text variant="labelLarge" style={[styles.bold, { color }]}>
          {direction === 'same' ? 'Sin cambios' : percent}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
          {label}
        </Text>
        <Text variant="titleLarge" style={styles.bold}>
          {formatMoney(amount)}
        </Text>
      </View>
      {indicator}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%' },
  loader: { marginVertical: 32 },
  center: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  change: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  bold: { fontWeight: 'bold' },
  divider: { marginVertical: 12 },
  daily: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  capitalize: { textTransform: 'capitalize' },
});
