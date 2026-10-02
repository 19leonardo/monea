import { StyleSheet, View } from 'react-native';
import { Button, Modal, Portal, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type TransactionKind = 'GASTO' | 'INGRESO';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (kind: TransactionKind) => void;
};

/** Hoja inferior "Registrar": elige si el movimiento es un gasto o un ingreso. */
export function AddTransactionSheet({ visible, onDismiss, onSelect }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        style={styles.modal}
        contentContainerStyle={[
          styles.sheet,
          { backgroundColor: colors.surface, paddingBottom: 24 + insets.bottom },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.outlineVariant }]} />
        <Text variant="titleLarge" style={styles.title}>
          Registrar
        </Text>

        <View style={styles.options}>
          <Button
            mode="contained"
            icon="arrow-down"
            onPress={() => onSelect('GASTO')}
            buttonColor={colors.errorContainer}
            textColor={colors.onErrorContainer}
            style={styles.option}
            contentStyle={styles.optionContent}
            labelStyle={styles.optionLabel}
          >
            Gasto
          </Button>
          <Button
            mode="contained"
            icon="arrow-up"
            onPress={() => onSelect('INGRESO')}
            buttonColor={colors.primaryContainer}
            textColor={colors.onPrimaryContainer}
            style={styles.option}
            contentStyle={styles.optionContent}
            labelStyle={styles.optionLabel}
          >
            Ingreso
          </Button>
        </View>

        <Button mode="text" onPress={onDismiss}>
          Cancelar
        </Button>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: { justifyContent: 'flex-end', margin: 0 },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 16,
  },
  handle: { alignSelf: 'center', width: 32, height: 4, borderRadius: 2 },
  title: { textAlign: 'center', fontWeight: 'bold' },
  options: { flexDirection: 'row', gap: 12 },
  option: { flex: 1, borderRadius: 16 },
  optionContent: { height: 72 },
  optionLabel: { fontSize: 18 },
});
