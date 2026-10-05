import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { ActivityIndicator, Button, Card, Divider, Text, useTheme } from 'react-native-paper';

import { getApiErrorMessage } from '@/core/api/errors';
import { formatMoney, toCents } from '@/core/utils/currency';
import { moneyColors } from '@/theme';

import type { IncomeVsExpenses } from '../statistics.types';

type Props = {
  data: IncomeVsExpenses | undefined;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
};

const BAR_WIDTH = 64;

/** Ingresos (verde) vs. gastos (rojo) del mes, con el balance. */
export function IncomeVsExpensesCard({ data, isPending, error, onRetry }: Props) {
  const { colors } = useTheme();
  const [chartWidth, setChartWidth] = useState(0);

  let body;
  if (isPending) {
    body = <ActivityIndicator style={styles.loader} />;
  } else if (error || !data) {
    body = (
      <View style={styles.center}>
        <Text style={{ color: colors.error, textAlign: 'center' }}>
          No se pudo cargar: {getApiErrorMessage(error)}
        </Text>
        <Button compact onPress={onRetry}>
          Reintentar
        </Button>
      </View>
    );
  } else if (toCents(data.income) === 0 && toCents(data.expenses) === 0) {
    body = (
      <View style={styles.center}>
        <MaterialCommunityIcons name="chart-bar" size={48} color={colors.outline} />
        <Text style={{ color: colors.onSurfaceVariant }}>No hay datos este mes</Text>
      </View>
    );
  } else {
    const netNegative = toCents(data.net) < 0;
    // Number() solo para la altura de las barras; las cifras mostradas vienen del backend.
    const bars = [
      { value: Number(data.income), label: 'Ingresos', frontColor: moneyColors.income },
      { value: Number(data.expenses), label: 'Gastos', frontColor: moneyColors.expense },
    ];
    // Dos barras centradas en el ancho disponible.
    const spacing = Math.max((chartWidth - 2 * BAR_WIDTH) / 3, 16);

    body = (
      <>
        <View
          style={styles.chart}
          onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}
        >
          {chartWidth > 0 && (
            <BarChart
              data={bars}
              width={chartWidth}
              height={160}
              barWidth={BAR_WIDTH}
              spacing={spacing}
              initialSpacing={spacing}
              barBorderTopLeftRadius={8}
              barBorderTopRightRadius={8}
              noOfSections={4}
              hideYAxisText
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor={colors.outlineVariant}
              rulesColor={colors.surfaceVariant}
              xAxisLabelTextStyle={{ color: colors.onSurfaceVariant }}
              disableScroll
              isAnimated
            />
          )}
        </View>

        <View style={styles.figures}>
          <Figure label="Ingresos" value={`+ ${formatMoney(data.income)}`} color={moneyColors.income} />
          <Figure label="Gastos" value={`- ${formatMoney(data.expenses)}`} color={moneyColors.expense} />
        </View>
        <Divider style={styles.divider} />
        <View style={styles.netRow}>
          <Text variant="titleSmall">Balance del mes</Text>
          <Text
            variant="titleLarge"
            style={[styles.bold, { color: netNegative ? moneyColors.expense : moneyColors.income }]}
          >
            {formatMoney(data.net)}
          </Text>
        </View>
      </>
    );
  }

  return (
    <Card mode="elevated" style={styles.card}>
      <Card.Title title="Ingresos vs. Gastos" titleVariant="titleMedium" />
      <Card.Content>{body}</Card.Content>
    </Card>
  );
}

function Figure({ label, value, color }: { label: string; value: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.figure}>
      <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text variant="titleMedium" style={[styles.bold, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%' },
  loader: { marginVertical: 32 },
  center: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  chart: { width: '100%', marginBottom: 8, overflow: 'hidden' },
  figures: { flexDirection: 'row', gap: 12 },
  figure: { flex: 1, gap: 2 },
  bold: { fontWeight: 'bold' },
  divider: { marginVertical: 12 },
  netRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
