import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, HelperText, Modal, Portal, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateField } from '@/components/DateField';
import { type DateRange, dateRangePresets, todayISO } from '@/core/utils/date';

type Props = {
  visible: boolean;
  value: DateRange | null;
  onApply: (range: DateRange | null) => void;
  onDismiss: () => void;
};

/** Hoja para elegir un rango de fechas: atajos ("Este mes"…) o "Desde"/"Hasta" a mano. */
export function DateRangeSheet({ visible, value, onApply, onDismiss }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const presets = dateRangePresets();
  const [start, setStart] = useState(value?.start ?? presets[0].range.start);
  const [end, setEnd] = useState(value?.end ?? todayISO());

  // Al abrir, parte del rango actual.
  useEffect(() => {
    if (visible) {
      setStart(value?.start ?? presets[0].range.start);
      setEnd(value?.end ?? todayISO());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const invalid = start > end; // "YYYY-MM-DD" se compara bien como texto

  const apply = (range: DateRange | null) => {
    onApply(range);
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        style={styles.modal}
        contentContainerStyle={[
          styles.sheet,
          { backgroundColor: colors.surface, paddingBottom: 16 + insets.bottom },
        ]}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text variant="titleMedium" style={styles.title}>
            Rango de fechas
          </Text>

          <View style={styles.presets}>
            {presets.map((preset) => {
              const selected =
                value?.start === preset.range.start && value?.end === preset.range.end;
              return (
                <Chip
                  key={preset.label}
                  selected={selected}
                  showSelectedOverlay
                  onPress={() => apply(preset.range)}
                >
                  {preset.label}
                </Chip>
              );
            })}
          </View>

          <Divider style={styles.divider} />
          <Text variant="labelLarge" style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            Personalizado
          </Text>
          <View style={styles.custom}>
            <View style={styles.flex}>
              <DateField label="Desde" value={start} onChange={setStart} maximumDate={new Date()} />
            </View>
            <View style={styles.flex}>
              <DateField label="Hasta" value={end} onChange={setEnd} maximumDate={new Date()} />
            </View>
          </View>
          <HelperText type="error" visible={invalid}>
            "Desde" no puede ser posterior a "Hasta"
          </HelperText>

          <View style={styles.actions}>
            {value && <Button onPress={() => apply(null)}>Quitar fechas</Button>}
            <Button
              mode="contained"
              disabled={invalid}
              onPress={() => apply({ start, end })}
            >
              Aplicar
            </Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  modal: { justifyContent: 'flex-end', margin: 0 },
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingHorizontal: 24,
  },
  title: { fontWeight: 'bold', marginBottom: 12 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  divider: { marginVertical: 16 },
  subtitle: { marginBottom: 8 },
  custom: { flexDirection: 'row', gap: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
