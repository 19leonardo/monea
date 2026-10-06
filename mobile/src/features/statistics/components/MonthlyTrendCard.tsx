import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { ActivityIndicator, Button, Card, Text, useTheme } from 'react-native-paper';

import { getApiErrorMessage } from '@/core/api/errors';
import { toCents } from '@/core/utils/currency';
import { formatMonthShort } from '@/core/utils/date';
import { moneyColors } from '@/theme';

import type { MonthlySeries } from '../statistics.types';

type Props = {
  data: MonthlySeries | undefined;
  months: number;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
};

const CHART_HEIGHT = 180;
const SIDE_SPACING = 20;

/** Líneas de ingresos (verde) y gastos (rojo) de los últimos meses. */
export function MonthlyTrendCard({ data, months, isPending, error, onRetry }: Props) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);

  let body;
  if (isPending) {
    body = <ActivityIndicator style={styles.loader} />;
  } else if (error || !data) {
    body = (
      <View style={styles.center}>
        <Text style={{ color: colors.error, textAlign: 'center' }}>
          No se pudo cargar la evolución: {getApiErrorMessage(error)}
        </Text>
        <Button compact onPress={onRetry}>
          Reintentar
        </Button>
      </View>
    );
  } else if (
    data.series.every((point) => toCents(point.income) === 0 && toCents(point.expenses) === 0)
  ) {
    body = (
      <View style={styles.center}>
        <MaterialCommunityIcons name="chart-line" size={48} color={colors.outline} />
        <Text style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
          No hay movimientos en los últimos {months} meses
        </Text>
      </View>
    );
  } else {
    const labels = data.series.map((point) => formatMonthShort(point.month));
    // Number() solo para la posición de los puntos; el backend ya trae los totales por mes.
    const income = data.series.map((point) => ({ value: Number(point.income) }));
    const expenses = data.series.map((point) => ({ value: Number(point.expenses) }));
    // Reparte los N puntos en todo el ancho disponible.
    const spacing =
      data.series.length > 1
        ? Math.max((width - 2 * SIDE_SPACING - 16) / (data.series.length - 1), 24)
        : 0;

    body = (
      <>
        <View style={styles.legend}>
          <LegendItem color={moneyColors.income} label="Ingresos" />
          <LegendItem color={moneyColors.expense} label="Gastos" />
        </View>
        <View
          style={styles.chart}
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
          accessibilityLabel={`Evolución de ingresos y gastos de los últimos ${months} meses`}
        >
          {width > 0 && (
            <LineChart
              data={income}
              data2={expenses}
              xAxisLabelTexts={labels}
              width={width}
              height={CHART_HEIGHT}
              spacing={spacing}
              initialSpacing={SIDE_SPACING}
              endSpacing={SIDE_SPACING}
              color1={moneyColors.income}
              color2={moneyColors.expense}
              dataPointsColor1={moneyColors.income}
              dataPointsColor2={moneyColors.expense}
              thickness1={3}
              thickness2={3}
              curved
              noOfSections={4}
              hideYAxisText
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor={colors.outlineVariant}
              rulesColor={colors.surfaceVariant}
              xAxisLabelTextStyle={{ color: colors.onSurfaceVariant, fontSize: 11 }}
              disableScroll
              isAnimated
            />
          )}
        </View>
      </>
    );
  }

  return (
    <Card mode="elevated" style={styles.card}>
      <Card.Title
        title="Evolución"
        subtitle={`Últimos ${months} meses`}
        titleVariant="titleMedium"
      />
      <Card.Content>{body}</Card.Content>
    </Card>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendLine, { backgroundColor: color }]} />
      <Text variant="bodySmall">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%' },
  loader: { marginVertical: 48 },
  center: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  legend: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 16, height: 3, borderRadius: 2 },
  chart: { width: '100%', overflow: 'hidden' },
});
