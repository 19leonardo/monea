import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

import { formatMonthLabel, shiftMonth } from '@/core/utils/date';

type Props = {
  /** "YYYY-MM" */
  value: string;
  onChange: (month: string) => void;
  disabled?: boolean;
};

/** "‹ octubre 2026 ›": cambia de mes con las flechas. */
export function MonthSelector({ value, onChange, disabled }: Props) {
  return (
    <View style={styles.row}>
      <IconButton
        icon="chevron-left"
        onPress={() => onChange(shiftMonth(value, -1))}
        disabled={disabled}
        accessibilityLabel="Mes anterior"
      />
      <Text variant="titleMedium" style={styles.label} accessibilityLiveRegion="polite">
        {formatMonthLabel(value)}
      </Text>
      <IconButton
        icon="chevron-right"
        onPress={() => onChange(shiftMonth(value, 1))}
        disabled={disabled}
        accessibilityLabel="Mes siguiente"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  label: { minWidth: 150, textAlign: 'center', textTransform: 'capitalize' },
});
