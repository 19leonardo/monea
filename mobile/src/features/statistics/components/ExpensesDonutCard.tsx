import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { ActivityIndicator, Button, Card, Text, useTheme } from 'react-native-paper';

import { getApiErrorMessage } from '@/core/api/errors';
import { formatMoney, formatPercent } from '@/core/utils/currency';

import { categoryColor } from '../categoryColors';
import type { ByCategory } from '../statistics.types';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  data: ByCategory | undefined;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
};

const RADIUS = 110;
const INNER_RADIUS = 72;

/** Donut de gastos por categoría del mes (datos ya agregados por el backend) y su leyenda. */
export function ExpensesDonutCard({ data, isPending, error, onRetry }: Props) {
  const { colors } = useTheme();

  let body;
  if (isPending) {
    body = <ActivityIndicator style={styles.loader} />;
  } else if (error || !data) {
    body = (
      <View style={styles.center}>
        <Text style={{ color: colors.error, textAlign: 'center' }}>
          No se pudo cargar el gráfico: {getApiErrorMessage(error)}
        </Text>
        <Button compact onPress={onRetry}>
          Reintentar
        </Button>
      </View>
    );
  } else if (data.items.length === 0) {
    body = (
      <View style={styles.center}>
        <MaterialCommunityIcons name="chart-donut" size={48} color={colors.outline} />
        <Text style={{ color: colors.onSurfaceVariant }}>No hay datos este mes</Text>
      </View>
    );
  } else {
    // Number() solo para dibujar las porciones; los montos mostrados vienen del backend.
    const slices = data.items.map((item) => ({
      value: Number(item.total),
      color: categoryColor(item.category_id),
    }));

    body = (
      <>
        <View style={styles.chart}>
          <PieChart
            data={slices}
            donut
            radius={RADIUS}
            innerRadius={INNER_RADIUS}
            innerCircleColor={colors.elevation.level1}
            centerLabelComponent={() => (
              <View style={styles.centerLabel}>
                <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>
                  Total gastos
                </Text>
                <Text
                  variant="titleMedium"
                  style={styles.bold}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatMoney(data.total)}
                </Text>
              </View>
            )}
          />
        </View>

        <View style={styles.legend}>
          {data.items.map((item) => (
            <View
              key={item.category_id}
              style={styles.legendRow}
              accessibilityLabel={`${item.category_name}: ${formatMoney(item.total)}, ${formatPercent(item.percentage)}`}
            >
              <View
                style={[styles.swatch, { backgroundColor: categoryColor(item.category_id) }]}
              />
              <MaterialCommunityIcons
                name={(item.category_icon || 'tag') as IconName}
                size={18}
                color={colors.onSurfaceVariant}
              />
              <Text variant="bodyMedium" style={styles.legendName} numberOfLines={1}>
                {item.category_name}
              </Text>
              <Text variant="bodyMedium" style={styles.bold}>
                {formatMoney(item.total)}
              </Text>
              <Text
                variant="bodySmall"
                style={[styles.legendPercent, { color: colors.onSurfaceVariant }]}
              >
                {formatPercent(item.percentage)}
              </Text>
            </View>
          ))}
        </View>
      </>
    );
  }

  return (
    <Card mode="elevated" style={styles.card}>
      <Card.Title title="Gastos por categoría" titleVariant="titleMedium" />
      <Card.Content>{body}</Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%' },
  loader: { marginVertical: 48 },
  center: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  chart: { alignItems: 'center', marginVertical: 8 },
  centerLabel: { alignItems: 'center', width: INNER_RADIUS * 2 - 16 },
  bold: { fontWeight: 'bold' },
  legend: { marginTop: 16, gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 12, height: 12, borderRadius: 6 },
  legendName: { flex: 1 },
  legendPercent: { minWidth: 56, textAlign: 'right' },
});
