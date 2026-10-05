import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Button, HelperText, Modal, Portal, TextInput, useTheme } from 'react-native-paper';

import { formatDateLabel, fromISODate, toISODate } from '@/core/utils/date';

type Props = {
  label: string;
  /** "YYYY-MM-DD" */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  maximumDate?: Date;
};

/** Campo de fecha: muestra "Hoy", "Ayer" o "5 oct 2026" y abre el calendario nativo. */
export function DateField({ label, value, onChange, error, disabled, maximumDate }: Props) {
  const { colors } = useTheme();
  const [iosOpen, setIosOpen] = useState(false);
  const [iosDraft, setIosDraft] = useState(() => fromISODate(value));

  const open = () => {
    if (Platform.OS === 'android') {
      // En Android el calendario es un diálogo del sistema que se abre de forma imperativa.
      DateTimePickerAndroid.open({
        value: fromISODate(value),
        mode: 'date',
        maximumDate,
        onValueChange: (_event, date) => onChange(toISODate(date)),
      });
    } else {
      setIosDraft(fromISODate(value));
      setIosOpen(true);
    }
  };

  return (
    <View>
      <Pressable
        onPress={open}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatDateLabel(value)}`}
      >
        <View pointerEvents="none">
          <TextInput
            mode="outlined"
            label={label}
            value={formatDateLabel(value)}
            editable={false}
            disabled={disabled}
            error={!!error}
            left={<TextInput.Icon icon="calendar" />}
          />
        </View>
      </Pressable>
      <HelperText type="error" visible={!!error} style={styles.helper}>
        {error}
      </HelperText>

      {Platform.OS === 'ios' && (
        <Portal>
          <Modal
            visible={iosOpen}
            onDismiss={() => setIosOpen(false)}
            contentContainerStyle={[styles.iosSheet, { backgroundColor: colors.surface }]}
          >
            <DateTimePicker
              value={iosDraft}
              mode="date"
              display="inline"
              maximumDate={maximumDate}
              locale="es-BO"
              accentColor={colors.primary}
              onValueChange={(_event, date) => setIosDraft(date)}
            />
            <View style={styles.iosActions}>
              <Button onPress={() => setIosOpen(false)}>Cancelar</Button>
              <Button
                mode="contained"
                onPress={() => {
                  onChange(toISODate(iosDraft));
                  setIosOpen(false);
                }}
              >
                Aceptar
              </Button>
            </View>
          </Modal>
        </Portal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  helper: { minHeight: 24 },
  iosSheet: { margin: 16, borderRadius: 28, padding: 16 },
  iosActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
