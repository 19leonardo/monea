import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Text, useTheme } from 'react-native-paper';

import { getApiErrorMessage } from '@/core/api/errors';
import { formatMoney, toCents } from '@/core/utils/currency';
import { formatMonthLabel } from '@/core/utils/date';
import { moneyColors } from '@/theme';

import type { Summary } from '../dashboard.types';

type Props = {
  summary: Summary | undefined;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
};

/** Tarjeta principal: saldo total y, debajo, ingresos / gastos / balance del mes. */
export function BalanceCard({ summary, isPending, error, onRetry }: Props) {
  const { colors } = useTheme();

  let body;
  if (isPending) {
    body = <ActivityIndicator color={colors.onPrimary} style={styles.loader} />;
  } else if (error || !summary) {
    body = (
      <View style={styles.errorBox}>
        <Text style={{ color: colors.onPrimary }}>
          No se pudo cargar el resumen: {getApiErrorMessage(error)}
        </Text>
        <Button
          mode="contained-tonal"
          compact
          onPress={onRetry}
          style={styles.retry}
        >
          Reintentar
        </Button>
      </View>
    );
  } else {
    const netNegative = toCents(summary.net) < 0;
    body = (
      <>
        <Text
          variant="displaySmall"
          style={[styles.total, { color: colors.onPrimary }]}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {formatMoney(summary.total_balance)}
        </Text>

        <View style={[styles.month, { backgroundColor: colors.surface }]}>
          <Text variant="labelMedium" style={[styles.monthLabel, { color: colors.onSurfaceVariant }]}>
            {formatMonthLabel(summary.period)}
          </Text>
          <View style={styles.figures}>
            <Figure label="Ingresos" value={`+ ${formatMoney(summary.income)}`} color={moneyColors.income} />
            <Figure label="Gastos" value={`- ${formatMoney(summary.expenses)}`} color={moneyColors.expense} />
            <Figure
              label="Balance del mes"
              value={formatMoney(summary.net)}
              color={netNegative ? moneyColors.expense : moneyColors.income}
            />
          </View>
        </View>
      </>
    );
  }

  return (
    <Card mode="contained" style={[styles.card, { backgroundColor: colors.primary }]}>
      <Card.Content style={styles.content}>
        <Text variant="titleSmall" style={{ color: colors.onPrimary }}>
          Saldo total
        </Text>
        {body}
      </Card.Content>
    </Card>
  );
}

function Figure({ label, value, color }: { label: string; value: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.figure}>
      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }} numberOfLines={1}>
        {label}
      </Text>
      <Text
        variant="titleSmall"
        style={[styles.figureValue, { color }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', borderRadius: 24 },
  content: { gap: 8, paddingVertical: 8 },
  loader: { marginVertical: 24 },
  total: { fontWeight: 'bold' },
  errorBox: { gap: 8, marginVertical: 8 },
  retry: { alignSelf: 'flex-start' },
  month: { borderRadius: 16, padding: 12, marginTop: 8, gap: 8 },
  monthLabel: { textTransform: 'capitalize' },
  figures: { flexDirection: 'row', gap: 8 },
  figure: { flex: 1, gap: 2 },
  figureValue: { fontWeight: 'bold' },
});
